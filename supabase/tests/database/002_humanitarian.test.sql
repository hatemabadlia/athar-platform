begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000b1', 'assoc1@t.dz', '{"display_name":"Assoc One"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b2', 'assoc2@t.dz', '{"display_name":"Assoc Two"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d1', 'djsl@t.dz',   '{"display_name":"DJSL"}',      'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e1', 'donor@t.dz',  '{"display_name":"Donor"}',     'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e2', 'donor2@t.dz', '{"display_name":"Donor2"}',    'authenticated', 'authenticated');
insert into public.user_roles (user_id, role, wilaya_code) values ('00000000-0000-0000-0000-0000000000d1', 'djsl_admin', 31);
update public.profile_private set blood_type = 'O-', phone = '0661000001' where user_id = '00000000-0000-0000-0000-0000000000e1';
update public.profile_private set blood_type = 'A+', phone = '0661000002' where user_id = '00000000-0000-0000-0000-0000000000e2';

create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin perform set_config('role', 'authenticated', true); perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;
create or replace function pg_temp.as_anon() returns void language plpgsql as $$
begin perform set_config('role', 'anon', true); perform set_config('request.jwt.claims', '{"role":"anon"}', true); end $$;
create temp table ids (k text primary key, v text) on commit drop;
grant all on ids to authenticated, anon;

-- ---------- associations ----------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
insert into public.associations (id, name, approval_number, wilaya_code, applicant_id)
  values ('40000000-0000-0000-0000-000000000001', 'جمعية الأمل', 'AGR-31-001', 31, '00000000-0000-0000-0000-0000000000b1');
select throws_ok($$ insert into public.associations (name, approval_number, wilaya_code, applicant_id, status)
  values ('x assoc', 'AGR-31-999', 31, '00000000-0000-0000-0000-0000000000b1', 'approved') $$, '42501', null, 'cannot self-verify an association');
select throws_ok($$ select public.review_association('40000000-0000-0000-0000-000000000001', true) $$, '42501', null, 'applicant cannot approve');
select pg_temp.as_anon();
select is((select count(*)::int from public.associations), 0, 'pending association not public');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select lives_ok($$ select public.review_association('40000000-0000-0000-0000-000000000001', true) $$, 'DJSL of wilaya verifies');
select pg_temp.as_anon();
select is((select count(*)::int from public.associations), 1, 'verified association public');
reset role;
select ok((select exists (select 1 from public.user_roles where user_id = '00000000-0000-0000-0000-0000000000b1' and role = 'association')), 'association role granted on verification');

-- ---------- campaigns & beneficiary dedupe ----------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
select throws_ok($$ insert into public.campaigns (kind, season, title, goal_units, starts_on, ends_on, created_by)
  values ('ramadan', '2027-ramadan', 'قفة', 100, '2027-02-01', '2027-03-15', '00000000-0000-0000-0000-0000000000e1') $$, '42501', null, 'plain volunteer cannot create campaigns');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
insert into public.campaigns (id, kind, season, title, wilaya_code, association_id, goal_units, starts_on, ends_on, created_by)
  values ('50000000-0000-0000-0000-000000000001', 'ramadan', '2027-ramadan', 'قفة رمضان — الأمل', 31, '40000000-0000-0000-0000-000000000001', 100, '2027-02-01', '2027-03-15', '00000000-0000-0000-0000-0000000000b1');
select is(public.register_beneficiary('50000000-0000-0000-0000-000000000001', repeat('a', 64))->>'status', 'registered', 'first registration accepted');
select is(public.register_beneficiary('50000000-0000-0000-0000-000000000001', repeat('a', 64))->>'status', 'already_in_this_campaign', 'same campaign duplicate detected');

-- a second organisation's campaign in the same season (created by DJSL staff)
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
insert into public.campaigns (id, kind, season, title, wilaya_code, goal_units, starts_on, ends_on, created_by)
  values ('50000000-0000-0000-0000-000000000002', 'ramadan', '2027-ramadan', 'قفة رمضان — المديرية', 31, 50, '2027-02-01', '2027-03-15', '00000000-0000-0000-0000-0000000000d1');
select is(public.register_beneficiary('50000000-0000-0000-0000-000000000002', repeat('a', 64))->>'status', 'already_served_this_season', 'cross-organisation duplicate detected');
select is((public.register_beneficiary('50000000-0000-0000-0000-000000000002', repeat('a', 64)))::text like '%40000000%', false, 'response does not reveal the other organisation');
select is((select count(*)::int from public.beneficiary_registrations), 0, 'hashes not readable directly');
select is((public.campaign_progress('50000000-0000-0000-0000-000000000001')->>'beneficiaries')::int, 1, 'progress counts only');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select throws_ok($$ select public.register_beneficiary('50000000-0000-0000-0000-000000000001', repeat('b', 64)) $$, '42501', null, 'other users cannot register in a campaign');

-- ---------- in-kind matching ----------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
insert into public.donation_items (id, kind, category, title, wilaya_code, owner_id) values
  ('60000000-0000-0000-0000-000000000001', 'offer', 'clothes', 'ملابس شتوية', 31, '00000000-0000-0000-0000-0000000000e1');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e2');
insert into public.donation_items (id, kind, category, title, wilaya_code, owner_id) values
  ('60000000-0000-0000-0000-000000000002', 'need', 'clothes', 'أغطية لعائلة', 31, '00000000-0000-0000-0000-0000000000e2');
insert into ids values ('m', public.propose_match('60000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002', 1)::text);
select throws_ok($$ select public.update_match((select v::uuid from ids where k = 'm'), 'accepted') $$, '22023', null, 'proposer cannot accept own proposal');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
select is(public.update_match((select v::uuid from ids where k = 'm'), 'accepted')->>'counterpart_phone', '0661000002', 'contact revealed only after acceptance');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select is((select count(*)::int from public.donation_matches), 0, 'third parties cannot see matches');

-- ---------- blood donors ----------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
insert into public.blood_donors (user_id, wilaya_code) values ('00000000-0000-0000-0000-0000000000e1', 31);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e2');
insert into public.blood_donors (user_id, wilaya_code) values ('00000000-0000-0000-0000-0000000000e2', 31);
select is((select count(*)::int from public.blood_donors), 1, 'donors see only themselves');
reset role;
insert into public.alerts (id, title, original_text, category, urgency, status, wilaya_code, blood_type)
  values ('10000000-0000-0000-0000-0000000000f1', 'دم A+', 'need A+ blood in Oran', 'blood', 'critical', 'approved', 31, 'A+');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select is(public.notify_compatible_donors('10000000-0000-0000-0000-0000000000f1'), 2, 'O- and A+ donors notified for an A+ request');
select throws_ok($$ select public.notify_compatible_donors('10000000-0000-0000-0000-0000000000f1') $$, '22023', null, 'no repeated notification within 6 hours');

select * from finish();
rollback;
