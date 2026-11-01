-- RLS & authorisation tests. Run: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(44);

-- ---------- fixtures (as postgres, bypassing RLS) ----------
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'vol@test.dz',   '{"display_name":"Volunteer A"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'vol2@test.dz',  '{"display_name":"Volunteer B"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a1', 'mod16@test.dz', '{"display_name":"Mod Alger"}',   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d1', 'djsl16@test.dz','{"display_name":"DJSL Alger"}',  'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000f1', 'min@test.dz',   '{"display_name":"Ministry"}',    'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c1', 'lead@test.dz',  '{"display_name":"Club Lead"}',   'authenticated', 'authenticated');

insert into public.user_roles (user_id, role, wilaya_code) values
  ('00000000-0000-0000-0000-0000000000a1', 'moderator', 16),
  ('00000000-0000-0000-0000-0000000000d1', 'djsl_admin', 16),
  ('00000000-0000-0000-0000-0000000000f1', 'ministry_admin', null);
update public.profile_private set phone = '0555000001', blood_type = 'O-'
  where user_id = '00000000-0000-0000-0000-00000000000a';

insert into public.alerts (id, title, original_text, category, urgency, status, wilaya_code, owner_id) values
  ('10000000-0000-0000-0000-000000000001', 'Pending Alger', 'pending text body', 'blood', 'critical', 'pending', 16, null),
  ('10000000-0000-0000-0000-000000000002', 'Approved Alger', 'approved text body', 'relief', 'medium', 'approved', 16, null),
  ('10000000-0000-0000-0000-000000000003', 'Pending Oran', 'pending oran text', 'relief', 'normal', 'pending', 31, null);
insert into public.alert_contacts (alert_id, phone) values
  ('10000000-0000-0000-0000-000000000002', '0661000002');

-- helper to impersonate
create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;
create or replace function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;
create or replace function pg_temp.as_admin() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

-- ---------- bootstrap ----------
select is((select count(*)::int from public.profiles), 6, 'signup trigger creates profiles');
select is((select count(*)::int from public.user_roles where role = 'volunteer'), 6, 'everyone starts as volunteer');

-- ---------- anon ----------
select pg_temp.as_anon();
select is((select count(*)::int from public.wilayas), 58, 'anon reads 58 seeded wilayas');
select is((select count(*)::int from public.alerts), 1, 'anon sees only approved alerts');
select is((select count(*)::int from public.alert_contacts), 0, 'anon cannot read alert phones');
select is((select count(*)::int from public.profiles), 0, 'anon cannot read profiles');
select is((select count(*)::int from public.profile_private), 0, 'anon cannot read private data');
select throws_ok($$ insert into public.intake_items (channel, raw_text, content_hash) values ('web_form', 'some text here', 'h') $$,
  '42501', null, 'anon cannot insert intake directly');

-- ---------- volunteer ----------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.profile_private), 1, 'volunteer reads only own private row');
select is((select count(*)::int from public.profiles), 1, 'volunteer reads only own profile');
select is((select count(*)::int from public.alerts), 1, 'volunteer sees approved alerts only');
select is((select count(*)::int from public.alert_contacts), 0, 'phone hidden before joining');
select throws_ok($$ select public.review_alert('10000000-0000-0000-0000-000000000001', 'approve') $$,
  '42501', null, 'volunteer cannot moderate');
select throws_ok($$ update public.alerts set status = 'approved' where id = '10000000-0000-0000-0000-000000000002' $$,
  '42501', null, 'status column not directly writable');
select throws_ok($$ insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000b', 'ministry_admin') $$,
  '42501', null, 'volunteer cannot self-grant roles');
select throws_ok($$ select public.grant_role('00000000-0000-0000-0000-00000000000b', 'moderator', 16) $$,
  '42501', null, 'volunteer cannot call grant_role');
select is((select count(*)::int from public.audit_log), 0, 'volunteer cannot read audit log');

select is((public.join_alert('10000000-0000-0000-0000-000000000002'))->>'contact_phone', '0661000002',
  'joining reveals contact phone');
select is((select count(*)::int from public.alert_contacts), 1, 'joined volunteer can read phone');
select throws_ok($$ select public.join_alert('10000000-0000-0000-0000-000000000001') $$,
  '22023', null, 'cannot join a pending alert');
select throws_ok($$ update public.profile_private set phone_verified = true $$,
  '42501', null, 'cannot self-verify phone');

-- ---------- moderator scope ----------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from public.alerts), 2, 'Alger moderator sees Alger alerts only');
select is(public.review_alert('10000000-0000-0000-0000-000000000001', 'approve')::text, 'approved', 'moderator approves in own wilaya');
select throws_ok($$ select public.review_alert('10000000-0000-0000-0000-000000000003', 'approve') $$,
  '42501', null, 'moderator cannot approve in another wilaya');
select throws_ok($$ select public.review_alert('10000000-0000-0000-0000-000000000002', 'reopen') $$,
  '22023', null, 'invalid transition approved -> pending rejected');
select is((select count(*)::int from public.profile_private), 1, 'moderator cannot read others'' private data');
select throws_ok($$ select public.grant_role('00000000-0000-0000-0000-00000000000b', 'moderator', 16) $$,
  '42501', null, 'moderator cannot grant roles');

-- ---------- DJSL / ministry ----------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select lives_ok($$ select public.grant_role('00000000-0000-0000-0000-00000000000b', 'moderator', 16) $$, 'DJSL grants moderator in own wilaya');
select throws_ok($$ select public.grant_role('00000000-0000-0000-0000-00000000000b', 'moderator', 31) $$,
  '42501', null, 'DJSL cannot grant outside wilaya');
select throws_ok($$ select public.grant_role('00000000-0000-0000-0000-00000000000b', 'djsl_admin', 16) $$,
  '42501', null, 'DJSL cannot create DJSL admins');
select ok((select count(*) from public.audit_log where wilaya_code = 16) > 0, 'DJSL reads own wilaya audit');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select is((select count(*)::int from public.alerts), 3, 'ministry sees all alerts');
select is(public.review_alert('10000000-0000-0000-0000-000000000003', 'reject')::text, 'rejected', 'ministry moderates anywhere');

-- ---------- QR attendance & points ----------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
create temp table ids (k text primary key, v text) on commit drop;
grant all on ids to authenticated, anon;
insert into ids values ('club', public.create_club('Test Club', 16::smallint));
insert into public.club_activities (id, club_id, title, wilaya_code, starts_at, created_by)
  values ('20000000-0000-0000-0000-000000000001', (select v::uuid from ids where k = 'club'), 'Activity', 16, now(),
          '00000000-0000-0000-0000-0000000000c1');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into ids values ('tok', public.issue_qr_token()->>'token');
select throws_ok($$ select public.check_in((select v from ids where k = 'tok'), '20000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'volunteer cannot check themself in');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select is(public.check_in((select v from ids where k = 'tok'), '20000000-0000-0000-0000-000000000001', 3)->>'status',
  'checked_in', 'club lead checks volunteer in with a valid token');
select throws_ok($$ select public.check_in((select v from ids where k = 'tok'), '20000000-0000-0000-0000-000000000001') $$,
  '23505', null, 'token replay rejected');
select throws_ok($$ select public.check_in((select v from ids where k = 'tok') || 'x', '20000000-0000-0000-0000-000000000001') $$,
  '22023', null, 'tampered token rejected');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select is((public.my_points()->>'points')::int, 20, 'points come from the confirmed check-in only');
insert into ids values ('cert', public.issue_certificate()::text);
select is((public.verify_certificate((select v::uuid from ids where k = 'cert'))->>'valid')::boolean, true, 'certificate verifies');

select pg_temp.as_admin();
update public.certificates set hours = 300 where id = (select v::uuid from ids where k = 'cert');
select pg_temp.as_anon();
select is((public.verify_certificate((select v::uuid from ids where k = 'cert'))->>'valid')::boolean, false, 'tampered certificate fails verification');

-- ---------- trees ----------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ insert into public.trees (user_id, wilaya_code, place, species, status)
                    values ('00000000-0000-0000-0000-00000000000a', 16, 'park', 'olive', 'approved') $$,
  '42501', null, 'cannot self-approve a tree');
insert into public.trees (id, user_id, wilaya_code, place, species)
  values ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 16, 'park', 'olive');
select pg_temp.as_anon();
select is((select count(*)::int from public.trees), 0, 'pending tree not public');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$ select public.review_tree('30000000-0000-0000-0000-000000000001', true) $$, 'moderator approves tree');
select pg_temp.as_anon();
select is((select count(*)::int from public.trees), 1, 'approved tree is public');

select * from finish();
rollback;
