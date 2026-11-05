-- Public leaderboards for volunteers and clubs. Points come ONLY from point_events (confirmed participation,
-- QR check-ins, moderator-approved trees), so nothing self-declared can be ranked.
-- Volunteers can opt out of the public ranking; their own rank stays visible to them.

alter table public.profiles add column hide_from_leaderboard boolean not null default false;
grant update (hide_from_leaderboard) on public.profiles to authenticated;

create or replace function public.volunteer_leaderboard(p_wilaya int default null, p_since timestamptz default null, p_limit int default 50)
returns table (rank bigint, display_name text, wilaya_code smallint, points bigint, hours numeric, actions bigint, is_me boolean)
language sql stable security definer set search_path = '' as $$
  with totals as (
    select p.id, p.display_name, p.wilaya_code,
           sum(e.points)::bigint as points, coalesce(sum(e.hours), 0)::numeric as hours, count(*)::bigint as actions
    from public.point_events e join public.profiles p on p.id = e.user_id
    where p.deleted_at is null and p.display_name <> '' and not p.hide_from_leaderboard
      and (p_wilaya is null or p.wilaya_code = p_wilaya)
      and (p_since is null or e.at >= p_since)
    group by p.id
  )
  select rank() over (order by t.points desc, t.hours desc), t.display_name, t.wilaya_code, t.points, t.hours, t.actions,
         t.id = auth.uid()
  from totals t
  order by 1, t.display_name
  limit least(greatest(p_limit, 1), 100);
$$;

-- The caller's own position (also when they opted out of the public list).
create or replace function public.my_leaderboard_rank(p_wilaya int default null, p_since timestamptz default null)
returns table (rank bigint, points bigint, hours numeric, ranked bigint)
language sql stable security definer set search_path = '' as $$
  with totals as (
    select p.id, sum(e.points)::bigint as points, coalesce(sum(e.hours), 0)::numeric as hours
    from public.point_events e join public.profiles p on p.id = e.user_id
    where p.deleted_at is null and (p_wilaya is null or p.wilaya_code = p_wilaya) and (p_since is null or e.at >= p_since)
      and (not p.hide_from_leaderboard or p.id = auth.uid())
    group by p.id
  ), ranked as (select t.*, rank() over (order by t.points desc, t.hours desc) as r, count(*) over () as n from totals t)
  select r, points, hours, n from ranked where id = auth.uid();
$$;

-- Clubs: 20 points per verified QR check-in at the club's activities + 50 per approved tree planted for the club.
create or replace function public.club_leaderboard(p_wilaya int default null, p_since timestamptz default null, p_limit int default 50)
returns table (rank bigint, club_id uuid, name text, wilaya_code smallint, institution_name text,
               members bigint, points bigint, hours numeric, checkins bigint, trees bigint)
language sql stable security definer set search_path = '' as $$
  with att as (
    select ca.club_id, count(*)::bigint as checkins, coalesce(sum(a.hours), 0)::numeric as hours
    from public.attendance a join public.club_activities ca on ca.id = a.activity_id
    where ca.club_id is not null and (p_since is null or a.checked_in_at >= p_since)
    group by ca.club_id
  ), tr as (
    select t.club_id, count(*)::bigint as trees from public.trees t
    where t.club_id is not null and t.status = 'approved' and (p_since is null or t.reviewed_at >= p_since)
    group by t.club_id
  ), totals as (
    select c.id, c.name, c.wilaya_code, c.institution_name,
           (select count(*) from public.club_members m where m.club_id = c.id)::bigint as members,
           (coalesce(att.checkins, 0) * 20 + coalesce(tr.trees, 0) * 50)::bigint as points,
           coalesce(att.hours, 0) as hours, coalesce(att.checkins, 0) as checkins, coalesce(tr.trees, 0) as trees
    from public.clubs c left join att on att.club_id = c.id left join tr on tr.club_id = c.id
    where c.status = 'approved' and (p_wilaya is null or c.wilaya_code = p_wilaya)
  )
  select rank() over (order by t.points desc, t.hours desc), t.id, t.name, t.wilaya_code, t.institution_name,
         t.members, t.points, t.hours, t.checkins, t.trees
  from totals t where t.points > 0
  order by 1, t.name
  limit least(greatest(p_limit, 1), 100);
$$;

revoke all on function public.volunteer_leaderboard(int, timestamptz, int) from public;
revoke all on function public.my_leaderboard_rank(int, timestamptz) from public, anon;
revoke all on function public.club_leaderboard(int, timestamptz, int) from public;
grant execute on function public.volunteer_leaderboard(int, timestamptz, int) to anon, authenticated;
grant execute on function public.my_leaderboard_rank(int, timestamptz) to authenticated;
grant execute on function public.club_leaderboard(int, timestamptz, int) to anon, authenticated;
