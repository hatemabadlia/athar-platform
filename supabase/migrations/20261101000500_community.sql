-- Clubs, activities, QR attendance, trees, after-action reports, certificates, points.

create table public.clubs (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 3 and 120),
  description     text not null default '',
  institution_id  uuid references public.institutions(id) on delete set null,
  institution_name text,           -- free text until the institution is imported/verified
  wilaya_code     smallint not null references public.wilayas(code) on update cascade,
  baladiya_id     int references public.baladiyas(id) on delete set null,
  focus           public.alert_category[] not null default '{}',
  created_by      uuid references public.profiles(id) on delete set null,
  status          public.review_status not null default 'approved',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (wilaya_code, name)
);
create index clubs_wilaya_idx on public.clubs (wilaya_code);
create trigger clubs_touch before update on public.clubs for each row execute function public.touch_updated_at();

create table public.club_members (
  club_id    uuid not null references public.clubs(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('member', 'lead')),
  joined_at  timestamptz not null default now(),
  primary key (club_id, user_id)
);
create index club_members_user_idx on public.club_members (user_id);

create table public.club_activities (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid references public.clubs(id) on delete cascade,
  alert_id     uuid references public.alerts(id) on delete set null,
  title        text not null check (char_length(title) between 3 and 160),
  description  text not null default '',
  location     text,
  wilaya_code  smallint not null references public.wilayas(code) on update cascade,
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  status       text not null default 'planned' check (status in ('planned', 'ongoing', 'done', 'cancelled')),
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint activity_has_owner check (club_id is not null or alert_id is not null),
  constraint activity_time_order check (ends_at is null or ends_at > starts_at)
);
create index club_activities_club_idx on public.club_activities (club_id, starts_at desc);
create index club_activities_alert_idx on public.club_activities (alert_id);

-- One row per verified check-in. Created only by the check_in RPC after QR token verification.
create table public.attendance (
  id             bigint generated always as identity primary key,
  activity_id    uuid not null references public.club_activities(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  checked_in_at  timestamptz not null default now(),
  checked_in_by  uuid not null references public.profiles(id),
  token_nonce    text not null unique,      -- anti-replay: a token can be used once
  hours          numeric(5,2) check (hours is null or (hours > 0 and hours <= 24)),
  unique (activity_id, user_id)              -- points awarded exactly once per activity
);
create index attendance_user_idx on public.attendance (user_id);

create table public.trees (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  club_id        uuid references public.clubs(id) on delete set null,
  wilaya_code    smallint not null references public.wilayas(code) on update cascade,
  baladiya_id    int references public.baladiyas(id) on delete set null,
  place          text not null check (char_length(place) between 2 and 160),
  species        text not null check (char_length(species) between 2 and 60),
  note           text not null default '' check (char_length(note) <= 500),
  photo_path     text,                       -- storage path in bucket tree-photos
  -- planted trees are not homes: we keep the point but round it to ~100 m for public display
  lat            double precision check (lat between 18 and 38),
  lng            double precision check (lng between -9 and 12),
  exif_taken_at  timestamptz,
  location_check jsonb not null default '{}',  -- {exif_distance_km, gps_source, ...}
  status         public.review_status not null default 'pending',
  review_note    text,
  reviewed_by    uuid references public.profiles(id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index trees_status_idx on public.trees (status, created_at desc);
create index trees_wilaya_idx on public.trees (wilaya_code, status);
create index trees_user_idx on public.trees (user_id);

create table public.tree_likes (
  tree_id    uuid not null references public.trees(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tree_id, user_id)
);

-- After-action reports, written by the alert owner, a club lead or a moderator.
create table public.reports (
  id               uuid primary key default gen_random_uuid(),
  alert_id         uuid references public.alerts(id) on delete cascade,
  activity_id      uuid references public.club_activities(id) on delete cascade,
  author_id        uuid not null references public.profiles(id),
  organization     text,
  outcome          text not null check (char_length(outcome) between 5 and 2000),
  resources_used   text,
  attended_count   int not null default 0 check (attended_count >= 0),
  hours_total      numeric(8,2) not null default 0 check (hours_total >= 0),
  evidence_paths   text[] not null default '{}',
  status           public.review_status not null default 'pending',
  reviewed_by      uuid references public.profiles(id) on delete set null,
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now(),
  constraint report_target check (alert_id is not null or activity_id is not null)
);
create index reports_alert_idx on public.reports (alert_id);
create index reports_status_idx on public.reports (status, created_at desc);

-- Certificates: snapshot of confirmed hours at issue time, verifiable at /verify/[id].
create table public.certificates (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  holder_name    text not null,
  hours          numeric(8,2) not null check (hours > 0),
  activities     int not null check (activities > 0),
  period_start   timestamptz not null,
  period_end     timestamptz not null,
  issuer         text not null default 'منصة إيثار — Athar platform',
  signature      text not null,          -- HMAC over the canonical fields (server secret)
  issued_at      timestamptz not null default now(),
  revoked_at     timestamptz,
  revoked_reason text
);
create index certificates_user_idx on public.certificates (user_id);

-- ---------- points ----------
-- Points come ONLY from confirmed actions. Each source row can count once (primary keys above).
create or replace view public.point_events
with (security_invoker = true) as
  select av.user_id, 'alert_confirmed'::text as kind, av.alert_id::text as ref,
         case a.urgency when 'critical' then 100 when 'medium' then 60 else 40 end as points,
         coalesce(av.hours, 0) as hours, av.confirmed_at as at
  from public.alert_volunteers av join public.alerts a on a.id = av.alert_id
  where av.status = 'confirmed'
  union all
  select at.user_id, 'attendance', at.activity_id::text, 20, coalesce(at.hours, 0), at.checked_in_at
  from public.attendance at
  union all
  select t.user_id, 'tree_approved', t.id::text, 50, 0, t.reviewed_at
  from public.trees t where t.status = 'approved';
