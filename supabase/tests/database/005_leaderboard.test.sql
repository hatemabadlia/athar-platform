-- Leaderboards: only confirmed actions count; opt-out hides the name publicly but not from the person.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000006a1', 'lb1@t.dz', '{"display_name":"LB Confirmed"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000006a2', 'lb2@t.dz', '{"display_name":"LB Only Joined"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000006a3', 'lb3@t.dz', '{"display_name":"LB Hidden"}', 'authenticated', 'authenticated');
update public.profiles set wilaya_code = 69 where id::text like '00000000-0000-0000-0000-0000000006a%';
update public.profiles set hide_from_leaderboard = true where id = '00000000-0000-0000-0000-0000000006a3';
insert into public.alerts (id, title, original_text, category, urgency, status, wilaya_code) values
  ('00000000-0000-0000-0000-0000000006b1', 'lb alert', 'x', 'relief', 'critical', 'approved', 69);
insert into public.alert_volunteers (alert_id, user_id, status, confirmed_at, hours) values
  ('00000000-0000-0000-0000-0000000006b1', '00000000-0000-0000-0000-0000000006a1', 'confirmed', now(), 3),
  ('00000000-0000-0000-0000-0000000006b1', '00000000-0000-0000-0000-0000000006a2', 'joined', null, null),
  ('00000000-0000-0000-0000-0000000006b1', '00000000-0000-0000-0000-0000000006a3', 'confirmed', now(), 2);

set local role anon;
select is((select points from public.volunteer_leaderboard(69, null, 10) where display_name = 'LB Confirmed'), 100::bigint, 'confirmed critical participation = 100 points');
select is((select count(*)::int from public.volunteer_leaderboard(69, null, 10) where display_name = 'LB Only Joined'), 0, 'joining without confirmation earns nothing');
select is((select count(*)::int from public.volunteer_leaderboard(69, null, 10) where display_name = 'LB Hidden'), 0, 'opted-out volunteer is not listed publicly');
select throws_ok($$ select * from public.my_leaderboard_rank(69, null) $$, '42501', null, 'anonymous users have no "my rank"');
reset role;

create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin perform set_config('role', 'authenticated', true); perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;
select pg_temp.as_user('00000000-0000-0000-0000-0000000006a3');
select is((select points from public.my_leaderboard_rank(69, null)), 100::bigint, 'hidden volunteer still sees their own points');
select is((select bool_or(is_me) from public.volunteer_leaderboard(69, null, 10)), false, 'and is not marked anywhere in the public list');
select * from finish();
rollback;
