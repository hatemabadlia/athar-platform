-- Phase 5: blood donor network, in-kind donations, verified associations, campaigns + beneficiary dedupe.

-- ===================== settings (configurable, sourced) =====================
-- Values with clinical or policy meaning are NOT hard-coded; an admin sets them with a source.
create table public.app_settings (
  key         text primary key,
  value       jsonb not null,
  source      text not null,
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);
alter table public.app_settings enable row level security;
create policy "settings readable" on public.app_settings for select to anon, authenticated using (true);
create policy "ministry edits settings" on public.app_settings for all to authenticated
  using ((select public.is_ministry())) with check ((select public.is_ministry()));

-- ===================== blood donors =====================
create table public.blood_donors (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  wilaya_code        smallint not null references public.wilayas(code) on update cascade,
  available          boolean not null default true,
  notify_by_sms      boolean not null default false,
  last_donation_at   date,                 -- self-declared or from recorded donations
  consented_at       timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
-- blood type stays in profile_private (single source, consented separately)
create index blood_donors_wilaya_idx on public.blood_donors (wilaya_code) where available;

create table public.blood_donations (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  donated_on      date not null check (donated_on <= current_date),
  alert_id        uuid references public.alerts(id) on delete set null,
  institution     text,
  -- self-declared until a moderator / blood-centre staff confirms
  confirmed_by    uuid references public.profiles(id) on delete set null,
  confirmed_at    timestamptz,
  created_at      timestamptz not null default now()
);
create index blood_donations_user_idx on public.blood_donations (user_id, donated_on desc);

alter table public.blood_donors enable row level security;
alter table public.blood_donations enable row level security;
create policy "own donor record" on public.blood_donors for select to authenticated using (user_id = (select auth.uid()));
create policy "register as donor" on public.blood_donors for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own donor record" on public.blood_donors for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "leave donor registry" on public.blood_donors for delete to authenticated using (user_id = (select auth.uid()));
create policy "own donations" on public.blood_donations for select to authenticated using (user_id = (select auth.uid()));
create policy "log own donation" on public.blood_donations for insert to authenticated
  with check (user_id = (select auth.uid()) and confirmed_by is null);
create trigger blood_donors_touch before update on public.blood_donors for each row execute function public.touch_updated_at();

-- Count compatible, available donors for an alert (no identities). Moderators of the wilaya only.
create or replace function public.compatible_donor_count(alert uuid)
returns int language plpgsql stable security definer set search_path = '' as $$
declare a record; n int;
begin
  select * into a from public.alerts where id = alert;
  if not found or a.category <> 'blood' then return 0; end if;
  if not public.can_moderate(a.wilaya_code) then raise exception 'not allowed' using errcode = '42501'; end if;
  select count(*) into n from public.blood_donors d join public.profile_private p on p.user_id = d.user_id
  where d.available and d.wilaya_code = a.wilaya_code
    and (a.blood_type is null or exists (select 1 from public.blood_compatibility c where c.donor = p.blood_type and c.recipient = a.blood_type));
  return n;
end $$;

-- In-app notification to compatible donors for an APPROVED blood alert. Returns recipients notified.
-- Eligibility (interval since last donation) is shown to the donor as information; the blood centre decides.
create or replace function public.notify_compatible_donors(alert uuid)
returns int language plpgsql volatile security definer set search_path = '' as $$
declare a record; n int;
begin
  perform private.require_user();
  select * into a from public.alerts where id = alert;
  if not found or a.category <> 'blood' or a.status <> 'approved' then raise exception 'alert not open' using errcode = '22023'; end if;
  if not public.can_moderate(a.wilaya_code) then raise exception 'not allowed' using errcode = '42501'; end if;
  if exists (select 1 from public.audit_log where action = 'notify_donors' and entity_id = alert::text and created_at > now() - interval '6 hours') then
    raise exception 'donors already notified recently' using errcode = '22023';
  end if;
  insert into public.notifications (user_id, kind, title, body, link)
  select d.user_id, 'blood_request', 'نداء دم متوافق مع فصيلتك',
         a.title || ' — تحقّق من أهليتك مع مركز حقن الدم قبل التنقل.', '/?alert=' || a.id
  from public.blood_donors d join public.profile_private p on p.user_id = d.user_id
  where d.available and d.wilaya_code = a.wilaya_code
    and (a.blood_type is null or exists (select 1 from public.blood_compatibility c where c.donor = p.blood_type and c.recipient = a.blood_type));
  get diagnostics n = row_count;
  perform private.audit('notify_donors', 'alert', alert::text, a.wilaya_code, jsonb_build_object('notified', n));
  return n;
end $$;

-- ===================== associations =====================
create table public.associations (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (char_length(name) between 3 and 160),
  approval_number  text not null check (char_length(approval_number) between 3 and 60), -- رقم الاعتماد
  wilaya_code      smallint not null references public.wilayas(code) on update cascade,
  description      text not null default '',
  contact_email    text,
  contact_phone    text,                     -- organisational, shown publicly once verified
  document_paths   text[] not null default '{}',
  applicant_id     uuid not null references public.profiles(id) on delete cascade,
  status           public.review_status not null default 'pending',
  review_note      text,
  reviewed_by      uuid references public.profiles(id) on delete set null,
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now(),
  unique (approval_number, wilaya_code)
);
alter table public.associations enable row level security;
create policy "verified associations public" on public.associations for select to anon, authenticated using (status = 'approved');
create policy "applicant sees own" on public.associations for select to authenticated using (applicant_id = (select auth.uid()));
create policy "staff see applications" on public.associations for select to authenticated using ((select public.can_moderate(wilaya_code)));
create policy "apply" on public.associations for insert to authenticated
  with check (applicant_id = (select auth.uid()) and status = 'pending' and reviewed_by is null);
revoke update on public.associations from authenticated;

alter table public.alerts add constraint alerts_association_fk foreign key (association_id) references public.associations(id) on delete set null;

create or replace function public.review_association(assoc uuid, approve boolean, note text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); a record;
begin
  select * into a from public.associations where id = assoc for update;
  if not found then raise exception 'not found' using errcode = 'P0002'; end if;
  if not public.can_administer(a.wilaya_code) then raise exception 'not allowed' using errcode = '42501'; end if;
  if a.applicant_id = uid then raise exception 'cannot review your own application' using errcode = '42501'; end if;
  update public.associations set status = case when approve then 'approved'::public.review_status else 'rejected'::public.review_status end,
         review_note = note, reviewed_by = uid, reviewed_at = now() where id = assoc;
  if approve then
    insert into public.user_roles (user_id, role, granted_by) values (a.applicant_id, 'association', uid) on conflict do nothing;
  else
    delete from public.user_roles where user_id = a.applicant_id and role = 'association'
      and not exists (select 1 from public.associations x where x.applicant_id = a.applicant_id and x.status = 'approved' and x.id <> assoc);
  end if;
  perform private.audit(case when approve then 'association_verify' else 'association_reject' end, 'association', assoc::text, a.wilaya_code);
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('association-docs', 'association-docs', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
create policy "upload own association docs" on storage.objects for insert to authenticated
  with check (bucket_id = 'association-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "read association docs" on storage.objects for select to authenticated
  using (bucket_id = 'association-docs' and ((storage.foldername(name))[1] = (select auth.uid())::text
         or exists (select 1 from public.associations s where name = any (s.document_paths) and public.can_moderate(s.wilaya_code))));

-- ===================== in-kind donations (offers ⇄ needs) =====================
create table public.donation_items (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('offer', 'need')),
  category      text not null check (category in ('clothes', 'food', 'school', 'medical', 'furniture', 'transport', 'service', 'other')),
  title         text not null check (char_length(title) between 3 and 120),
  description   text not null default '' check (char_length(description) <= 1000),
  quantity      int not null default 1 check (quantity between 1 and 100000),
  unit          text not null default 'وحدة',
  wilaya_code   smallint not null references public.wilayas(code) on update cascade,
  baladiya_name text,
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  association_id uuid references public.associations(id) on delete set null,
  status        text not null default 'open' check (status in ('open', 'matched', 'fulfilled', 'cancelled')),
  expires_at    timestamptz not null default now() + interval '60 days',
  created_at    timestamptz not null default now()
);
create index donation_items_open_idx on public.donation_items (category, wilaya_code) where status = 'open';

create table public.donation_matches (
  id          uuid primary key default gen_random_uuid(),
  offer_id    uuid not null references public.donation_items(id) on delete cascade,
  need_id     uuid not null references public.donation_items(id) on delete cascade,
  quantity    int not null check (quantity > 0),
  status      text not null default 'proposed' check (status in ('proposed', 'accepted', 'picked_up', 'delivered', 'cancelled')),
  pickup_note text,
  proposed_by uuid not null references public.profiles(id),
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (offer_id, need_id)
);

alter table public.donation_items enable row level security;
alter table public.donation_matches enable row level security;
create policy "open items public" on public.donation_items for select to anon, authenticated using (status in ('open', 'matched'));
create policy "own items" on public.donation_items for select to authenticated using (owner_id = (select auth.uid()));
create policy "post item" on public.donation_items for insert to authenticated with check (owner_id = (select auth.uid()) and status = 'open');
create policy "update own item" on public.donation_items for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "parties see matches" on public.donation_matches for select to authenticated
  using (exists (select 1 from public.donation_items i where i.id in (offer_id, need_id) and i.owner_id = (select auth.uid())));
revoke insert, update, delete on public.donation_matches from authenticated;

-- Propose a match: either party (owner of offer or need) may propose.
create or replace function public.propose_match(offer uuid, need uuid, qty int, note text default null)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); o record; n record; mid uuid;
begin
  select * into o from public.donation_items where id = offer and kind = 'offer' and status = 'open';
  select * into n from public.donation_items where id = need and kind = 'need' and status = 'open';
  if o is null or n is null then raise exception 'item not open' using errcode = '22023'; end if;
  if uid not in (o.owner_id, n.owner_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if o.owner_id = n.owner_id then raise exception 'same owner' using errcode = '22023'; end if;
  if o.category <> n.category then raise exception 'category mismatch' using errcode = '22023'; end if;
  insert into public.donation_matches (offer_id, need_id, quantity, pickup_note, proposed_by)
  values (offer, need, greatest(1, least(qty, o.quantity, n.quantity)), note, uid) returning id into mid;
  insert into public.notifications (user_id, kind, title, body, link)
  values (case when uid = o.owner_id then n.owner_id else o.owner_id end, 'donation_match', 'اقتراح مطابقة تبرع عيني', o.title || ' ⇄ ' || n.title, '/donations');
  return mid;
end $$;

-- Advance a match. Contacts of the counterpart are revealed (returned) once accepted.
create or replace function public.update_match(match uuid, new_status text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); m record; o record; n record; other uuid; phone text; name text;
begin
  select * into m from public.donation_matches where id = match for update;
  if not found then raise exception 'not found' using errcode = 'P0002'; end if;
  select * into o from public.donation_items where id = m.offer_id;
  select * into n from public.donation_items where id = m.need_id;
  if uid not in (o.owner_id, n.owner_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if not (
       (m.status = 'proposed' and new_status in ('accepted', 'cancelled') and (new_status = 'cancelled' or uid <> m.proposed_by))
    or (m.status = 'accepted' and new_status in ('picked_up', 'cancelled'))
    or (m.status = 'picked_up' and new_status = 'delivered' and uid = n.owner_id)
  ) then raise exception 'transition not allowed' using errcode = '22023'; end if;
  update public.donation_matches set status = new_status, updated_at = now() where id = match;
  if new_status = 'accepted' then
    update public.donation_items set status = 'matched' where id in (m.offer_id, m.need_id);
  elsif new_status = 'delivered' then
    update public.donation_items set status = 'fulfilled' where id in (m.offer_id, m.need_id);
  elsif new_status = 'cancelled' then
    update public.donation_items set status = 'open' where id in (m.offer_id, m.need_id) and status = 'matched';
  end if;
  other := case when uid = o.owner_id then n.owner_id else o.owner_id end;
  if new_status in ('accepted', 'picked_up', 'delivered') then
    select p.phone into phone from public.profile_private p where p.user_id = other;
    select display_name into name from public.profiles where id = other;
  end if;
  return jsonb_build_object('status', new_status, 'counterpart_name', name, 'counterpart_phone', phone);
end $$;

-- ===================== campaigns =====================
create table public.campaigns (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null check (kind in ('ramadan', 'school', 'winter', 'environment', 'blood', 'other')),
  season         text not null check (season ~ '^[0-9]{4}-[a-z]+$'),   -- e.g. 2027-ramadan: dedupe scope
  title          text not null check (char_length(title) between 3 and 160),
  description    text not null default '',
  wilaya_code    smallint references public.wilayas(code) on update cascade,  -- null = national
  association_id uuid references public.associations(id) on delete set null,
  goal_units     int not null check (goal_units > 0),
  unit_label     text not null default 'قفة',
  starts_on      date not null,
  ends_on        date not null,
  status         text not null default 'active' check (status in ('draft', 'active', 'closed')),
  created_by     uuid not null references public.profiles(id),
  created_at     timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table public.campaign_contributions (
  id           bigint generated always as identity primary key,
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  units        int not null check (units > 0 and units <= 100000),
  note         text,
  recorded_by  uuid not null references public.profiles(id),
  created_at   timestamptz not null default now()
);

create table public.campaign_shifts (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null check (ends_at > starts_at),
  location     text not null,
  capacity     int not null check (capacity between 1 and 1000)
);
create table public.shift_signups (
  shift_id   uuid not null references public.campaign_shifts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (shift_id, user_id)
);

-- Privacy-preserving dedupe: only a keyed HMAC of the identifier (computed server-side with a secret
-- that never reaches the database) is stored, scoped to a season, with no name/address attached.
create table public.beneficiary_registrations (
  id                bigint generated always as identity primary key,
  season            text not null,
  beneficiary_hash  text not null check (beneficiary_hash ~ '^[0-9a-f]{64}$'),
  campaign_id       uuid not null references public.campaigns(id) on delete cascade,
  registered_by     uuid not null references public.profiles(id),
  registered_at     timestamptz not null default now(),
  unique (season, beneficiary_hash)
);

alter table public.campaigns enable row level security;
alter table public.campaign_contributions enable row level security;
alter table public.campaign_shifts enable row level security;
alter table public.shift_signups enable row level security;
alter table public.beneficiary_registrations enable row level security;

create or replace function public.can_manage_campaign(c uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.campaigns k where k.id = c and (
    k.created_by = auth.uid()
    or (k.association_id is not null and exists (select 1 from public.associations s where s.id = k.association_id and s.applicant_id = auth.uid()))
    or (k.wilaya_code is not null and public.can_moderate(k.wilaya_code))
    or public.is_ministry()));
$$;

create policy "campaigns public" on public.campaigns for select to anon, authenticated using (status <> 'draft' or created_by = (select auth.uid()));
create policy "orgs create campaigns" on public.campaigns for insert to authenticated
  with check (created_by = (select auth.uid()) and ((select public.has_role('association')) or (select public.is_staff())));
create policy "managers update campaigns" on public.campaigns for update to authenticated
  using ((select public.can_manage_campaign(id))) with check ((select public.can_manage_campaign(id)));
create policy "contributions public" on public.campaign_contributions for select to anon, authenticated using (true);
create policy "managers record contributions" on public.campaign_contributions for insert to authenticated
  with check (recorded_by = (select auth.uid()) and (select public.can_manage_campaign(campaign_id)));
create policy "shifts public" on public.campaign_shifts for select to anon, authenticated using (true);
create policy "managers add shifts" on public.campaign_shifts for insert to authenticated with check ((select public.can_manage_campaign(campaign_id)));
create policy "own signups" on public.shift_signups for select to authenticated using (user_id = (select auth.uid()));
create policy "managers see signups" on public.shift_signups for select to authenticated
  using (exists (select 1 from public.campaign_shifts s where s.id = shift_id and public.can_manage_campaign(s.campaign_id)));
create policy "sign up" on public.shift_signups for insert to authenticated with check (user_id = (select auth.uid()));
create policy "withdraw" on public.shift_signups for delete to authenticated using (user_id = (select auth.uid()));
-- beneficiary_registrations: no direct access; only register_beneficiary() and counts below.

create or replace function public.register_beneficiary(campaign uuid, hash text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := private.require_user(); k record; existing record;
begin
  select * into k from public.campaigns where id = campaign and status = 'active';
  if not found then raise exception 'campaign not active' using errcode = '22023'; end if;
  if not public.can_manage_campaign(campaign) then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into existing from public.beneficiary_registrations where season = k.season and beneficiary_hash = hash;
  if found then
    -- reveal only whether it is the same campaign, never which other organisation served the family
    return jsonb_build_object('status', case when existing.campaign_id = campaign then 'already_in_this_campaign' else 'already_served_this_season' end);
  end if;
  insert into public.beneficiary_registrations (season, beneficiary_hash, campaign_id, registered_by) values (k.season, hash, campaign, uid);
  return jsonb_build_object('status', 'registered');
end $$;

create or replace function public.campaign_progress(campaign uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'units', coalesce((select sum(units) from public.campaign_contributions where campaign_id = campaign), 0),
    'beneficiaries', (select count(*) from public.beneficiary_registrations where campaign_id = campaign),
    'shifts', (select count(*) from public.campaign_shifts where campaign_id = campaign),
    'volunteers', (select count(distinct su.user_id) from public.shift_signups su join public.campaign_shifts s on s.id = su.shift_id where s.campaign_id = campaign));
$$;

-- Retention: hashes are deleted 90 days after the campaign ends (run daily by pg_cron or /api/cron/daily).
create or replace function private.purge_old_beneficiary_hashes()
returns int language plpgsql volatile security definer set search_path = '' as $$
declare n int;
begin
  delete from public.beneficiary_registrations b using public.campaigns k
   where k.id = b.campaign_id and k.ends_on < current_date - 90;
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function public.rate_limit_hit(text, int, int) from authenticated;
revoke execute on function public.match_historical(text, text, text[], extensions.vector, int) from authenticated;
revoke execute on function public.match_active_alerts(text, text[], smallint, public.alert_category, extensions.vector, int, int) from authenticated;
grant execute on function public.verify_certificate(uuid), public.leaderboard(int, int), public.portal_stats(),
  public.impact_stats(int, timestamptz, timestamptz), public.campaign_progress(uuid) to anon;
grant execute on function public.has_role(public.app_role), public.is_ministry(), public.can_moderate(smallint),
  public.can_administer(smallint), public.is_staff(), public.is_club_lead(uuid), public.alert_wilaya(uuid),
  public.can_see_alert_contact(uuid), public.can_manage_campaign(uuid) to anon;
revoke execute on all functions in schema private from public, anon, authenticated;
