-- Aggregated, non-personal statistics computed from real rows (public).

create or replace function public.portal_stats()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'approved', count(*) filter (where status = 'approved'),
    'critical', count(*) filter (where status = 'approved' and urgency = 'critical'),
    'filtered', count(*) filter (where status in ('recycled', 'merged') or (status = 'rejected' and verdict = 'recycled')),
    'pending', count(*) filter (where status = 'pending'),
    'active_wilayas', count(distinct wilaya_code) filter (where status = 'approved'),
    'intake_total', (select count(*) from public.intake_items)
  ) from public.alerts;
$$;

-- Impact over a period, nationally or for one wilaya. Hours/participations come only from confirmed rows.
create or replace function public.impact_stats(p_wilaya int default null, p_from timestamptz default null, p_to timestamptz default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  with bounds as (
    select coalesce(p_from, '-infinity'::timestamptz) as f, coalesce(p_to, 'infinity'::timestamptz) as t
  ),
  a as (
    select al.* from public.alerts al, bounds b
    where (p_wilaya is null or al.wilaya_code = p_wilaya) and al.created_at >= b.f and al.created_at < b.t
  ),
  conf as (
    select av.hours from public.alert_volunteers av join public.alerts al on al.id = av.alert_id, bounds b
    where av.status = 'confirmed' and (p_wilaya is null or al.wilaya_code = p_wilaya)
      and av.confirmed_at >= b.f and av.confirmed_at < b.t
  ),
  att as (
    select at.hours from public.attendance at join public.club_activities ca on ca.id = at.activity_id, bounds b
    where (p_wilaya is null or ca.wilaya_code = p_wilaya) and at.checked_in_at >= b.f and at.checked_in_at < b.t
  ),
  tr as (
    select 1 from public.trees t, bounds b
    where t.status = 'approved' and (p_wilaya is null or t.wilaya_code = p_wilaya) and t.reviewed_at >= b.f and t.reviewed_at < b.t
  )
  select jsonb_build_object(
    'alerts_approved', (select count(*) from a where status in ('approved', 'resolved')),
    'alerts_resolved', (select count(*) from a where status = 'resolved'),
    'alerts_filtered', (select count(*) from a where status in ('recycled', 'merged')),
    'confirmed_participations', (select count(*) from conf),
    'attendance_checkins', (select count(*) from att),
    'volunteer_hours', coalesce((select sum(hours) from conf), 0) + coalesce((select sum(hours) from att), 0),
    'trees_verified', (select count(*) from tr),
    'clubs', (select count(*) from public.clubs c where c.status = 'approved' and (p_wilaya is null or c.wilaya_code = p_wilaya)),
    'reports_approved', (select count(*) from public.reports r left join public.alerts al on al.id = r.alert_id, bounds b
                         where r.status = 'approved' and (p_wilaya is null or al.wilaya_code = p_wilaya) and r.created_at >= b.f and r.created_at < b.t),
    'by_category', (select coalesce(jsonb_object_agg(category, n), '{}') from (select category, count(*) n from a where status in ('approved', 'resolved') group by category) x),
    'by_wilaya', (select coalesce(jsonb_agg(jsonb_build_object('wilaya_code', wilaya_code, 'alerts', n, 'resolved', r) order by n desc), '[]')
                  from (select wilaya_code, count(*) n, count(*) filter (where status = 'resolved') r from a
                        where status in ('approved', 'resolved') and wilaya_code is not null group by wilaya_code) y),
    'generated_at', now()
  );
$$;

grant execute on function public.portal_stats() to anon, authenticated;
grant execute on function public.impact_stats(int, timestamptz, timestamptz) to anon, authenticated;
