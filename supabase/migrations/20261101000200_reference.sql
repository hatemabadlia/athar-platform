-- Reference data: administrative divisions and institutions.
-- Sources and verification status: docs/DATA_SOURCES.md

create table public.wilayas (
  code        smallint primary key check (code between 1 and 99),
  name_ar     text not null,
  name_fr     text not null,
  lat         double precision not null check (lat between 18 and 38),
  lng         double precision not null check (lng between -9 and 12),
  -- false = present in our dataset but the code/name has not been checked against the Journal officiel.
  verified    boolean not null default false,
  source      text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.baladiyas (
  id           serial primary key,
  wilaya_code  smallint not null references public.wilayas(code) on update cascade,
  name_ar      text not null,
  name_fr      text,
  lat          double precision,
  lng          double precision,
  ons_code     text unique,
  source       text not null,
  created_at   timestamptz not null default now(),
  unique (wilaya_code, name_ar)
);
create index baladiyas_wilaya_idx on public.baladiyas (wilaya_code);
create index baladiyas_name_trgm on public.baladiyas using gin (name_ar extensions.gin_trgm_ops);

-- Institutions (دور الشباب، مراكز حقن الدم، مستشفيات...) — imported by admins from verified lists.
-- Left EMPTY by default: no official machine-readable list was available at build time.
create table public.institutions (
  id           uuid primary key default gen_random_uuid(),
  kind         public.institution_kind not null,
  name_ar      text not null,
  name_fr      text,
  wilaya_code  smallint not null references public.wilayas(code) on update cascade,
  baladiya_id  int references public.baladiyas(id) on delete set null,
  address      text,
  lat          double precision,
  lng          double precision,
  phone        text,           -- institutional phone, public by nature
  source       text not null,  -- where the row came from (import file, admin)
  verified     boolean not null default false,
  created_by   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (kind, wilaya_code, name_ar)
);
create index institutions_wilaya_idx on public.institutions (wilaya_code, kind);

-- Blood compatibility (red cell transfusion, ABO/Rh). donor -> recipient.
-- Source: standard ABO/RhD red-cell compatibility rules (e.g. AABB / WHO "Clinical use of blood").
-- This is reference information for matching ONLY; clinical decisions belong to medical staff.
create table public.blood_compatibility (
  donor      public.blood_type not null,
  recipient  public.blood_type not null,
  primary key (donor, recipient)
);

create table public.categories (
  key         public.alert_category primary key,
  label_ar    text not null,
  label_fr    text not null,
  emoji       text not null,
  sort_order  smallint not null
);
