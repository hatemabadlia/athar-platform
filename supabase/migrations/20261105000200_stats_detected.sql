-- "filtered" on the homepage = posts ATHAR flagged as recycled or duplicate: alerts with that verdict or status,
-- plus extra sources that were auto-linked to an existing request instead of creating a new one.
create or replace function public.portal_stats()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'approved', count(*) filter (where status = 'approved'),
    'critical', count(*) filter (where status = 'approved' and urgency = 'critical'),
    'filtered', count(*) filter (where verdict in ('recycled', 'duplicate') or status in ('recycled', 'merged'))
                + greatest(0, (select count(*) from public.alert_sources) - count(*)),
    'pending', count(*) filter (where status = 'pending'),
    'active_wilayas', count(distinct wilaya_code) filter (where status = 'approved'),
    'intake_total', (select count(*) from public.intake_items)
  ) from public.alerts;
$$;
