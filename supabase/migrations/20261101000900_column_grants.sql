-- Column-level write privileges. RLS decides WHICH rows; these decide WHICH columns.
-- Status columns, ownership and review fields are only changed by security-definer RPCs.

revoke insert, update, delete on all tables in schema public from anon;
revoke update on public.alerts from authenticated;
grant update (title, summary, category, urgency, wilaya_code, baladiya_id, baladiya_name, institution_name,
              lat, lng, location_precision, blood_type, quantity, deadline, contact_name, volunteers_needed,
              needs_review_reasons)
  on public.alerts to authenticated;

revoke update on public.profiles from authenticated;
grant update (display_name, wilaya_code, baladiya_id, skills, availability, locale, onboarded)
  on public.profiles to authenticated;

revoke update on public.profile_private from authenticated;
grant update (phone, blood_type, sms_opt_in) on public.profile_private to authenticated;

revoke update on public.clubs from authenticated;
grant update (name, description, institution_id, institution_name, baladiya_id, focus) on public.clubs to authenticated;

revoke update on public.intake_items from authenticated;
grant update (status, error) on public.intake_items to authenticated;

revoke update on public.consents from authenticated;
grant update (revoked_at) on public.consents to authenticated;

revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

revoke update on public.club_activities from authenticated;
grant update (title, description, location, starts_at, ends_at, status) on public.club_activities to authenticated;

revoke update on public.wilayas from authenticated;
grant update (name_ar, name_fr, lat, lng, verified, source) on public.wilayas to authenticated;

-- tables written only through RPCs or the service role
revoke insert, update, delete on public.alert_volunteers, public.attendance, public.certificates, public.reports,
  public.user_roles, public.audit_log, public.crises, public.sms_messages, public.crisis_confirmations,
  public.published_posts, public.historical_posts, public.ai_runs, public.intake_contacts, public.alert_contacts,
  public.alert_sources, public.deletion_requests, public.rate_limits, public.categories, public.blood_compatibility
  from authenticated;
revoke insert, delete on public.alerts, public.intake_items, public.profiles, public.profile_private from authenticated;
