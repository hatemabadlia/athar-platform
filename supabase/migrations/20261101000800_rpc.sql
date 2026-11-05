-- Server-checked operations. Every function re-checks authorisation itself.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.app_secrets (
  key   text primary key,
  value text not null
);
insert into private.app_secrets (key, value) values
  ('qr_hmac', encode(extensions.gen_random_bytes(32), 'hex')),
  ('certificate_hmac', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict do nothing;

create table private.used_qr_nonces (
  nonce    text primary key,
  used_at  timestamptz not null default now()
);

create or replace function private.secret(k text)
returns text language sql stable security definer set search_path = '' as $$
  select value from private.app_secrets where key = k;
$$;

create or replace function private.audit(action text, entity text, entity_id text, wilaya smallint, details jsonb default '{}')
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, action, entity, entity_id, wilaya_code, details)
  values (auth.uid(), action, entity, entity_id, wilaya, coalesce(details, '{}'));
$$;

create or replace function private.require_user()
returns uuid language plpgsql stable set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'authentication required' using errcode = '28000'; end if;
  return uid;
end $$;

-- ===================== QR attendance =====================
-- Token: <user_id>.<exp_epoch>.<nonce>.<hmac_hex>, valid 5 minutes, usable once.
create or replace function public.issue_qr_token()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  exp bigint := extract(epoch from now() + interval '5 minutes')::bigint;
  nonce text := encode(extensions.gen_random_bytes(12), 'hex');
  payload text := uid::text || '.' || exp || '.' || nonce;
  sig text := encode(extensions.hmac(payload, private.secret('qr_hmac'), 'sha256'), 'hex');
begin
  return jsonb_build_object('token', payload || '.' || sig, 'expires_at', to_timestamp(exp));
end $$;

create or replace function public.check_in(token text, activity uuid, hours numeric default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  scanner uuid := private.require_user();
  parts text[] := string_to_array(token, '.');
  payload text; expected text; volunteer uuid; exp bigint; act record; vname text;
begin
  if array_length(parts, 1) <> 4 then raise exception 'invalid token' using errcode = '22023'; end if;
  payload := parts[1] || '.' || parts[2] || '.' || parts[3];
  expected := encode(extensions.hmac(payload, private.secret('qr_hmac'), 'sha256'), 'hex');
  if expected <> parts[4] then raise exception 'invalid token signature' using errcode = '22023'; end if;
  exp := parts[2]::bigint;
  if to_timestamp(exp) < now() then raise exception 'token expired' using errcode = '22023'; end if;
  volunteer := parts[1]::uuid;

  select * into act from public.club_activities where id = activity;
  if not found then raise exception 'activity not found' using errcode = 'P0002'; end if;
  if act.status = 'cancelled' then raise exception 'activity cancelled' using errcode = '22023'; end if;
  if not ((act.club_id is not null and public.is_club_lead(act.club_id)) or public.can_moderate(act.wilaya_code)) then
    raise exception 'not allowed to check in for this activity' using errcode = '42501';
  end if;
  if volunteer = scanner then raise exception 'cannot check yourself in' using errcode = '42501'; end if;

  begin
    insert into private.used_qr_nonces (nonce) values (parts[3]);
  exception when unique_violation then
    raise exception 'token already used' using errcode = '23505';
  end;

  insert into public.attendance (activity_id, user_id, checked_in_by, token_nonce, hours)
  values (activity, volunteer, scanner, parts[3], hours)
  on conflict (activity_id, user_id) do nothing;
  if not found then
    return jsonb_build_object('status', 'already_checked_in', 'user_id', volunteer);
  end if;

  -- if the activity belongs to an alert, the participation becomes confirmed
  if act.alert_id is not null then
    update public.alert_volunteers set status = 'confirmed', confirmed_at = now(), confirmed_by = scanner,
           hours = coalesce(check_in.hours, alert_volunteers.hours)
     where alert_id = act.alert_id and user_id = volunteer and status <> 'confirmed';
  end if;

  select display_name into vname from public.profiles where id = volunteer;
  perform private.audit('check_in', 'attendance', activity::text, act.wilaya_code, jsonb_build_object('user_id', volunteer));
  return jsonb_build_object('status', 'checked_in', 'user_id', volunteer, 'display_name', vname);
end $$;

-- ===================== alerts =====================
create or replace function public.join_alert(alert uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); a record; phone text;
begin
  select * into a from public.alerts where id = alert;
  if not found or a.status <> 'approved' then raise exception 'alert not open' using errcode = '22023'; end if;
  if a.owner_id = uid then raise exception 'you own this alert' using errcode = '22023'; end if;
  insert into public.alert_volunteers (alert_id, user_id) values (alert, uid)
  on conflict (alert_id, user_id) do update set status = 'joined', joined_at = now()
    where public.alert_volunteers.status = 'cancelled';
  select c.phone into phone from public.alert_contacts c where c.alert_id = alert;
  return jsonb_build_object('status', 'joined', 'contact_phone', phone, 'contact_name', a.contact_name);
end $$;

create or replace function public.leave_alert(alert uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user();
begin
  update public.alert_volunteers set status = 'cancelled'
   where alert_id = alert and user_id = uid and status = 'joined';
end $$;

-- Phone for authorised viewers; staff reads are audited.
create or replace function public.get_alert_contact(alert uuid)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare phone text; w smallint;
begin
  perform private.require_user();
  if not public.can_see_alert_contact(alert) then return null; end if;
  select c.phone, a.wilaya_code into phone, w from public.alert_contacts c join public.alerts a on a.id = c.alert_id where c.alert_id = alert;
  if public.is_staff() then perform private.audit('read_contact', 'alert', alert::text, w); end if;
  return phone;
end $$;

-- Owner or moderator confirms that a volunteer actually took part (or did not show up).
create or replace function public.confirm_alert_volunteer(alert uuid, volunteer uuid, confirmed boolean, hours numeric default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); a record;
begin
  select * into a from public.alerts where id = alert;
  if not found then raise exception 'alert not found' using errcode = 'P0002'; end if;
  if not (a.owner_id = uid or public.can_moderate(a.wilaya_code)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if volunteer = uid then raise exception 'cannot confirm yourself' using errcode = '42501'; end if;
  update public.alert_volunteers
     set status = case when confirmed then 'confirmed'::public.volunteer_status else 'no_show'::public.volunteer_status end,
         confirmed_at = now(), confirmed_by = uid, hours = confirm_alert_volunteer.hours
   where alert_id = alert and user_id = volunteer and status in ('joined', 'confirmed', 'no_show');
  if not found then raise exception 'volunteer did not join this alert' using errcode = 'P0002'; end if;
  perform private.audit(case when confirmed then 'confirm_volunteer' else 'no_show' end, 'alert', alert::text, a.wilaya_code,
                        jsonb_build_object('user_id', volunteer, 'hours', hours));
end $$;

-- Moderation: approve / reject / resolve / merge / reopen with allowed transitions only.
create or replace function public.review_alert(alert uuid, action text, note text default null, merge_target uuid default null)
returns public.alert_status language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); a record; t record; nxt public.alert_status;
begin
  select * into a from public.alerts where id = alert for update;
  if not found then raise exception 'alert not found' using errcode = 'P0002'; end if;
  if not (public.can_moderate(a.wilaya_code) or (a.wilaya_code is null and public.is_ministry())) then
    raise exception 'not allowed to moderate this alert' using errcode = '42501';
  end if;

  nxt := case action
    when 'approve' then 'approved' when 'reject' then 'rejected' when 'resolve' then 'resolved'
    when 'merge' then 'merged' when 'reopen' then 'pending' when 'mark_recycled' then 'recycled'
    else null end;
  if nxt is null then raise exception 'unknown action %', action using errcode = '22023'; end if;

  if not (
       (a.status in ('pending', 'recycled') and nxt in ('approved', 'rejected', 'merged', 'recycled'))
    or (a.status = 'approved' and nxt in ('resolved', 'rejected', 'merged'))
    or (a.status in ('rejected', 'recycled', 'resolved', 'expired') and nxt = 'pending')
    or (a.status = 'pending' and nxt = 'pending')
  ) then
    raise exception 'transition % -> % not allowed', a.status, nxt using errcode = '22023';
  end if;
  if nxt = 'approved' and a.wilaya_code is null then
    raise exception 'set the wilaya before approving' using errcode = '22023';
  end if;

  if nxt = 'merged' then
    if merge_target is null or merge_target = alert then raise exception 'merge target required' using errcode = '22023'; end if;
    select * into t from public.alerts where id = merge_target;
    if not found or t.status not in ('pending', 'approved') then raise exception 'invalid merge target' using errcode = '22023'; end if;
    update public.alerts set source_count = source_count + a.source_count where id = merge_target;
    insert into public.alert_sources (alert_id, intake_item_id, channel, url, similarity)
      select merge_target, s.intake_item_id, s.channel, s.url, s.similarity from public.alert_sources s where s.alert_id = alert
      on conflict do nothing;
  end if;

  update public.alerts set status = nxt, reviewed_at = now(), reviewed_by = uid,
         merged_into = case when nxt = 'merged' then merge_target else null end,
         resolved_at = case when nxt = 'resolved' then now() else resolved_at end
   where id = alert;

  -- resolved / recycled content feeds the recycled-post archive (real platform history only)
  if nxt in ('resolved', 'recycled') then
    insert into public.historical_posts (content_hash, normalized_text, phone_hashes, category, wilaya_code,
                                         first_seen_at, resolved_at, alert_id, source, embedding)
    select coalesce(a.content_hash, encode(extensions.digest(a.original_text, 'sha256'), 'hex')),
           coalesce(a.canonical_text, a.original_text),
           coalesce((select array[c.phone_hash] from public.alert_contacts c where c.alert_id = alert and c.phone_hash is not null), '{}'),
           a.category, a.wilaya_code, coalesce(a.first_seen_at, a.created_at),
           case when nxt = 'resolved' then now() end, alert, 'platform', a.embedding
    on conflict (content_hash) do update set last_seen_at = now(), times_seen = public.historical_posts.times_seen + 1,
           resolved_at = coalesce(public.historical_posts.resolved_at, excluded.resolved_at);
  end if;

  perform private.audit('alert_' || action, 'alert', alert::text, a.wilaya_code,
                        jsonb_build_object('from', a.status, 'to', nxt, 'note', note, 'merge_target', merge_target));
  return nxt;
end $$;

-- ===================== clubs =====================
create or replace function public.create_club(name text, wilaya int, description text default '',
                                              institution_name text default null, focus public.alert_category[] default '{}')
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); cid uuid;
begin
  insert into public.clubs (name, description, wilaya_code, institution_name, focus, created_by)
  values (create_club.name, coalesce(create_club.description, ''), wilaya, create_club.institution_name, coalesce(create_club.focus, '{}'), uid)
  returning id into cid;
  insert into public.club_members (club_id, user_id, role) values (cid, uid, 'lead');
  insert into public.user_roles (user_id, role) values (uid, 'club_lead') on conflict do nothing;
  perform private.audit('create_club', 'club', cid::text, wilaya::smallint);
  return cid;
end $$;

-- ===================== trees =====================
create or replace function public.review_tree(tree uuid, approve boolean, note text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); t record;
begin
  select * into t from public.trees where id = tree for update;
  if not found then raise exception 'tree not found' using errcode = 'P0002'; end if;
  if not public.can_moderate(t.wilaya_code) then raise exception 'not allowed' using errcode = '42501'; end if;
  if t.user_id = uid then raise exception 'cannot review your own tree' using errcode = '42501'; end if;
  if t.status <> 'pending' then raise exception 'already reviewed' using errcode = '22023'; end if;
  update public.trees set status = case when approve then 'approved'::public.review_status else 'rejected'::public.review_status end,
         review_note = review_tree.note, reviewed_by = uid, reviewed_at = now() where id = tree;
  perform private.audit(case when approve then 'tree_approve' else 'tree_reject' end, 'tree', tree::text, t.wilaya_code);
end $$;

-- ===================== after-action reports =====================
create or replace function public.submit_report(outcome text, attended_count int, hours_total numeric,
                                                alert uuid default null, activity uuid default null,
                                                resources_used text default null, organization text default null)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); allowed boolean := false; rid uuid; w smallint;
begin
  if alert is not null then
    select (a.owner_id = uid or public.can_moderate(a.wilaya_code)), a.wilaya_code into allowed, w
      from public.alerts a where a.id = alert and a.status in ('approved', 'resolved');
  elsif activity is not null then
    select ((ca.club_id is not null and public.is_club_lead(ca.club_id)) or public.can_moderate(ca.wilaya_code)), ca.wilaya_code
      into allowed, w from public.club_activities ca where ca.id = activity;
  end if;
  if not coalesce(allowed, false) then raise exception 'not allowed to report on this' using errcode = '42501'; end if;
  insert into public.reports (alert_id, activity_id, author_id, outcome, attended_count, hours_total, resources_used, organization,
                              status, reviewed_by, reviewed_at)
  values (alert, activity, uid, outcome, attended_count, hours_total, resources_used, organization,
          case when public.can_moderate(w) then 'approved'::public.review_status else 'pending'::public.review_status end,
          case when public.can_moderate(w) then uid end, case when public.can_moderate(w) then now() end)
  returning id into rid;
  perform private.audit('submit_report', 'report', rid::text, w);
  return rid;
end $$;

create or replace function public.review_report(report uuid, approve boolean)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); r record; w smallint;
begin
  select * into r from public.reports where id = report for update;
  if not found then raise exception 'report not found' using errcode = 'P0002'; end if;
  w := coalesce(public.alert_wilaya(r.alert_id), (select wilaya_code from public.club_activities where id = r.activity_id));
  if not public.can_moderate(w) then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.reports set status = case when approve then 'approved'::public.review_status else 'rejected'::public.review_status end,
         reviewed_by = uid, reviewed_at = now() where id = report;
  perform private.audit('review_report', 'report', report::text, w, jsonb_build_object('approve', approve));
end $$;

-- ===================== points & certificates =====================
create or replace function public.my_points()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'points', coalesce(sum(points), 0),
    'hours', coalesce(sum(hours), 0),
    'events', count(*),
    'by_kind', coalesce(jsonb_object_agg(kind, n) filter (where kind is not null), '{}')
  )
  from (select kind, points, hours, count(*) over (partition by kind) as n
        from public.point_events where user_id = auth.uid()) e;
$$;

create or replace function public.leaderboard(wilaya int default null, lim int default 20)
returns table (user_id uuid, display_name text, wilaya_code smallint, points bigint)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name, p.wilaya_code, sum(e.points)::bigint
  from public.point_events e join public.profiles p on p.id = e.user_id
  where p.deleted_at is null and p.display_name <> '' and (leaderboard.wilaya is null or p.wilaya_code = leaderboard.wilaya)
  group by p.id order by 4 desc limit least(greatest(lim, 1), 100);
$$;

create or replace function private.certificate_signature(c public.certificates)
returns text language sql stable security definer set search_path = '' as $$
  select encode(extensions.hmac(
    c.id::text || '|' || c.user_id::text || '|' || c.holder_name || '|' || c.hours::text || '|' ||
    c.activities::text || '|' || extract(epoch from c.period_start)::bigint || '|' || extract(epoch from c.period_end)::bigint,
    private.secret('certificate_hmac'), 'sha256'), 'hex');
$$;

create or replace function public.issue_certificate()
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); name text; h numeric; n int; p_start timestamptz; p_end timestamptz; c public.certificates;
begin
  select display_name into name from public.profiles where id = uid;
  if coalesce(name, '') = '' then raise exception 'set your display name first' using errcode = '22023'; end if;
  -- only events that carry confirmed hours count towards a certificate
  select coalesce(sum(hours), 0), count(*), min(at), max(at) into h, n, p_start, p_end
    from public.point_events where user_id = uid and hours > 0;
  if h <= 0 then raise exception 'no confirmed volunteer hours yet' using errcode = '22023'; end if;
  insert into public.certificates (user_id, holder_name, hours, activities, period_start, period_end, signature)
  values (uid, name, h, n, p_start, p_end, 'pending') returning * into c;
  update public.certificates set signature = private.certificate_signature(c) where id = c.id;
  perform private.audit('issue_certificate', 'certificate', c.id::text, null, jsonb_build_object('hours', h));
  return c.id;
end $$;

create or replace function public.verify_certificate(cert uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c public.certificates;
begin
  select * into c from public.certificates where id = cert;
  if not found then return jsonb_build_object('valid', false, 'reason', 'not_found'); end if;
  return jsonb_build_object(
    'valid', c.revoked_at is null and c.signature = private.certificate_signature(c),
    'revoked', c.revoked_at is not null,
    'holder_name', c.holder_name, 'hours', c.hours, 'activities', c.activities,
    'period_start', c.period_start, 'period_end', c.period_end, 'issuer', c.issuer, 'issued_at', c.issued_at);
end $$;

-- ===================== roles =====================
create or replace function public.grant_role(target uuid, r public.app_role, wilaya int default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user();
begin
  if r = 'ministry_admin' and not public.is_ministry() then raise exception 'not allowed' using errcode = '42501'; end if;
  if r = 'djsl_admin' and not public.is_ministry() then raise exception 'only the ministry assigns DJSL admins' using errcode = '42501'; end if;
  if r in ('moderator', 'club_lead', 'association') and not (public.is_ministry() or (wilaya is not null and public.can_administer(wilaya::smallint))) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if r = 'volunteer' then return; end if;
  insert into public.user_roles (user_id, role, wilaya_code, granted_by)
  values (target, r, case when r in ('moderator', 'djsl_admin') then wilaya end, uid)
  on conflict (user_id, role) do update set wilaya_code = excluded.wilaya_code, granted_by = uid, granted_at = now();
  perform private.audit('grant_role', 'user', target::text, wilaya::smallint, jsonb_build_object('role', r));
end $$;

create or replace function public.revoke_role(target uuid, r public.app_role)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); w smallint;
begin
  select wilaya_code into w from public.user_roles where user_id = target and role = r;
  if r = 'volunteer' then raise exception 'cannot revoke base role' using errcode = '22023'; end if;
  if not (public.is_ministry() or (r in ('moderator', 'club_lead', 'association') and w is not null and public.can_administer(w))) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if target = uid and r = 'ministry_admin' then raise exception 'cannot revoke your own ministry role' using errcode = '22023'; end if;
  delete from public.user_roles where user_id = target and role = r;
  perform private.audit('revoke_role', 'user', target::text, w, jsonb_build_object('role', r));
end $$;

-- Staff look up a user by email to grant a role (returns minimal data).
create or replace function public.find_user_by_email(email text)
returns table (id uuid, display_name text, wilaya_code smallint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.is_ministry() or public.has_role('djsl_admin')) then raise exception 'not allowed' using errcode = '42501'; end if;
  return query select p.id, p.display_name, p.wilaya_code from auth.users u join public.profiles p on p.id = u.id
               where lower(u.email) = lower(find_user_by_email.email) and p.deleted_at is null;
end $$;

-- ===================== crisis =====================
create or replace function public.activate_crisis(t public.crisis_type, wilaya int, title text, sms_template text)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); cid uuid;
begin
  if not public.can_administer(wilaya::smallint) then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into public.crises (type, wilaya_code, title, sms_template, started_by)
  values (t, wilaya, activate_crisis.title, activate_crisis.sms_template, uid) returning id into cid;
  perform private.audit('activate_crisis', 'crisis', cid::text, wilaya::smallint, jsonb_build_object('type', t));
  return cid;
end $$;

create or replace function public.close_crisis(crisis uuid, report text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); c record;
begin
  select * into c from public.crises where id = crisis for update;
  if not found or c.status <> 'active' then raise exception 'crisis not active' using errcode = '22023'; end if;
  if not public.can_administer(c.wilaya_code) then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.crises set status = 'closed', closed_by = uid, closed_at = now(), closure_report = report where id = crisis;
  perform private.audit('close_crisis', 'crisis', crisis::text, c.wilaya_code);
end $$;

create or replace function public.confirm_crisis_availability(crisis uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user();
begin
  if not exists (select 1 from public.crises where id = crisis and status = 'active') then
    raise exception 'crisis not active' using errcode = '22023';
  end if;
  insert into public.crisis_confirmations (crisis_id, user_id, via) values (crisis, uid, 'web') on conflict do nothing;
end $$;

-- ===================== privacy =====================
create or replace function public.request_account_deletion(reason text default null)
returns timestamptz language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); due timestamptz;
begin
  insert into public.deletion_requests (user_id, reason) values (uid, reason)
  on conflict (user_id) where status = 'pending' do nothing;
  select scheduled_for into due from public.deletion_requests where user_id = uid and status = 'pending';
  return due;
end $$;

create or replace function public.cancel_account_deletion()
returns void language sql volatile security definer set search_path = '' as $$
  update public.deletion_requests set status = 'cancelled', processed_at = now()
   where user_id = auth.uid() and status = 'pending';
$$;

-- Export everything we hold about the caller (right of access).
create or replace function public.export_my_data()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'private', (select to_jsonb(x) from public.profile_private x where x.user_id = auth.uid()),
    'roles', (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from public.user_roles r where r.user_id = auth.uid()),
    'consents', (select coalesce(jsonb_agg(to_jsonb(c)), '[]') from public.consents c where c.user_id = auth.uid()),
    'alerts_owned', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'status', a.status, 'created_at', a.created_at)), '[]') from public.alerts a where a.owner_id = auth.uid()),
    'participation', (select coalesce(jsonb_agg(to_jsonb(v)), '[]') from public.alert_volunteers v where v.user_id = auth.uid()),
    'attendance', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.attendance t where t.user_id = auth.uid()),
    'trees', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.trees t where t.user_id = auth.uid()),
    'clubs', (select coalesce(jsonb_agg(to_jsonb(m)), '[]') from public.club_members m where m.user_id = auth.uid()),
    'certificates', (select coalesce(jsonb_agg(to_jsonb(c)), '[]') from public.certificates c where c.user_id = auth.uid()),
    'exported_at', now());
$$;

-- Purge job (service role / pg_cron): deletes the auth user, which cascades to personal rows.
-- Alerts they owned stay (needed for other people's history) but lose the owner link.
create or replace function private.purge_due_accounts()
returns int language plpgsql volatile security definer set search_path = '' as $$
declare r record; n int := 0;
begin
  for r in select * from public.deletion_requests where status = 'pending' and scheduled_for <= now() loop
    update public.deletion_requests set status = 'done', processed_at = now() where id = r.id;
    insert into public.audit_log (actor_id, action, entity, entity_id) values (null, 'purge_account', 'user', r.user_id::text);
    delete from auth.users where id = r.user_id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- ===================== rate limiting (service role only) =====================
create or replace function public.rate_limit_hit(k text, max_hits int, window_seconds int)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare ws timestamptz := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds); c int;
begin
  insert into public.rate_limits (key, window_start, count) values (k, ws, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count into c;
  delete from public.rate_limits where window_start < now() - interval '1 day';
  return c <= max_hits;
end $$;

-- ===================== execute grants =====================
revoke execute on all functions in schema public from public, anon;
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on all functions in schema public to authenticated;
revoke execute on function public.rate_limit_hit(text, int, int) from authenticated;
grant execute on function public.verify_certificate(uuid) to anon;
grant execute on function public.leaderboard(int, int) to anon;
-- RLS policies call these helpers as the anon role too
grant execute on function public.has_role(public.app_role), public.is_ministry(), public.can_moderate(smallint),
  public.can_administer(smallint), public.is_staff(), public.is_club_lead(uuid), public.alert_wilaya(uuid),
  public.can_see_alert_contact(uuid) to anon;
alter default privileges in schema public revoke execute on functions from public, anon;
