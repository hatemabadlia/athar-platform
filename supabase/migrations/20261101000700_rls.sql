-- Row Level Security for every table in public.
-- Principle: deny by default. Privileged writes go through security-definer RPCs (next migration)
-- or the server using the service role (webhooks, AI pipeline), never through the browser.

-- extra helpers ------------------------------------------------------------
create or replace function public.is_club_lead(c uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.club_members m
                 where m.club_id = c and m.user_id = auth.uid() and m.role = 'lead');
$$;

create or replace function public.alert_wilaya(a uuid)
returns smallint language sql stable security definer set search_path = '' as $$
  select wilaya_code from public.alerts where id = a;
$$;

-- Who may see an alert's contact phone: owner, moderators of its wilaya, volunteers who joined.
create or replace function public.can_see_alert_contact(a uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.alerts al
    where al.id = a and (
      al.owner_id = auth.uid()
      or public.can_moderate(al.wilaya_code)
      or (al.wilaya_code is null and public.is_ministry())
      or (al.status = 'approved' and exists (
            select 1 from public.alert_volunteers v
            where v.alert_id = al.id and v.user_id = auth.uid() and v.status in ('joined', 'confirmed')))
    )
  );
$$;

-- enable RLS everywhere ----------------------------------------------------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- reference data: readable by everyone -----------------------------------
create policy "reference readable" on public.wilayas for select to anon, authenticated using (true);
create policy "reference readable" on public.baladiyas for select to anon, authenticated using (true);
create policy "reference readable" on public.categories for select to anon, authenticated using (true);
create policy "reference readable" on public.blood_compatibility for select to anon, authenticated using (true);
create policy "ministry edits wilayas" on public.wilayas for update to authenticated
  using ((select public.is_ministry())) with check ((select public.is_ministry()));
create policy "admins import baladiyas" on public.baladiyas for insert to authenticated
  with check ((select public.can_administer(wilaya_code)));
create policy "admins edit baladiyas" on public.baladiyas for update to authenticated
  using ((select public.can_administer(wilaya_code))) with check ((select public.can_administer(wilaya_code)));

create policy "institutions readable" on public.institutions for select to anon, authenticated using (true);
create policy "admins insert institutions" on public.institutions for insert to authenticated
  with check ((select public.can_administer(wilaya_code)));
create policy "admins update institutions" on public.institutions for update to authenticated
  using ((select public.can_administer(wilaya_code))) with check ((select public.can_administer(wilaya_code)));
create policy "admins delete institutions" on public.institutions for delete to authenticated
  using ((select public.can_administer(wilaya_code)));

-- identity -----------------------------------------------------------------
create policy "own profile" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "staff read profiles in scope" on public.profiles for select to authenticated
  using ((select public.can_moderate(wilaya_code)));
create policy "update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Sensitive: only the person themself. Server jobs (SMS, donor matching) use the service role.
create policy "own private data" on public.profile_private for select to authenticated
  using (user_id = (select auth.uid()));
create policy "update own private data" on public.profile_private for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own roles" on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()));
create policy "staff read roles" on public.user_roles for select to authenticated
  using ((select public.is_staff()));

create policy "own consents" on public.consents for select to authenticated
  using (user_id = (select auth.uid()));
create policy "give consent" on public.consents for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "revoke consent" on public.consents for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- intake -------------------------------------------------------------------
create policy "submitter reads own intake" on public.intake_items for select to authenticated
  using (submitter_id = (select auth.uid()));
create policy "staff read intake" on public.intake_items for select to authenticated
  using ((select public.is_staff()));
create policy "staff update intake" on public.intake_items for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff read intake contacts" on public.intake_contacts for select to authenticated
  using ((select public.is_staff()));

-- alerts -------------------------------------------------------------------
create policy "public alerts" on public.alerts for select to anon, authenticated
  using (status in ('approved', 'resolved'));
create policy "owner reads own alerts" on public.alerts for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "moderators read alerts in scope" on public.alerts for select to authenticated
  using ((select public.can_moderate(wilaya_code)) or (wilaya_code is null and (select public.is_staff())));
create policy "moderators correct alerts in scope" on public.alerts for update to authenticated
  using ((select public.can_moderate(wilaya_code)) or (wilaya_code is null and (select public.is_staff())))
  with check ((select public.can_moderate(wilaya_code)) or (wilaya_code is null and (select public.is_ministry())));

create policy "contact visible to authorised" on public.alert_contacts for select to authenticated
  using ((select public.can_see_alert_contact(alert_id)));

create policy "sources for owner and staff" on public.alert_sources for select to authenticated
  using (exists (select 1 from public.alerts a where a.id = alert_id
                 and (a.owner_id = (select auth.uid()) or public.can_moderate(a.wilaya_code)
                      or (a.wilaya_code is null and public.is_staff()))));

create policy "own participation" on public.alert_volunteers for select to authenticated
  using (user_id = (select auth.uid()));
create policy "owner and staff see participants" on public.alert_volunteers for select to authenticated
  using (exists (select 1 from public.alerts a where a.id = alert_id
                 and (a.owner_id = (select auth.uid()) or public.can_moderate(a.wilaya_code))));

create policy "staff read archive" on public.historical_posts for select to authenticated
  using ((select public.is_staff()));
create policy "staff read ai runs" on public.ai_runs for select to authenticated
  using ((select public.is_staff()));

-- clubs --------------------------------------------------------------------
create policy "clubs readable" on public.clubs for select to anon, authenticated
  using (status = 'approved' or created_by = (select auth.uid()) or (select public.can_moderate(wilaya_code)));
create policy "lead or admin updates club" on public.clubs for update to authenticated
  using ((select public.is_club_lead(id)) or (select public.can_administer(wilaya_code)))
  with check ((select public.is_club_lead(id)) or (select public.can_administer(wilaya_code)));

create policy "members see own membership" on public.club_members for select to authenticated
  using (user_id = (select auth.uid()));
create policy "leads and staff see members" on public.club_members for select to authenticated
  using ((select public.is_club_lead(club_id))
         or exists (select 1 from public.clubs c where c.id = club_id and public.can_moderate(c.wilaya_code)));
create policy "join club as member" on public.club_members for insert to authenticated
  with check (user_id = (select auth.uid()) and role = 'member'
              and exists (select 1 from public.clubs c where c.id = club_id and c.status = 'approved'));
create policy "leave club" on public.club_members for delete to authenticated
  using (user_id = (select auth.uid()) and role = 'member');

create policy "activities readable" on public.club_activities for select to anon, authenticated using (true);
create policy "leads create activities" on public.club_activities for insert to authenticated
  with check (created_by = (select auth.uid())
              and ((club_id is not null and public.is_club_lead(club_id)) or public.can_moderate(wilaya_code)));
create policy "leads update activities" on public.club_activities for update to authenticated
  using ((club_id is not null and (select public.is_club_lead(club_id))) or (select public.can_moderate(wilaya_code)))
  with check ((club_id is not null and (select public.is_club_lead(club_id))) or (select public.can_moderate(wilaya_code)));

create policy "own attendance" on public.attendance for select to authenticated
  using (user_id = (select auth.uid()));
create policy "leads and staff see attendance" on public.attendance for select to authenticated
  using (exists (select 1 from public.club_activities ca where ca.id = activity_id
                 and ((ca.club_id is not null and public.is_club_lead(ca.club_id)) or public.can_moderate(ca.wilaya_code))));

-- trees --------------------------------------------------------------------
create policy "approved trees public" on public.trees for select to anon, authenticated
  using (status = 'approved');
create policy "own trees" on public.trees for select to authenticated
  using (user_id = (select auth.uid()));
create policy "moderators see trees in scope" on public.trees for select to authenticated
  using ((select public.can_moderate(wilaya_code)));
create policy "plant a tree" on public.trees for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending' and reviewed_by is null);
create policy "delete own pending tree" on public.trees for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'pending');

create policy "likes readable" on public.tree_likes for select to anon, authenticated using (true);
create policy "like" on public.tree_likes for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.trees t where t.id = tree_id and t.status = 'approved'));
create policy "unlike" on public.tree_likes for delete to authenticated
  using (user_id = (select auth.uid()));

-- reports ------------------------------------------------------------------
create policy "approved reports public" on public.reports for select to anon, authenticated
  using (status = 'approved');
create policy "authors see own reports" on public.reports for select to authenticated
  using (author_id = (select auth.uid()));
create policy "staff see reports" on public.reports for select to authenticated
  using ((alert_id is not null and (select public.can_moderate(public.alert_wilaya(alert_id))))
         or (activity_id is not null and exists (select 1 from public.club_activities ca
              where ca.id = activity_id and public.can_moderate(ca.wilaya_code))));

-- certificates: holder only; public verification uses verify_certificate() --
create policy "own certificates" on public.certificates for select to authenticated
  using (user_id = (select auth.uid()));

-- crisis -------------------------------------------------------------------
create policy "shelters readable" on public.shelters for select to anon, authenticated using (true);
create policy "admins insert shelters" on public.shelters for insert to authenticated
  with check ((select public.can_administer(wilaya_code)));
create policy "admins update shelters" on public.shelters for update to authenticated
  using ((select public.can_administer(wilaya_code))) with check ((select public.can_administer(wilaya_code)));
create policy "admins delete shelters" on public.shelters for delete to authenticated
  using ((select public.can_administer(wilaya_code)));

create policy "crises readable" on public.crises for select to anon, authenticated using (true);
create policy "crisis updates readable" on public.crisis_updates for select to anon, authenticated using (true);
create policy "admins post crisis updates" on public.crisis_updates for insert to authenticated
  with check (created_by = (select auth.uid())
              and exists (select 1 from public.crises c where c.id = crisis_id and public.can_administer(c.wilaya_code)));

create policy "admins read sms" on public.sms_messages for select to authenticated
  using (exists (select 1 from public.crises c where c.id = crisis_id and public.can_administer(c.wilaya_code)));

create policy "own crisis confirmation" on public.crisis_confirmations for select to authenticated
  using (user_id = (select auth.uid()));
create policy "admins read confirmations" on public.crisis_confirmations for select to authenticated
  using (exists (select 1 from public.crises c where c.id = crisis_id and public.can_administer(c.wilaya_code)));

-- publishing, audit, notifications, deletion -------------------------------
create policy "staff read posts" on public.published_posts for select to authenticated
  using ((select public.can_moderate(public.alert_wilaya(alert_id))));

create policy "ministry reads audit" on public.audit_log for select to authenticated
  using ((select public.is_ministry()));
create policy "djsl reads wilaya audit" on public.audit_log for select to authenticated
  using (wilaya_code is not null and (select public.can_administer(wilaya_code)));

create policy "own notifications" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "mark notifications read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own deletion requests" on public.deletion_requests for select to authenticated
  using (user_id = (select auth.uid()));

-- rate_limits: no policies → only the service role can touch it.

-- Public, non-sensitive projections ----------------------------------------
-- Display names only (no phone, no blood type, no baladiya).
create view public.public_profiles with (security_barrier = true) as
  select id, display_name, wilaya_code from public.profiles where deleted_at is null;

create view public.club_stats with (security_barrier = true) as
  -- points = 20 per verified check-in at the club's activities (same rule as point_events)
  select c.id as club_id,
         (select count(*) from public.club_members m where m.club_id = c.id) as members,
         (select count(*) from public.club_activities ca
           where ca.club_id = c.id and ca.starts_at > now() - interval '30 days') as activities_30d,
         (select count(*) * 20 from public.attendance at
           join public.club_activities ca on ca.id = at.activity_id where ca.club_id = c.id) as points
  from public.clubs c
  where c.status = 'approved';

create view public.alert_participation with (security_barrier = true) as
  select alert_id,
         count(*) filter (where status in ('joined', 'confirmed')) as joined,
         count(*) filter (where status = 'confirmed') as confirmed
  from public.alert_volunteers group by alert_id;

create view public.tree_like_counts with (security_barrier = true) as
  select tree_id, count(*) as likes from public.tree_likes group by tree_id;

grant select on public.public_profiles, public.club_stats, public.alert_participation, public.tree_like_counts
  to anon, authenticated;
