# إيثار — Athar

A volunteering platform for Algeria. It brings together people who need help, volunteers, blood donors, clubs, associations and local authorities. Every alert is analysed (AI when configured, rules otherwise), checked against recycled and duplicate posts, and **approved by a human moderator** before anyone sees it.

> Status: a working pilot candidate on a local Supabase stack, with tests. It is **not yet deployed**, and several integrations are waiting for credentials (see [`docs/NEEDS_FROM_HATEM.md`](docs/NEEDS_FROM_HATEM.md)). The honest state of each feature is in [`docs/MORNING_REPORT.md`](docs/MORNING_REPORT.md).

## Features

| Area | What it does |
|---|---|
| Public map `/` | Approved alerts only. Locations are approximate (wilaya level), with no phone numbers. Matches are suggested with reasons. Updates in real time. |
| Submission `/submit` | Public form with consent, rate limiting and Cloudflare Turnstile. An offline outbox keeps drafts until the connection returns. |
| Intake | Web form, Telegram bot webhook, WhatsApp Business Cloud webhook (signature-checked), moderator paste. No scraping of social networks. |
| 7-stage pipeline `/ingest` | Ingest → Darija→MSA → structured extraction (Claude structured output) → classification → recycled-post detection (trigram, pgvector, content hash, keyed phone hash, stale dates) → duplicate detection → explainable credibility score. Falls back to labelled rule-based analysis. Every decision is logged to `ai_runs`. |
| Moderation `/admin` | Wilaya-scoped queue: correct fields, approve, reject, merge, resolve, reveal contact (audited), confirm volunteers, notify compatible blood donors. Also trees, reports, associations, crisis, shelters, forecasts, roles, CSV imports, audit log. |
| Attendance | Signed, 5-minute, single-use QR tokens checked in Postgres. Camera scanner (`html5-qrcode`) with a paste fallback. |
| Points & certificates | Points come only from confirmed actions. Certificates carry an HMAC signature and can be checked by anyone at `/verify/[id]`. |
| Crisis mode | Declared by DJSL or the ministry. Real shelters only. SMS goes through the `SmsProvider` abstraction (console in development, Twilio adapter), with inbound "reply 1" confirmations. |
| Blood donors `/donors` | Consented registry, red-cell compatibility matrix, notification without exposing identities, donation log. Clinical eligibility is left to blood centres. |
| In-kind `/donations` | Offers ⇄ needs matching. Contact details are shared only after acceptance. Fulfilment is tracked. |
| Associations `/associations` | Application with approval number and documents. DJSL verification grants the verified badge and role. |
| Campaigns `/campaigns` | Ramadan, back-to-school, winter, and more. Goals, progress, shifts, and cross-organisation beneficiary dedupe using server-side HMAC. |
| Trees `/trees` | Photos in private storage with EXIF stripped. Location and date signals go to moderators. |
| Impact `/impact` | National or per-wilaya statistics computed from real rows, with CSV and print/PDF export. |
| Privacy | Consent records, `/privacy`, data export (JSON), account deletion with a 14-day grace period, RLS on every table. |
| PWA | Installable. The service worker never caches private pages or API responses. Offline shell. |

## Requirements

- Node 22+, npm
- Docker, for local Supabase
- (optional) API keys listed in `.env.example`

## Run locally

Once dependencies and `.env.local` are set up, it takes three commands:

```bash
npx supabase start -x studio,imgproxy,vector,logflare,supavisor,postgres-meta
npm run build
npm start
```

First-time setup:

```bash
npm ci
npx supabase start -x studio,imgproxy,vector,logflare,supavisor,postgres-meta
npx supabase status -o env      # copy API_URL / ANON_KEY / SERVICE_ROLE_KEY into .env.local
cp .env.example .env.local      # then fill the values; generate ATHAR_HMAC_SECRET with: openssl rand -hex 32
```

For local `npm start` without Turnstile keys, set `ATHAR_DEV_ALLOW_NO_CAPTCHA=true` (ignored in production). In development (`npm run dev`) the bypass is automatic. Login emails go to Mailpit at http://127.0.0.1:54324.

Create the first national administrator (once, on your machine):

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "insert into public.user_roles (user_id, role) select id, 'ministry_admin' from auth.users where email = 'you@example.dz';"
```

That person then grants every other role from `/admin → الأدوار`.

> If Docker image pulls from `public.ecr.aws` are blocked on your network, run `export SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io` first.

## Tests

| Command | What |
|---|---|
| `npm test` | Unit tests (Vitest): pipeline, extraction, scoring, matching, blood compatibility, badges, forecasts, CSV, beneficiary IDs |
| `npx supabase test db` | pgTAP: RLS, role scopes, RPC authorisation, QR replay/tamper, certificates, dedupe privacy |
| `npm run test:e2e` | Playwright against a running app on :3000 and a fresh `npx supabase db reset` |
| `npm run lint` · `npm run typecheck` · `npm run build` | Static checks |

## Architecture

```
Browser (Next.js App Router, RTL Arabic)
   │  server components + server actions (user's session → RLS)
   ▼
Next.js server ── /api/intake, /api/chat, /api/webhooks/{telegram,whatsapp,sms}
   │   ├─ lib/pipeline: Claude (structured output) | rule-based fallback → sanitiser → SQL matching → scoring
   │   ├─ lib/sms: SmsProvider (console | Twilio)
   │   └─ service-role client only for system work (webhooks, pipeline, SMS fan-out)
   ▼
Supabase: Postgres (RLS everywhere, security-definer RPCs, pgvector, pg_trgm, pg_cron) · Auth · Storage · Realtime
```

Details are in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Documentation

- [`docs/AUDIT.md`](docs/AUDIT.md): the original prototype audit
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): system, data model, pipeline, auth
- [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md): reference data, sources, verification status
- [`docs/PRIVACY.md`](docs/PRIVACY.md): personal data, access, retention, deletion
- [`docs/DECISIONS.md`](docs/DECISIONS.md): architecture decisions
- [`docs/DEMO.md`](docs/DEMO.md): how to create demo content through the UI
- [`docs/NEEDS_FROM_HATEM.md`](docs/NEEDS_FROM_HATEM.md): credentials and external actions
- [`docs/BLOCKERS.md`](docs/BLOCKERS.md), [`docs/PROGRESS.md`](docs/PROGRESS.md), [`docs/MORNING_REPORT.md`](docs/MORNING_REPORT.md)

## Deployment (not done)

The intended setup is Vercel or another Node host for Next.js, plus a Supabase cloud project:

1. Create the Supabase project, run `npx supabase link` and then `npx supabase db push`. **Review the migrations first. Never run this against a database that holds data without a backup.**
2. Set every variable from `.env.example` in the host's secret store. Set `ATHAR_DEV_ALLOW_NO_CAPTCHA=false` and configure Turnstile.
3. In Supabase Auth, set the site URL, redirect URLs, the email templates in `supabase/templates/`, and SMTP. Phone OTP needs an SMS provider.
4. Register the webhooks (Telegram `setWebhook`, Meta app webhook, SMS inbound URL).
