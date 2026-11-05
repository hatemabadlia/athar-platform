-- Public, aggregate-only view of skills supply vs demand (no identities): how many volunteers offer each
-- skill (regulated skills count only when verified) and how many open requests need it.
create or replace function public.skill_supply_demand(p_wilaya int default null)
returns table (skill text, regulated boolean, remote boolean, volunteers bigint, open_requests bigint)
language sql stable security definer set search_path = '' as $$
  select s.key, s.regulated, s.remote,
    (select count(*) from public.profiles p
      where p.deleted_at is null and s.key = any(p.skills)
        and (p_wilaya is null or p.wilaya_code = p_wilaya or p.remote_ok)
        and (not s.regulated or exists (select 1 from public.skill_verifications v where v.user_id = p.id and v.skill = s.key))),
    (select count(*) from public.alerts a
      where a.status = 'approved' and s.key = any(a.required_skills) and (p_wilaya is null or a.wilaya_code = p_wilaya or a.remote_ok))
  from public.skills s
  order by s.sort_order;
$$;
revoke all on function public.skill_supply_demand(int) from public;
grant execute on function public.skill_supply_demand(int) to anon, authenticated;
