-- Skills-based volunteering: who is notified, regulated professions, verification permissions.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000005a1', 'mod31@t.dz',    'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000005a2', 'mod16@t.dz',    'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000005b1', 'design31@t.dz', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000005b2', 'design16r@t.dz','authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000005b3', 'design16@t.dz', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000005c1', 'doc31@t.dz',    'authenticated', 'authenticated');
insert into public.user_roles (user_id, role, wilaya_code) values
  ('00000000-0000-0000-0000-0000000005a1', 'moderator', 31), ('00000000-0000-0000-0000-0000000005a2', 'moderator', 16);
-- isolate from any existing data (demo seed): only this test's fixtures have skills. Rolled back at the end.
update public.profiles set skills = '{}' where id::text not like '00000000-0000-0000-0000-00000000050%' and id::text not like '00000000-0000-0000-0000-0000000005%';
update public.profiles set wilaya_code = 31, skills = '{تصميم وإعلام}'                 where id = '00000000-0000-0000-0000-0000000005b1';
update public.profiles set wilaya_code = 16, skills = '{تصميم وإعلام}', remote_ok = true where id = '00000000-0000-0000-0000-0000000005b2';
update public.profiles set wilaya_code = 16, skills = '{تصميم وإعلام}'                 where id = '00000000-0000-0000-0000-0000000005b3';
update public.profiles set wilaya_code = 31, skills = '{استشارة طبية}'                 where id = '00000000-0000-0000-0000-0000000005c1';

insert into public.alerts (id, title, original_text, category, status, wilaya_code, required_skills, remote_ok) values
  ('00000000-0000-0000-0000-0000000005d1', 'design for association', 'x', 'skills', 'approved', 31, '{تصميم وإعلام}', true),
  ('00000000-0000-0000-0000-0000000005d2', 'medical consultation',   'x', 'skills', 'approved', 31, '{استشارة طبية}', false);

create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin perform set_config('role', 'authenticated', true); perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000005a1');
select is(public.count_skilled_volunteers('00000000-0000-0000-0000-0000000005d1'), 2,
  'remote design request: designer in the wilaya + remote designer elsewhere, not the on-site-only designer elsewhere');
select is(public.notify_skilled_volunteers('00000000-0000-0000-0000-0000000005d1'), 2, 'notifies exactly those two');
select throws_ok($$ select public.notify_skilled_volunteers('00000000-0000-0000-0000-0000000005d1') $$, '22023', null, 'throttled: no second blast within 6 hours');
select is(public.count_skilled_volunteers('00000000-0000-0000-0000-0000000005d2'), 0, 'unverified doctor is not matched');

select pg_temp.as_user('00000000-0000-0000-0000-0000000005a2');
select throws_ok($$ select public.verify_skill('00000000-0000-0000-0000-0000000005c1', 'استشارة طبية', true) $$, '42501', null,
  'a moderator of another wilaya cannot verify an Oran doctor');
select throws_ok($$ select public.count_skilled_volunteers('00000000-0000-0000-0000-0000000005d1') $$, '42501', null,
  'and cannot query Oran requests');

select pg_temp.as_user('00000000-0000-0000-0000-0000000005a1');
select lives_ok($$ select public.verify_skill('00000000-0000-0000-0000-0000000005c1', 'استشارة طبية', true, 'ordre des médecins n° test') $$, 'Oran moderator verifies the doctor');
select is(public.count_skilled_volunteers('00000000-0000-0000-0000-0000000005d2'), 1, 'verified doctor is now matched');

select pg_temp.as_user('00000000-0000-0000-0000-0000000005b1');
select is((select count(*)::int from public.skill_verifications), 0, 'a volunteer cannot read other people''s verifications');

select * from finish();
rollback;
