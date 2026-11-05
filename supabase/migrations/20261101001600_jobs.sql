-- Scheduled maintenance: account purge (deletion grace period), beneficiary-hash retention, alert expiry.

create or replace function private.expire_alerts()
returns int language plpgsql volatile security definer set search_path = '' as $$
declare n int;
begin
  update public.alerts set status = 'expired'
   where status = 'approved' and deadline is not null and deadline < now() - interval '1 day';
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function private.daily_maintenance()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare r jsonb; pruned int;
begin
  delete from public.rate_limits where window_start < now() - interval '1 day';
  get diagnostics pruned = row_count;
  r := jsonb_build_object(
    'purged_accounts', private.purge_due_accounts(),
    'purged_beneficiary_hashes', private.purge_old_beneficiary_hashes(),
    'expired_alerts', private.expire_alerts(),
    'pruned_rate_limits', pruned);
  insert into public.audit_log (action, entity, details) values ('daily_maintenance', 'system', r);
  return r;
end $$;

-- pg_cron when available (Supabase cloud and the local image ship it). Runs 03:17 UTC daily.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('athar-daily-maintenance', '17 3 * * *', 'select private.daily_maintenance()');
  end if;
end $$;
