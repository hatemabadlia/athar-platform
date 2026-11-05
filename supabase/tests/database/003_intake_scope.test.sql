begin;
create extension if not exists pgtap with schema extensions;
select plan(5);
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'm16@t.dz', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a2', 'm31@t.dz', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000f1', 'min@t.dz', 'authenticated', 'authenticated');
insert into public.user_roles (user_id, role, wilaya_code) values
  ('00000000-0000-0000-0000-0000000000a1', 'moderator', 16), ('00000000-0000-0000-0000-0000000000a2', 'moderator', 31),
  ('00000000-0000-0000-0000-0000000000f1', 'ministry_admin', null);
insert into public.intake_items (channel, raw_text, content_hash, wilaya_code) values
  ('web_form', 'message located in Alger 0555', 'h1', 16), ('web_form', 'message located in Oran 0661', 'h2', 31), ('web_form', 'message with no location', 'h3', null);
insert into public.ai_runs (stage, mode, input_hash, success) values ('analyze', 'heuristic', 'x', true);
create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin perform set_config('role', 'authenticated', true); perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from public.intake_items where received_at >= now()), 2, 'Alger moderator: own wilaya + unlocated');
select is((select count(*)::int from public.intake_items where wilaya_code = 31 and received_at >= now()), 0, 'cannot read another wilaya intake');
select is((select count(*)::int from public.ai_runs where created_at >= now()), 0, 'wilaya moderator cannot read ai_runs');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select is((select count(*)::int from public.intake_items where received_at >= now()), 3, 'ministry reads all intake');
select is((select count(*)::int from public.ai_runs where created_at >= now()), 1, 'ministry reads ai_runs');
select * from finish();
rollback;
