-- ============================================================================================================
-- صوّر وبلّغ — civic reporting (road damage, lighting, waste, water…). Separate from humanitarian alerts:
-- its own tables, statuses and severity (never mixed with humanitarian credibility scores).
--
-- Trust model: AI suggestion → community support/confirmation → moderator verification → (optional, only when
-- actually done) forwarding to an authority → resolution. Reporter identity is never public. Photos become public
-- only after a moderator verifies the report AND allows the photo (faces / plates / private property).
-- ============================================================================================================

create type public.civic_status as enum (
  'submitted', 'pending_review', 'needs_info', 'verified', 'forwarded', 'in_progress', 'resolved', 'closed', 'rejected', 'duplicate'
);
create type public.civic_severity as enum ('low', 'medium', 'high', 'danger');

create table public.civic_categories (
  key        text primary key,
  label_ar   text not null,
  label_fr   text not null,
  emoji      text not null,
  color      text not null,
  sort_order smallint not null
);
alter table public.civic_categories enable row level security;
create policy "civic categories readable" on public.civic_categories for select to anon, authenticated using (true);
insert into public.civic_categories values
  ('road',         'طريق متضرر / حفرة',      'Route dégradée / nid-de-poule', '🕳️', '#b45309', 1),
  ('lighting',     'إنارة عمومية معطلة',      'Éclairage public en panne',     '💡', '#ca8a04', 2),
  ('waste',        'تراكم النفايات',          'Accumulation de déchets',       '🗑️', '#65a30d', 3),
  ('water',        'تسرب مياه',               'Fuite d''eau',                  '💧', '#0284c7', 4),
  ('sidewalk',     'رصيف متضرر',              'Trottoir endommagé',            '🚶', '#7c3aed', 5),
  ('traffic_sign', 'إشارة مرور مكسورة',       'Panneau de signalisation cassé','🚸', '#dc2626', 6),
  ('manhole',      'بالوعة مفتوحة',           'Regard ouvert',                 '⚠️', '#ea580c', 7),
  ('electrical',   'أسلاك كهربائية خطيرة',     'Câbles électriques dangereux',  '⚡', '#e11d48', 8),
  ('drainage',     'انسداد قنوات الصرف',       'Évacuation bouchée',            '🌊', '#0d9488', 9),
  ('public_space', 'فضاء عمومي مهمل أو خطير',  'Espace public abandonné',       '🏚️', '#475569', 10),
  ('other',        'مشكل آخر',                'Autre problème',                '📍', '#64748b', 11);

create table public.civic_reports (
  id             uuid primary key default gen_random_uuid(),
  ref            text not null unique,
  reporter_id    uuid references public.profiles(id) on delete set null,   -- never exposed publicly
  category       text not null references public.civic_categories(key),
  description    text not null check (char_length(description) between 3 and 500),
  notes          text check (notes is null or char_length(notes) <= 1000),
  severity       public.civic_severity not null default 'medium',
  status         public.civic_status not null default 'pending_review',
  lat            double precision not null check (lat between 18 and 38),
  lng            double precision not null check (lng between -9 and 12),
  accuracy_m     real check (accuracy_m is null or accuracy_m >= 0),
  location_source text not null check (location_source in ('gps', 'map', 'search')),
  address        text check (address is null or char_length(address) <= 200),
  wilaya_code    smallint references public.wilayas(code) on update cascade,
  photo_paths    text[] not null default '{}' check (cardinality(photo_paths) between 1 and 4),
  photo_hashes   bigint[] not null default '{}',     -- 64-bit perceptual hashes (recycled-photo detection)
  photo_public   boolean not null default false,    -- moderator decision (faces, plates, private property)
  ai             jsonb not null default '{}',       -- AI suggestion as returned (labelled, never proof)
  ai_mode        text not null default 'manual' check (ai_mode in ('gemini', 'claude', 'manual')),
  signals        jsonb not null default '{}',       -- moderator-only: EXIF distance/age, recycled photo, people…
  duplicate_of   uuid references public.civic_reports(id) on delete set null,
  forwarded_to   text check (forwarded_to is null or char_length(forwarded_to) <= 200),
  forwarded_at   timestamptz,
  verified_at    timestamptz,
  resolved_at    timestamptz,
  closed_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index civic_reports_status_idx on public.civic_reports (status, wilaya_code, created_at desc);
create index civic_reports_geo_idx on public.civic_reports (lat, lng);
create index civic_reports_reporter_idx on public.civic_reports (reporter_id, created_at desc);
alter table public.civic_reports enable row level security;
-- direct reads: the reporter (own rows) and moderators of the wilaya. The public reads the safe view below.
create policy "civic own or moderated" on public.civic_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.can_moderate(wilaya_code)));

create table public.civic_report_events (
  id           bigint generated always as identity primary key,
  report_id    uuid not null references public.civic_reports(id) on delete cascade,
  kind         text not null check (kind in ('submitted', 'status', 'comment', 'internal_note', 'resolution', 'info_reply', 'photo_visibility')),
  from_status  public.civic_status,
  to_status    public.civic_status,
  body         text check (body is null or char_length(body) <= 1000),
  photo_path   text,
  actor_id     uuid references public.profiles(id) on delete set null,
  actor_role   text not null check (actor_role in ('reporter', 'citizen', 'moderator', 'system')),
  is_internal  boolean not null default false,
  created_at   timestamptz not null default now()
);
create index civic_events_report_idx on public.civic_report_events (report_id, created_at);
alter table public.civic_report_events enable row level security;
create policy "civic events moderators or reporter" on public.civic_report_events for select to authenticated
  using (exists (select 1 from public.civic_reports r where r.id = report_id
                 and ((select public.can_moderate(r.wilaya_code)) or (r.reporter_id = (select auth.uid()) and not is_internal))));

create table public.civic_supports (
  report_id  uuid not null references public.civic_reports(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('support', 'still_exists')),
  created_at timestamptz not null default now(),
  primary key (report_id, user_id, kind)   -- one support and one confirmation per person
);
alter table public.civic_supports enable row level security;
create policy "civic own supports" on public.civic_supports for select to authenticated using (user_id = (select auth.uid()));

create table public.civic_flags (
  id         bigint generated always as identity primary key,
  report_id  uuid not null references public.civic_reports(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  reason     text not null check (char_length(reason) between 3 and 300),
  created_at timestamptz not null default now(),
  unique (report_id, user_id)
);
alter table public.civic_flags enable row level security;
create policy "civic flags moderators" on public.civic_flags for select to authenticated
  using (exists (select 1 from public.civic_reports r where r.id = report_id and (select public.can_moderate(r.wilaya_code))));

-- --------------------------------------------------------------------------- helpers
create or replace function private.dist_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(power(sin(radians(lat2 - lat1) / 2), 2)
       + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)));
$$;

create or replace function private.hamming(a bigint, b bigint)
returns int language sql immutable as $$ select bit_count((a # b)::bit(64))::int; $$;

-- nearest wilaya seat (approximate: wilaya boundaries are not loaded)
create or replace function private.nearest_wilaya(p_lat double precision, p_lng double precision)
returns smallint language sql stable set search_path = '' as $$
  select w.code from public.wilayas w order by private.dist_m(p_lat, p_lng, w.lat, w.lng) limit 1;
$$;

create or replace function public.civic_is_public(s public.civic_status)
returns boolean language sql immutable as $$ select s in ('verified', 'forwarded', 'in_progress', 'resolved', 'closed'); $$;

-- --------------------------------------------------------------------------- public, safe read models
create view public.civic_public_reports with (security_barrier = true) as
  select r.id, r.ref, r.category, r.description, r.severity, r.status, r.lat, r.lng, r.address, r.wilaya_code,
         case when r.photo_public then r.photo_paths else '{}'::text[] end as photo_paths,
         r.photo_public, r.forwarded_to, r.forwarded_at, r.verified_at, r.resolved_at, r.closed_at, r.created_at, r.duplicate_of,
         (select count(*) from public.civic_supports s where s.report_id = r.id and s.kind = 'support')::int as supporters,
         (select count(*) from public.civic_supports s where s.report_id = r.id and s.kind = 'still_exists')::int as confirmations
  from public.civic_reports r
  where public.civic_is_public(r.status);

create view public.civic_public_events with (security_barrier = true) as
  select e.id, e.report_id, e.kind, e.to_status, e.body, e.photo_path, e.actor_role, e.created_at
  from public.civic_report_events e join public.civic_reports r on r.id = e.report_id
  where not e.is_internal and e.kind <> 'photo_visibility' and public.civic_is_public(r.status);

grant select on public.civic_public_reports, public.civic_public_events to anon, authenticated;

-- --------------------------------------------------------------------------- storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('civic-photos', 'civic-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "upload own civic photo" on storage.objects for insert to authenticated
  with check (bucket_id = 'civic-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "read civic photo" on storage.objects for select to anon, authenticated
  using (bucket_id = 'civic-photos' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (select 1 from public.civic_reports r where name = any (r.photo_paths)
               and ((r.photo_public and public.civic_is_public(r.status)) or public.can_moderate(r.wilaya_code)))
    or exists (select 1 from public.civic_report_events e join public.civic_reports r on r.id = e.report_id
               where e.photo_path = name and e.kind = 'resolution'
                 and (public.civic_is_public(r.status) or public.can_moderate(r.wilaya_code)))
  ));

create policy "delete own unattached civic photo" on storage.objects for delete to authenticated
  using (bucket_id = 'civic-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
         and not exists (select 1 from public.civic_reports r where name = any (r.photo_paths)));

-- --------------------------------------------------------------------------- citizen RPCs
create or replace function public.civic_create(
  p_category text, p_description text, p_notes text, p_severity public.civic_severity,
  p_lat double precision, p_lng double precision, p_accuracy real, p_source text, p_address text,
  p_photo_paths text[], p_photo_hashes bigint[], p_ai jsonb, p_ai_mode text, p_signals jsonb)
returns table (id uuid, ref text)
language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); r_ref text; r_id uuid; w smallint; recycled jsonb; today int; p text;
begin
  select count(*) into today from public.civic_reports c where c.reporter_id = uid and c.created_at > now() - interval '24 hours';
  if today >= 10 then raise exception 'daily report limit reached' using errcode = '53400'; end if;
  if coalesce(cardinality(p_photo_paths), 0) not between 1 and 4 then raise exception 'one to four photos required' using errcode = '22023'; end if;
  foreach p in array p_photo_paths loop
    if split_part(p, '/', 1) <> uid::text then raise exception 'invalid photo path' using errcode = '42501'; end if;
  end loop;

  w := private.nearest_wilaya(p_lat, p_lng);
  -- recycled photo: same perceptual hash (Hamming ≤ 6) as any earlier report. A signal for moderators, not proof.
  select jsonb_agg(jsonb_build_object('ref', c.ref, 'status', c.status, 'distance_m', round(private.dist_m(p_lat, p_lng, c.lat, c.lng))))
    into recycled
    from public.civic_reports c
   where exists (select 1 from unnest(c.photo_hashes) a, unnest(coalesce(p_photo_hashes, '{}')) b where private.hamming(a, b) <= 6);

  loop
    r_ref := 'SWB-' || to_char(now(), 'YYMM') || '-' || upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 5));
    exit when not exists (select 1 from public.civic_reports c where c.ref = r_ref);
  end loop;

  insert into public.civic_reports (ref, reporter_id, category, description, notes, severity, status, lat, lng, accuracy_m,
         location_source, address, wilaya_code, photo_paths, photo_hashes, ai, ai_mode, signals)
  values (r_ref, uid, p_category, trim(p_description), nullif(trim(coalesce(p_notes, '')), ''), p_severity, 'pending_review',
          p_lat, p_lng, p_accuracy, p_source, nullif(trim(coalesce(p_address, '')), ''), w, p_photo_paths, coalesce(p_photo_hashes, '{}'),
          coalesce(p_ai, '{}'), coalesce(p_ai_mode, 'manual'),
          coalesce(p_signals, '{}') || case when recycled is not null then jsonb_build_object('recycled_photo', recycled) else '{}'::jsonb end)
  returning civic_reports.id into r_id;

  insert into public.civic_report_events (report_id, kind, to_status, actor_id, actor_role)
  values (r_id, 'submitted', 'pending_review', uid, 'reporter');
  return query select r_id, r_ref;
end $$;

-- Nearby candidates before creating a report. Returns no reporter information; reports not yet public only
-- reveal that "a similar report is under review".
create or replace function public.civic_nearby(p_lat double precision, p_lng double precision, p_category text,
                                               p_hashes bigint[] default '{}', p_radius_m int default 150)
returns table (id uuid, ref text, category text, status public.civic_status, description text, distance_m int,
               same_category boolean, image_match boolean, supporters int, created_at timestamptz, is_public boolean, mine boolean)
language sql stable security definer set search_path = '' as $$
  select c.id, c.ref, c.category, c.status,
         case when public.civic_is_public(c.status) or c.reporter_id = auth.uid() then c.description end,
         round(private.dist_m(p_lat, p_lng, c.lat, c.lng))::int,
         c.category = p_category,
         exists (select 1 from unnest(c.photo_hashes) a, unnest(coalesce(p_hashes, '{}')) b where private.hamming(a, b) <= 6),
         (select count(*) from public.civic_supports s where s.report_id = c.id and s.kind = 'support')::int,
         c.created_at, public.civic_is_public(c.status), c.reporter_id = auth.uid()
  from public.civic_reports c
  where auth.uid() is not null
    and c.status not in ('rejected', 'duplicate', 'closed')
    and (private.dist_m(p_lat, p_lng, c.lat, c.lng) <= least(greatest(p_radius_m, 20), 1000)
         or exists (select 1 from unnest(c.photo_hashes) a, unnest(coalesce(p_hashes, '{}')) b where private.hamming(a, b) <= 6))
  order by (c.category = p_category) desc, private.dist_m(p_lat, p_lng, c.lat, c.lng)
  limit 5;
$$;

create or replace function public.civic_support(p_report uuid, p_kind text)
returns int language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); r public.civic_reports;
begin
  select * into r from public.civic_reports where id = p_report;
  if not found or not (public.civic_is_public(r.status) or r.status in ('pending_review', 'needs_info')) or r.status = 'closed' then
    raise exception 'report not open' using errcode = '22023';
  end if;
  if p_kind not in ('support', 'still_exists') then raise exception 'invalid kind' using errcode = '22023'; end if;
  if r.reporter_id = uid then raise exception 'you reported this issue' using errcode = '22023'; end if;
  insert into public.civic_supports (report_id, user_id, kind) values (p_report, uid, p_kind) on conflict do nothing;
  return (select count(*) from public.civic_supports s where s.report_id = p_report and s.kind = p_kind);
end $$;

create or replace function public.civic_comment(p_report uuid, p_body text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); r public.civic_reports;
begin
  select * into r from public.civic_reports where id = p_report;
  if not found or not public.civic_is_public(r.status) or r.status = 'closed' then raise exception 'report not open' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_body, ''))) < 5 then raise exception 'too short' using errcode = '22023'; end if;
  if (select count(*) from public.civic_report_events e where e.report_id = p_report and e.actor_id = uid and e.kind = 'comment') >= 3 then
    raise exception 'comment limit reached' using errcode = '53400';
  end if;
  insert into public.civic_report_events (report_id, kind, body, actor_id, actor_role)
  values (p_report, 'comment', left(trim(p_body), 500), uid, case when r.reporter_id = uid then 'reporter' else 'citizen' end);
end $$;

create or replace function public.civic_flag(p_report uuid, p_reason text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user();
begin
  if not exists (select 1 from public.civic_reports r where r.id = p_report) then raise exception 'not found' using errcode = 'P0002'; end if;
  insert into public.civic_flags (report_id, user_id, reason) values (p_report, uid, left(trim(p_reason), 300)) on conflict do nothing;
end $$;

-- The reporter answers a "needs more information" request; the report goes back to review.
create or replace function public.civic_reply_info(p_report uuid, p_body text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); r public.civic_reports;
begin
  select * into r from public.civic_reports where id = p_report for update;
  if not found or r.reporter_id <> uid then raise exception 'not allowed' using errcode = '42501'; end if;
  if r.status <> 'needs_info' then raise exception 'no information requested' using errcode = '22023'; end if;
  update public.civic_reports set status = 'pending_review', updated_at = now() where id = p_report;
  insert into public.civic_report_events (report_id, kind, from_status, to_status, body, actor_id, actor_role)
  values (p_report, 'info_reply', 'needs_info', 'pending_review', left(trim(p_body), 1000), uid, 'reporter');
end $$;

-- --------------------------------------------------------------------------- moderator RPCs
create or replace function public.civic_set_status(p_report uuid, p_status public.civic_status, p_note text default null,
                                                    p_forwarded_to text default null, p_duplicate_of uuid default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); r public.civic_reports; ok boolean; msg text;
begin
  select * into r from public.civic_reports where id = p_report for update;
  if not found then raise exception 'report not found' using errcode = 'P0002'; end if;
  if not public.can_moderate(r.wilaya_code) then raise exception 'not allowed' using errcode = '42501'; end if;
  ok := case r.status
    when 'submitted'      then p_status in ('pending_review', 'verified', 'rejected', 'duplicate', 'needs_info')
    when 'pending_review' then p_status in ('verified', 'rejected', 'duplicate', 'needs_info')
    when 'needs_info'     then p_status in ('pending_review', 'verified', 'rejected', 'duplicate')
    when 'verified'       then p_status in ('forwarded', 'in_progress', 'resolved', 'duplicate', 'rejected')
    when 'forwarded'      then p_status in ('in_progress', 'resolved')
    when 'in_progress'    then p_status in ('resolved')
    when 'resolved'       then p_status in ('closed', 'in_progress')
    when 'rejected'       then p_status in ('pending_review')
    when 'duplicate'      then p_status in ('pending_review')
    else false end;
  if not ok then raise exception 'transition % → % not allowed', r.status, p_status using errcode = '22023'; end if;
  -- ATHAR never claims an authority received a report unless a moderator records who and how it was forwarded.
  if p_status = 'forwarded' and char_length(trim(coalesce(p_forwarded_to, ''))) < 3 then
    raise exception 'forwarding requires the authority and channel' using errcode = '22023';
  end if;
  if p_status = 'duplicate' and (p_duplicate_of is null or p_duplicate_of = p_report
       or not exists (select 1 from public.civic_reports d where d.id = p_duplicate_of)) then
    raise exception 'duplicate requires the original report' using errcode = '22023';
  end if;
  if p_status in ('needs_info', 'rejected') and char_length(trim(coalesce(p_note, ''))) < 3 then
    raise exception 'a reason is required' using errcode = '22023';
  end if;

  update public.civic_reports set status = p_status, updated_at = now(),
    verified_at  = case when p_status = 'verified' and verified_at is null then now() else verified_at end,
    forwarded_at = case when p_status = 'forwarded' then now() else forwarded_at end,
    forwarded_to = case when p_status = 'forwarded' then left(trim(p_forwarded_to), 200) else forwarded_to end,
    resolved_at  = case when p_status = 'resolved' then now() when p_status = 'in_progress' then null else resolved_at end,
    closed_at    = case when p_status = 'closed' then now() else closed_at end,
    duplicate_of = case when p_status = 'duplicate' then p_duplicate_of else duplicate_of end
  where id = p_report;

  insert into public.civic_report_events (report_id, kind, from_status, to_status, body, actor_id, actor_role)
  values (p_report, 'status', r.status, p_status, nullif(left(trim(coalesce(p_note, '')), 1000), ''), uid, 'moderator');
  perform private.audit('civic_status', 'civic_report', p_report::text, r.wilaya_code,
                        jsonb_build_object('from', r.status, 'to', p_status, 'forwarded_to', p_forwarded_to));

  msg := case p_status
    when 'verified' then 'تحقّق مشرف من بلاغك ونُشر على خريطة صوّر وبلّغ.'
    when 'needs_info' then 'يحتاج المشرف معلومات إضافية عن بلاغك.'
    when 'forwarded' then 'سجّل المشرف أن بلاغك أُحيل إلى: ' || left(trim(p_forwarded_to), 120)
    when 'in_progress' then 'بلاغك قيد المعالجة.'
    when 'resolved' then 'سُجّل أن المشكل الذي بلّغت عنه قد حُلّ.'
    when 'rejected' then 'لم يُقبل بلاغك. اطّلع على السبب.'
    when 'duplicate' then 'بلاغك مطابق لبلاغ سابق — دُمج دعمك معه.'
    else null end;
  if msg is not null and r.reporter_id is not null then
    insert into public.notifications (user_id, kind, title, body, link)
    values (r.reporter_id, 'civic_update', 'تحديث بلاغك ' || r.ref, msg, '/civic/r/' || r.ref);
  end if;
  if p_status = 'resolved' then
    insert into public.notifications (user_id, kind, title, body, link)
    select s.user_id, 'civic_update', 'حُلّ مشكل دعمته', 'البلاغ ' || r.ref || ': سُجّل أن المشكل قد حُلّ.', '/civic/r/' || r.ref
    from (select distinct user_id from public.civic_supports where report_id = p_report) s where s.user_id is distinct from r.reporter_id;
  end if;
end $$;

create or replace function public.civic_internal_note(p_report uuid, p_body text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); w smallint;
begin
  select wilaya_code into w from public.civic_reports where id = p_report;
  if not found or not public.can_moderate(w) then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into public.civic_report_events (report_id, kind, body, actor_id, actor_role, is_internal)
  values (p_report, 'internal_note', left(trim(p_body), 1000), uid, 'moderator', true);
end $$;

create or replace function public.civic_add_resolution(p_report uuid, p_body text, p_photo_path text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); w smallint;
begin
  select wilaya_code into w from public.civic_reports where id = p_report;
  if not found or not public.can_moderate(w) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_photo_path is not null and split_part(p_photo_path, '/', 1) <> uid::text then raise exception 'invalid photo path' using errcode = '42501'; end if;
  insert into public.civic_report_events (report_id, kind, body, photo_path, actor_id, actor_role)
  values (p_report, 'resolution', left(trim(coalesce(p_body, '')), 1000), p_photo_path, uid, 'moderator');
end $$;

create or replace function public.civic_set_photo_public(p_report uuid, p_public boolean)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); w smallint;
begin
  select wilaya_code into w from public.civic_reports where id = p_report;
  if not found or not public.can_moderate(w) then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.civic_reports set photo_public = p_public, updated_at = now() where id = p_report;
  insert into public.civic_report_events (report_id, kind, body, actor_id, actor_role, is_internal)
  values (p_report, 'photo_visibility', case when p_public then 'الصورة منشورة' else 'الصورة مخفية' end, uid, 'moderator', true);
end $$;

-- Analytics (aggregates only). Average resolution time uses real resolved_at timestamps only.
create or replace function public.civic_stats(p_wilaya int default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  with r as (select * from public.civic_reports c where p_wilaya is null or c.wilaya_code = p_wilaya)
  select jsonb_build_object(
    'total', (select count(*) from r),
    'pending', (select count(*) from r where status in ('submitted', 'pending_review', 'needs_info')),
    'verified', (select count(*) from r where status = 'verified'),
    'forwarded', (select count(*) from r where status = 'forwarded'),
    'in_progress', (select count(*) from r where status = 'in_progress'),
    'resolved', (select count(*) from r where status in ('resolved', 'closed')),
    'rejected', (select count(*) from r where status in ('rejected', 'duplicate')),
    'avg_resolution_hours', (select round(avg(extract(epoch from (resolved_at - created_at)) / 3600)::numeric, 1) from r where resolved_at is not null),
    'resolved_with_time', (select count(*) from r where resolved_at is not null),
    'by_category', coalesce((select jsonb_agg(jsonb_build_object('key', category, 'n', n) order by n desc) from (select category, count(*) n from r group by category) x), '[]'),
    'by_wilaya', coalesce((select jsonb_agg(jsonb_build_object('code', wilaya_code, 'n', n) order by n desc) from (select wilaya_code, count(*) n from r where wilaya_code is not null group by wilaya_code order by 2 desc limit 10) y), '[]'),
    'supporters', (select count(*) from public.civic_supports s join r on r.id = s.report_id where s.kind = 'support')
  );
$$;

do $$ declare f text; begin
  foreach f in array array[
    'public.civic_create(text, text, text, public.civic_severity, double precision, double precision, real, text, text, text[], bigint[], jsonb, text, jsonb)',
    'public.civic_nearby(double precision, double precision, text, bigint[], int)',
    'public.civic_support(uuid, text)', 'public.civic_comment(uuid, text)', 'public.civic_flag(uuid, text)',
    'public.civic_reply_info(uuid, text)', 'public.civic_set_status(uuid, public.civic_status, text, text, uuid)',
    'public.civic_internal_note(uuid, text)', 'public.civic_add_resolution(uuid, text, text)', 'public.civic_set_photo_public(uuid, boolean)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
revoke all on function public.civic_stats(int) from public;
grant execute on function public.civic_stats(int) to anon, authenticated;
grant execute on function public.civic_is_public(public.civic_status) to anon, authenticated;

alter publication supabase_realtime add table public.civic_reports;
