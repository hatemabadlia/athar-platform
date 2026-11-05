# Architecture

## Overview

```
                ┌───────────────────────── Browser (PWA, Arabic RTL) ─────────────────────────┐
                │ Server-rendered pages · client islands (map, scanner, forms) · service worker │
                └───────────────┬───────────────────────────────┬─────────────────────────────┘
                                │ server actions / RSC          │ Realtime (RLS-filtered)
                ┌───────────────▼───────────────┐               │
                │ Next.js 15 (Node runtime)     │               │
                │  app/actions/*  (user client) │               │
                │  app/api/intake  chat         │               │
                │  app/api/webhooks/*           │──service role─┤
                │  lib/pipeline  lib/sms        │               │
                └───────────────┬───────────────┘               │
                                ▼                               ▼
        ┌──────────────────────────── Supabase ─────────────────────────────┐
        │ Postgres: RLS on every table · column grants · security-definer   │
        │ RPCs · pg_trgm · pgvector · pg_cron · private schema (secrets)    │
        │ Auth (email OTP; phone OTP when SMS is configured) · Storage       │
        │ (private buckets + signed URLs) · Realtime                         │
        └───────────────────────────────────────────────────────────────────┘
External (optional, behind env vars): Anthropic Claude · Voyage embeddings · Cloudflare Turnstile ·
Telegram Bot API · WhatsApp Cloud API · Twilio SMS
```

## Authorisation model

- **Roles** live in `user_roles` (`volunteer`, `club_lead`, `association`, `moderator`, `djsl_admin`, `ministry_admin`). `moderator` and `djsl_admin` must have a `wilaya_code`. Roles can only be written through `grant_role` / `revoke_role` (and `create_club`, `review_association`). The browser never supplies a role.
- **Helpers** (`security definer`, empty `search_path`): `can_moderate(w)` covers the ministry everywhere and moderator/DJSL inside their wilaya. `can_administer(w)` covers the ministry and DJSL. `is_staff()` and `is_club_lead(c)` complete the set.
- **RLS** decides which rows a user can touch. **Column grants** decide which columns can be written directly. Status fields, ownership and review fields change only through RPCs that re-check authorisation and write `audit_log`.
- The **service-role key** is used only server-side: the intake pipeline, webhooks, SMS fan-out, the CSV import of the archive, and the rate limiter.
- **Grant matrix (summary):**

| Data | Public | Volunteer | Moderator (wilaya) | DJSL (wilaya) | Ministry |
|---|---|---|---|---|---|
| approved alerts | read | read | read/correct/decide | same | all wilayas |
| alert phone | – | after joining | read (audited) | read (audited) | read (audited) |
| profile phone / blood type | – | own only | – | – | – |
| intake queue | – | own submissions | own wilaya + unlocated | same | all |
| ai_runs | – | – | – | – | read |
| roles | – | own | read | grant moderator/club_lead/association in wilaya | grant all |
| audit log | – | – | – | own wilaya | all |

## Data model (main tables)

`wilayas`, `baladiyas`, `institutions` (reference) · `profiles`, `profile_private`, `user_roles`, `consents` · `intake_items`, `intake_contacts`, `alerts`, `alert_contacts`, `alert_sources`, `alert_volunteers`, `historical_posts`, `ai_runs` · `clubs`, `club_members`, `club_activities`, `attendance`, `trees`, `tree_likes`, `reports`, `certificates` · `shelters`, `crises`, `crisis_updates`, `sms_messages`, `crisis_confirmations`, `published_posts` · `audit_log`, `notifications`, `deletion_requests`, `rate_limits` · `blood_donors`, `blood_donations`, `associations`, `donation_items`, `donation_matches`, `campaigns`, `campaign_contributions`, `campaign_shifts`, `shift_signups`, `beneficiary_registrations`, `app_settings`.

Key relationships:
- An `intake_item` turns into one `alert`, or becomes an extra `alert_source` of an existing alert. Duplicates are linked, never deleted.
- `alert_volunteers` (joined → confirmed/no_show) and `attendance` (QR) feed the `point_events` view, which is the only source of points and hours.
- Resolved or recycled alerts are copied into `historical_posts`, the archive used to detect recycled posts. It only ever contains real platform history and archives imported by admins.

## Ingestion pipeline (`lib/pipeline`)

| Stage | Implementation |
|---|---|
| 1 Ingest | `intake_items` row; idempotent on `(channel, external_id)` |
| 2–4 Normalise, extract, classify | `claude.ts`: one `messages.parse` call with a Zod schema (structured output, effort `low`). Without a key, or on error: `heuristic.ts` (lexicon + keywords + regex), labelled "rule-based" everywhere |
| Anti-hallucination | `sanitize.ts`: drops phone numbers, blood types and wilayas that are not literally supported by the source text |
| 5 Recycled | SQL `match_historical`: exact `content_hash`, trigram similarity, pgvector cosine (when Voyage embeddings are configured), keyed phone-hash overlap, stale years in the text |
| 6 Duplicates | SQL `match_active_alerts` over the last 21 days, same wilaya and category. Very high similarity auto-links the post as an extra source; otherwise the merge is suggested to the moderator |
| 7 Score | `scoring.ts`: additive and explainable (every factor has a label and a delta). It is a triage aid, never proof |
| Persist | `alerts` (always `pending`), `alert_contacts` (phone + HMAC), `alert_sources`; `ai_runs` row per model call (input hash, masked output, tokens, cost, latency) |

## Auth

- Email OTP (6-digit code, bilingual template in `supabase/templates`). Magic-link fallback via `/auth/callback`.
- Phone OTP needs Supabase Auth SMS configuration (Twilio, MessageBird, Vonage or Textlocal). Not enabled.
- The session cookie is refreshed in `middleware.ts`. Authorisation is enforced in the database, not in middleware.

## Integrations

| Integration | Code | Verified here? |
|---|---|---|
| Claude | `lib/pipeline/claude.ts`, `app/api/chat` | no key in this environment: UNVERIFIED |
| Voyage embeddings | `lib/pipeline/embeddings.ts` | UNVERIFIED |
| Turnstile | `lib/server/guards.ts`, `/submit` | UNVERIFIED (network blocked) |
| Telegram | `app/api/webhooks/telegram` | secret-header check implemented; UNVERIFIED against Telegram |
| WhatsApp Cloud API | `app/api/webhooks/whatsapp` | verify handshake + HMAC implemented; UNVERIFIED against Meta |
| SMS | `lib/sms.ts`, `app/api/webhooks/sms` | console provider tested; Twilio UNVERIFIED |

## Offline / PWA

`public/sw.js` serves:
- static assets cache-first;
- map tiles from a bounded cache;
- navigations network-first, falling back to cache and then `/offline`.

HTML is cached only when the middleware marks the response `x-athar-public: 1` (anonymous), so personal pages never land in the cache. Private paths and `/api` are never intercepted. Public submissions made offline go to a local outbox (`lib/outbox.ts`) and are clearly marked "not sent yet" until they are flushed.

## Scheduled jobs

`private.daily_maintenance()` runs through pg_cron at 03:17 UTC. It purges accounts whose deletion grace period has ended, beneficiary hashes 90 days after a campaign ends, and expired rate-limit windows, and it expires approved alerts that are past their deadline. It writes an `audit_log` row each run.
