-- Identity, roles, consent.
-- Roles live in user_roles and are only writable through server-checked RPCs (see rpc migration).
-- The browser never supplies a role.

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null default '' check (char_length(display_name) <= 80),
  wilaya_code   smallint references public.wilayas(code) on update cascade,
  baladiya_id   int references public.baladiyas(id) on delete set null,
  skills        text[] not null default '{}',
  availability  public.availability not null default 'anytime',
  locale        text not null default 'ar' check (locale in ('ar', 'fr')),
  onboarded     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index profiles_wilaya_idx on public.profiles (wilaya_code) where deleted_at is null;

-- Sensitive personal data, kept apart so that policies on it can be strict.
-- Blood type is health data (sensitive under Law 18-07).
create table public.profile_private (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  phone         text check (phone is null or phone ~ '^\+?[0-9]{9,15}$'),
  phone_verified boolean not null default false,
  blood_type    public.blood_type,
  sms_opt_in    boolean not null default false,
  updated_at    timestamptz not null default now()
);

create table public.user_roles (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role         public.app_role not null,
  -- required for moderator / djsl_admin (their scope); null for ministry_admin and plain roles.
  wilaya_code  smallint references public.wilayas(code) on update cascade,
  granted_by   uuid references public.profiles(id) on delete set null,
  granted_at   timestamptz not null default now(),
  primary key (user_id, role),
  constraint scoped_admin_has_wilaya check (
    role not in ('moderator', 'djsl_admin') or wilaya_code is not null
  )
);
create index user_roles_role_wilaya_idx on public.user_roles (role, wilaya_code);

create table public.consents (
  id          bigint generated always as identity primary key,
  user_id     uuid references public.profiles(id) on delete cascade,
  -- anonymous submitters consent too; we store the intake item id instead of a user id
  intake_item_id uuid,
  purpose     text not null check (purpose in (
                'terms', 'contact_share', 'blood_data', 'sms_alerts', 'location', 'donor_registry', 'public_submission')),
  version     text not null,
  granted_at  timestamptz not null default now(),
  revoked_at  timestamptz
);
create index consents_user_idx on public.consents (user_id, purpose);

-- ---------- authorisation helpers ----------
-- security definer + empty search_path: they read user_roles regardless of the caller's RLS,
-- and are safe against search_path hijacking.

create or replace function public.has_role(r public.app_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = r);
$$;

create or replace function public.is_ministry()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'ministry_admin');
$$;

-- Moderation rights over a wilaya: ministry everywhere, moderator/djsl_admin in their wilaya.
create or replace function public.can_moderate(w smallint)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'ministry_admin'
           or (ur.role in ('moderator', 'djsl_admin') and ur.wilaya_code = w))
  );
$$;

-- Administration rights (roles, institutions, crises): ministry everywhere, djsl_admin in their wilaya.
create or replace function public.can_administer(w smallint)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role = 'ministry_admin' or (ur.role = 'djsl_admin' and ur.wilaya_code = w))
  );
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role in ('moderator', 'djsl_admin', 'ministry_admin')
  );
$$;

-- Wilayas where the caller may moderate (null element = national).
create or replace function public.my_moderation_scope()
returns smallint[] language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'ministry_admin') then array[null::smallint]
    else coalesce(array_agg(wilaya_code), '{}')
  end
  from public.user_roles where user_id = auth.uid() and role in ('moderator', 'djsl_admin');
$$;

-- ---------- new user bootstrap ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(left(new.raw_user_meta_data->>'display_name', 80), ''));
  insert into public.profile_private (user_id, phone)
  values (new.id, nullif(new.phone, ''));
  insert into public.user_roles (user_id, role) values (new.id, 'volunteer');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- updated_at ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger profile_private_touch before update on public.profile_private for each row execute function public.touch_updated_at();
create trigger wilayas_touch before update on public.wilayas for each row execute function public.touch_updated_at();
create trigger institutions_touch before update on public.institutions for each row execute function public.touch_updated_at();
