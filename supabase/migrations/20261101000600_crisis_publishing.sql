-- Shelters, crises, SMS log, publishing, audit log, notifications, deletion requests.

create table public.shelters (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid references public.institutions(id) on delete set null,
  name            text not null,
  wilaya_code     smallint not null references public.wilayas(code) on update cascade,
  baladiya_id     int references public.baladiyas(id) on delete set null,
  lat             double precision,
  lng             double precision,
  capacity        int not null check (capacity >= 0),
  occupied        int not null default 0 check (occupied >= 0),
  needs           text[] not null default '{}',
  phone           text,                 -- institutional phone
  is_open         boolean not null default false,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint occupied_le_capacity check (occupied <= capacity)
);
create index shelters_wilaya_idx on public.shelters (wilaya_code, is_open);

create table public.crises (
  id              uuid primary key default gen_random_uuid(),
  type            public.crisis_type not null,
  wilaya_code     smallint not null references public.wilayas(code) on update cascade,
  title           text not null,
  sms_template    text not null check (char_length(sms_template) <= 320),
  status          text not null default 'active' check (status in ('active', 'closed')),
  started_by      uuid not null references public.profiles(id),
  started_at      timestamptz not null default now(),
  closed_by       uuid references public.profiles(id),
  closed_at       timestamptz,
  closure_report  text
);
-- at most one active crisis per wilaya
create unique index crises_one_active_per_wilaya on public.crises (wilaya_code) where status = 'active';

create table public.crisis_updates (
  id         bigint generated always as identity primary key,
  crisis_id  uuid not null references public.crises(id) on delete cascade,
  body       text not null check (char_length(body) between 3 and 1000),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.sms_messages (
  id            bigint generated always as identity primary key,
  crisis_id     uuid references public.crises(id) on delete set null,
  user_id       uuid references public.profiles(id) on delete set null,
  direction     text not null check (direction in ('outbound', 'inbound')),
  phone         text not null,
  body          text not null,
  provider      text not null,               -- 'console' in development
  provider_id   text,
  status        text not null default 'queued' check (status in ('queued', 'sent', 'delivered', 'failed', 'received')),
  error         text,
  created_at    timestamptz not null default now(),
  unique (provider, provider_id)
);
create index sms_messages_crisis_idx on public.sms_messages (crisis_id, direction);

create table public.crisis_confirmations (
  crisis_id     uuid not null references public.crises(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  via           text not null check (via in ('sms', 'web')),
  confirmed_at  timestamptz not null default now(),
  primary key (crisis_id, user_id)
);

-- Branded posts: drafts need admin approval; posting happens only with configured credentials.
create table public.published_posts (
  id            uuid primary key default gen_random_uuid(),
  alert_id      uuid not null references public.alerts(id) on delete cascade,
  caption       text not null check (char_length(caption) <= 2200),
  channels      text[] not null default '{}',
  status        text not null default 'draft' check (status in ('draft', 'approved', 'posted', 'partially_posted', 'failed')),
  results       jsonb not null default '{}',    -- per channel: {status, platform_id, url, error}
  created_by    uuid references public.profiles(id) on delete set null,
  approved_by   uuid references public.profiles(id) on delete set null,
  approved_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index published_posts_alert_idx on public.published_posts (alert_id);

create table public.audit_log (
  id           bigint generated always as identity primary key,
  actor_id     uuid,
  action       text not null,
  entity       text not null,
  entity_id    text,
  wilaya_code  smallint,
  details      jsonb not null default '{}',
  created_at   timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_wilaya_idx on public.audit_log (wilaya_code, created_at desc);

create table public.notifications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text not null default '',
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, read_at, created_at desc);

create table public.deletion_requests (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  reason        text,
  requested_at  timestamptz not null default now(),
  -- grace period: purge job runs after scheduled_for
  scheduled_for timestamptz not null default now() + interval '14 days',
  status        text not null default 'pending' check (status in ('pending', 'cancelled', 'done')),
  processed_at  timestamptz
);
create unique index deletion_requests_one_pending on public.deletion_requests (user_id) where status = 'pending';

-- Simple fixed-window rate limiter used by server routes (keyed by hashed IP or user id).
create table public.rate_limits (
  key         text not null,
  window_start timestamptz not null,
  count       int not null default 0,
  primary key (key, window_start)
);
