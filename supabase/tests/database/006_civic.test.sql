-- صوّر وبلّغ: privacy, workflow, permissions, duplicates.
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000007a1', 'cit1@t.dz', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000007a2', 'cit2@t.dz', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000007b1', 'mod16c@t.dz', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000007b2', 'mod31c@t.dz', 'authenticated', 'authenticated');
insert into public.user_roles (user_id, role, wilaya_code) values
  ('00000000-0000-0000-0000-0000000007b1', 'moderator', 16), ('00000000-0000-0000-0000-0000000007b2', 'moderator', 31);

create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin perform set_config('role', 'authenticated', true); perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;

-- citizen 1 reports a pothole in Algiers (Bab Ezzouar)
select pg_temp.as_user('00000000-0000-0000-0000-0000000007a1');
select set_config('t.id', id::text, true), set_config('t.ref', ref, true) from public.civic_create('road', 'حفرة كبيرة وسط الطريق', null, 'high', 36.7215, 3.1830, 8, 'gps', null,
  array['00000000-0000-0000-0000-0000000007a1/p1.jpg'], array[1234567890123::bigint], '{}', 'manual', '{}');
select matches(current_setting('t.ref'), '^SWB-[0-9]{4}-[0-9A-F]{5}$', 'unique reference generated');
select is((select status::text from public.civic_reports where id = current_setting('t.id')::uuid), 'pending_review', 'new report waits for review');
select is((select wilaya_code from public.civic_reports where id = current_setting('t.id')::uuid), 16::smallint, 'wilaya detected from GPS (nearest seat)');
select throws_ok($$ select public.civic_create('road', 'x x x', null, 'low', 36.7, 3.1, null, 'map', null,
  array['00000000-0000-0000-0000-0000000007a2/stolen.jpg'], '{}', '{}', 'manual', '{}') $$, '42501', null, 'cannot attach another user''s photo');

-- privacy before verification
select pg_temp.as_user('00000000-0000-0000-0000-0000000007a2');
select is((select count(*)::int from public.civic_reports where id = current_setting('t.id')::uuid), 0, 'another citizen cannot read the raw report');
select is((select count(*)::int from public.civic_public_reports where id = current_setting('t.id')::uuid), 0, 'not public before moderator verification');
select is((select count(*)::int from public.civic_nearby(36.7216, 3.1831, 'road', '{}', 150) where id = current_setting('t.id')::uuid), 1, 'nearby duplicate found (same spot, same category)');
select is((select description from public.civic_nearby(36.7216, 3.1831, 'road', '{}', 150) where id = current_setting('t.id')::uuid), null, 'pending report description is hidden from other citizens');
select is((select image_match from public.civic_nearby(35.69, -0.63, 'waste', array[1234567890123::bigint], 150) where id = current_setting('t.id')::uuid), true,
  'same photo found even 400 km away (recycled-image signal)');
select throws_ok($$ select public.civic_set_status(current_setting('t.id')::uuid, 'verified') $$, '42501', null, 'a citizen cannot change status');

-- moderators
select pg_temp.as_user('00000000-0000-0000-0000-0000000007b2');
select throws_ok($$ select public.civic_set_status(current_setting('t.id')::uuid, 'verified') $$, '42501', null, 'Oran moderator cannot moderate an Algiers report');
select pg_temp.as_user('00000000-0000-0000-0000-0000000007b1');
select throws_ok($$ select public.civic_set_status(current_setting('t.id')::uuid, 'resolved') $$, '22023', null, 'invalid transition pending → resolved refused');
select lives_ok($$ select public.civic_set_status(current_setting('t.id')::uuid, 'verified', 'تأكدت من الصورة والموقع') $$, 'Algiers moderator verifies');
select throws_ok($$ select public.civic_set_status(current_setting('t.id')::uuid, 'forwarded') $$, '22023', null, 'cannot mark forwarded without naming the authority');
select lives_ok($$ select public.civic_internal_note(current_setting('t.id')::uuid, 'ملاحظة داخلية') $$, 'internal note recorded');

-- public after verification; photo still hidden until allowed
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;
select is((select cardinality(photo_paths) from public.civic_public_reports where id = current_setting('t.id')::uuid), 0, 'verified report is public, photo hidden until a moderator allows it');
select is(public.civic_photo_readable('00000000-0000-0000-0000-0000000007a1/p1.jpg'), false, 'anonymous visitor cannot read the unpublished photo');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000007b1');
select public.civic_set_photo_public(current_setting('t.id')::uuid, true);
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;
select is(public.civic_photo_readable('00000000-0000-0000-0000-0000000007a1/p1.jpg'), true, 'after the moderator publishes it, the photo is readable publicly');
select is((select count(*)::int from public.civic_public_events where report_id = current_setting('t.id')::uuid and body = 'ملاحظة داخلية'), 0, 'internal notes never public');
reset role;

-- community support: once per person, not by the reporter
select pg_temp.as_user('00000000-0000-0000-0000-0000000007a2');
select public.civic_support(current_setting('t.id')::uuid, 'support');
select is(public.civic_support(current_setting('t.id')::uuid, 'support'), 1, 'supporting twice still counts once');
select pg_temp.as_user('00000000-0000-0000-0000-0000000007a1');
select throws_ok($$ select public.civic_support(current_setting('t.id')::uuid, 'support') $$, '22023', null, 'reporter cannot support own report');
select is((select count(*)::int from public.notifications where kind = 'civic_update' and title like '%' || current_setting('t.ref')), 1, 'reporter notified of verification');

select * from finish();
rollback;
