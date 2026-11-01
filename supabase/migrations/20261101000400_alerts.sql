-- Intake queue, alerts, sources, volunteers, recycled-post archive, AI audit.

-- Every inbound message (form, Telegram, WhatsApp, RSS, moderator paste) lands here first.
create table public.intake_items (
  id              uuid primary key default gen_random_uuid(),
  channel         public.intake_channel not null,
  external_id     text,            -- message id on the source platform, for idempotency
  source_url      text check (source_url is null or source_url ~ '^https?://'),
  source_label    text,            -- e.g. Telegram chat title, RSS feed name
  raw_text        text not null check (char_length(raw_text) between 10 and 5000),
  content_hash    text not null,   -- sha256 of normalised text
  submitter_id    uuid references public.profiles(id) on delete set null,
  status          public.intake_status not null default 'queued',
  error           text,
  alert_id        uuid,            -- set when processed into an alert (FK added below)
  pipeline        jsonb,           -- per-stage result shown in /ingest
  received_at     timestamptz not null default now(),
  processed_at    timestamptz,
  unique (channel, external_id)
);
create index intake_items_status_idx on public.intake_items (status, received_at desc);
create index intake_items_hash_idx on public.intake_items (content_hash);
create index intake_items_submitter_idx on public.intake_items (submitter_id);

-- Private contact details for anonymous submissions (phone given on the form).
create table public.intake_contacts (
  intake_item_id  uuid primary key references public.intake_items(id) on delete cascade,
  name            text,
  phone           text
);

create table public.alerts (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null check (char_length(title) between 3 and 160),
  summary            text not null default '',
  original_text      text not null,
  normalized_text    text,            -- MSA rewrite (display)
  canonical_text     text,            -- normalised original, used for similarity
  content_hash       text,            -- sha256(canonical_text)
  darija_terms       jsonb not null default '[]',
  category           public.alert_category not null,
  urgency            public.urgency not null default 'normal',
  status             public.alert_status not null default 'pending',
  verdict            public.ai_verdict,
  wilaya_code        smallint references public.wilayas(code) on update cascade,
  baladiya_id        int references public.baladiyas(id) on delete set null,
  baladiya_name      text,           -- as extracted, when not matched to the reference table
  institution_name   text,           -- hospital / youth house mentioned (public institutions only)
  -- Public map point. For people this is the baladiya or wilaya centroid, never a home address.
  lat                double precision,
  lng                double precision,
  location_precision text not null default 'wilaya' check (location_precision in ('wilaya', 'baladiya', 'institution')),
  blood_type         public.blood_type,
  quantity           int check (quantity is null or quantity > 0),
  deadline           timestamptz,
  contact_name       text,
  volunteers_needed  int not null default 0 check (volunteers_needed between 0 and 10000),
  credibility_score  smallint check (credibility_score between 0 and 100),
  credibility_reasons jsonb not null default '[]',
  ai_mode            text not null default 'heuristic' check (ai_mode in ('claude', 'heuristic', 'manual')),
  ai_confidence      real check (ai_confidence between 0 and 1),
  needs_review_reasons text[] not null default '{}',
  owner_id           uuid references public.profiles(id) on delete set null,
  association_id     uuid,           -- FK added in the associations migration
  merged_into        uuid references public.alerts(id) on delete set null,
  first_seen_at      timestamptz,    -- for recycled posts: when the content was first observed
  source_count       int not null default 1,
  embedding          extensions.vector(1024),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  reviewed_at        timestamptz,
  reviewed_by        uuid references public.profiles(id) on delete set null,
  resolved_at        timestamptz,
  constraint merged_has_target check (status <> 'merged' or merged_into is not null)
);
create index alerts_public_idx on public.alerts (status, urgency, created_at desc);
create index alerts_wilaya_status_idx on public.alerts (wilaya_code, status);
create index alerts_category_idx on public.alerts (category, wilaya_code) where status = 'approved';
create index alerts_owner_idx on public.alerts (owner_id);
create index alerts_text_trgm on public.alerts using gin (canonical_text extensions.gin_trgm_ops);
create index alerts_hash_idx on public.alerts (content_hash);
create index alerts_embedding_idx on public.alerts using hnsw (embedding extensions.vector_cosine_ops);

alter table public.intake_items
  add constraint intake_items_alert_fk foreign key (alert_id) references public.alerts(id) on delete set null;

create trigger alerts_touch before update on public.alerts for each row execute function public.touch_updated_at();

-- Contact phone for an alert. Visible to: owner, moderators of the wilaya, volunteers who joined.
create table public.alert_contacts (
  alert_id  uuid primary key references public.alerts(id) on delete cascade,
  phone     text,
  phone_hash text  -- keyed hash (pipeline secret) used for recycled/duplicate matching
);
create index alert_contacts_hash_idx on public.alert_contacts (phone_hash);

-- Each channel/post an alert was seen in. Duplicates add rows here instead of being deleted.
create table public.alert_sources (
  id              bigint generated always as identity primary key,
  alert_id        uuid not null references public.alerts(id) on delete cascade,
  intake_item_id  uuid references public.intake_items(id) on delete set null,
  channel         public.intake_channel not null,
  url             text,
  similarity      real,
  added_at        timestamptz not null default now(),
  unique (alert_id, intake_item_id)
);
create index alert_sources_alert_idx on public.alert_sources (alert_id);

create table public.alert_volunteers (
  alert_id      uuid not null references public.alerts(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  status        public.volunteer_status not null default 'joined',
  joined_at     timestamptz not null default now(),
  confirmed_at  timestamptz,
  confirmed_by  uuid references public.profiles(id) on delete set null,
  hours         numeric(5,2) check (hours is null or (hours > 0 and hours <= 24)),
  primary key (alert_id, user_id)
);
create index alert_volunteers_user_idx on public.alert_volunteers (user_id, status);

-- Archive of content the platform has actually seen (never invented).
-- Filled automatically when alerts are resolved/expired/recycled, or by moderator CSV import.
create table public.historical_posts (
  id              uuid primary key default gen_random_uuid(),
  content_hash    text not null unique,
  normalized_text text not null,
  phone_hashes    text[] not null default '{}',
  category        public.alert_category,
  wilaya_code     smallint references public.wilayas(code) on update cascade,
  first_seen_at   timestamptz not null,
  last_seen_at    timestamptz not null default now(),
  times_seen      int not null default 1,
  resolved_at     timestamptz,
  alert_id        uuid references public.alerts(id) on delete set null,
  source          text not null check (source in ('platform', 'import')),
  embedding       extensions.vector(1024)
);
create index historical_posts_trgm on public.historical_posts using gin (normalized_text extensions.gin_trgm_ops);
create index historical_posts_phones on public.historical_posts using gin (phone_hashes);
create index historical_posts_embedding_idx on public.historical_posts using hnsw (embedding extensions.vector_cosine_ops);

-- Every AI/heuristic decision. Stores a hash of the input, not the raw message.
create table public.ai_runs (
  id              bigint generated always as identity primary key,
  intake_item_id  uuid references public.intake_items(id) on delete set null,
  stage           text not null,
  mode            text not null check (mode in ('claude', 'heuristic', 'embedding', 'chatbot')),
  model           text,
  input_hash      text not null,
  output          jsonb,
  latency_ms      int,
  input_tokens    int,
  output_tokens   int,
  cost_usd        numeric(10,6),
  success         boolean not null,
  error           text,
  created_at      timestamptz not null default now()
);
create index ai_runs_created_idx on public.ai_runs (created_at desc);
create index ai_runs_intake_idx on public.ai_runs (intake_item_id);
