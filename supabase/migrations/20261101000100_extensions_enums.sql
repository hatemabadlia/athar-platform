-- Athar: extensions and enumerated types.
-- Every enum here is a product definition, not data.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists vector with schema extensions;

create type public.app_role as enum (
  'volunteer', 'club_lead', 'association', 'moderator', 'djsl_admin', 'ministry_admin'
);

create type public.alert_category as enum (
  'blood', 'relief', 'cleanup', 'orphans', 'medical', 'education'
);

create type public.urgency as enum ('critical', 'medium', 'normal');

-- pending: waiting for a moderator; approved: public; rejected; resolved: closed with outcome;
-- recycled: matched an old post (kept as evidence, not public); merged: folded into another alert.
create type public.alert_status as enum (
  'pending', 'approved', 'rejected', 'resolved', 'recycled', 'merged', 'expired'
);

create type public.ai_verdict as enum ('fresh', 'recycled', 'duplicate', 'low-confidence');

create type public.intake_channel as enum (
  'web_form', 'telegram', 'whatsapp', 'rss', 'moderator_paste', 'api'
);

create type public.intake_status as enum (
  'queued', 'processing', 'processed', 'failed', 'rejected', 'spam'
);

create type public.volunteer_status as enum ('joined', 'confirmed', 'no_show', 'cancelled');

create type public.review_status as enum ('pending', 'approved', 'rejected');

create type public.crisis_type as enum ('flood', 'earthquake', 'fire', 'cold', 'other');

create type public.institution_kind as enum (
  'youth_house', 'youth_center', 'hospital', 'blood_center', 'school', 'civil_protection', 'other'
);

create type public.blood_type as enum ('O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+');

create type public.availability as enum ('weekends', 'evenings', 'anytime');
