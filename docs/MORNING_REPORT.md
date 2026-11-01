# Morning report — Athar (إيثار)

_Session date: 2026-11-01 · Branch `claude/clever-edison-e06oin` · Not deployed · Not merged into `main`_

## 1. Executive summary

Athar went from a client-only prototype (mock data, `localStorage`, simulated AI, SMS, QR and statistics) to a working application on Supabase:

- **Every displayed number, alert, club, tree, shelter and statistic now comes from database rows**, and every page works on an empty database with empty states.
- **Security lives in Postgres**: RLS on every table, column-level grants, security-definer RPCs that re-check roles and wilaya scope, and an audit log. 69 automated database tests guard it.
- **The 7-stage pipeline is real.** It uses Claude structured output when a key is present and a labelled rule-based fallback otherwise, plus an anti-hallucination sanitiser, SQL-based recycled/duplicate detection and an explainable credibility score.
- **The core volunteer loop is tested end to end in a real browser**: submit, analyse, moderate, publish, join, QR check-in by someone else, points exactly once, impact page.
- **New modules**: blood donor network, in-kind offers ⇄ needs, verified associations, seasonal campaigns with privacy-preserving beneficiary dedupe, PWA/offline outbox, public impact page with exports.

It is **not** production-ready yet. The main gaps are credentials and real-world verification of external integrations, the official wilayas 59–69 and commune data, French i18n, and a legal/privacy review.

## 2. What is implemented and tested

Labels: COMPLETE (implemented and tested here) · PARTIAL · BLOCKED · UNVERIFIED (implemented, not testable here) · NOT STARTED

| Feature | Status | Evidence |
|---|---|---|
| Schema, RLS, roles, wilaya scoping | COMPLETE | 17 migrations; pgTAP 69/69 |
| Mock data / localStorage removed | COMPLETE | `lib/mock-data.ts`, `lib/store.tsx` deleted; e2e "empty database" test |
| Email OTP login | COMPLETE (local) | e2e logs in 6 accounts through Mailpit |
| Phone OTP | BLOCKED | needs an SMS provider in Supabase Auth |
| Public submission (consent, rate limit, Turnstile) | COMPLETE / Turnstile UNVERIFIED | e2e; Turnstile host unreachable here |
| Pipeline, rule-based path | COMPLETE | unit tests + e2e (category, blood type, wilaya extracted; `ai_runs` row) |
| Pipeline, Claude path | UNVERIFIED | code follows the SDK docs (`messages.parse` + Zod); no API key here |
| Recycled / duplicate detection (trigram + hash + keyed phone) | COMPLETE | unit tests (thresholds) + SQL functions |
| Semantic embeddings (Voyage) | UNVERIFIED | needs `VOYAGE_API_KEY` |
| Telegram / WhatsApp webhooks | UNVERIFIED | signature checks implemented; no credentials/network |
| Moderation queue (correct, approve, reject, merge, resolve, audited contact reveal, volunteer confirmation) | COMPLETE | e2e approve path; pgTAP transitions/scopes |
| Live intake monitor (Realtime) | COMPLETE (local) | wired to `intake_items`; scoped by wilaya |
| Volunteer matching with reasons | COMPLETE | unit tests (incl. blood compatibility) |
| QR attendance (signed, 5 min, single use, camera + paste) | COMPLETE | pgTAP (replay, tamper, self check-in) + e2e; camera path UNVERIFIED (headless) |
| Points / badges from confirmed actions | COMPLETE | pgTAP + e2e "20 points exactly once" |
| Certificates + `/verify` | COMPLETE | pgTAP (valid and tampered); PDF via browser print |
| Trees (private storage, EXIF strip, signals, moderation) | COMPLETE (local) / camera upload UNVERIFIED | RLS tests; manual flow not in e2e |
| Crisis mode + shelters + SMS (console) | PARTIAL | console provider records rows; Twilio adapter UNVERIFIED; inbound "reply 1" verified by code only |
| After-action reports | COMPLETE (local) | submit/review RPCs with authorisation |
| Forecasts from own history | COMPLETE | unit tests; shows "not enough historical data" on new installs |
| External signals (e.g. weather) | NOT STARTED | no verified public source connected |
| Chatbot with DB tools | PARTIAL | rules fallback queries the DB (tested manually through the API); Claude tool loop UNVERIFIED |
| Blood donor network | COMPLETE (local) | pgTAP: compatible notification, no identities, throttle |
| In-kind matching | COMPLETE (local) | pgTAP: contact only after accept; unit tests |
| Associations directory + verification | COMPLETE | pgTAP + e2e |
| Campaigns + beneficiary dedupe | COMPLETE | pgTAP (cross-org, no leak) + e2e |
| PWA / offline | PARTIAL | manifest, service worker, outbox; installability and offline replay not tested on a device |
| Impact page + CSV/print | COMPLETE (local) | e2e visits; CSV route |
| Privacy: consent, export, deletion, retention jobs | COMPLETE (local) | RPCs + pg_cron job scheduled and run once manually |
| Security headers / CSP | COMPLETE | e2e header test |
| French i18n | PARTIAL | Locale switch (cookie + Accept-Language), `lang`/`dir` switch, FR for shell, map, alerts, help flow, submit, login, chatbot (incl. rules-mode French replies), privacy, offline, errors; other pages stay Arabic/RTL with a French notice. e2e `i18n.spec` |
| Branded auto-publishing (FB/IG/X) | NOT STARTED | fake version removed |
| Darija voice notes (ASR) | BLOCKED | needs a speech-to-text provider |
| CI (GitHub Actions) | UNVERIFIED | workflow written; can't run here |

## 3. Remaining work (most important first)

1. Verify the Claude path with a real key (pipeline + chatbot), and tune prompts on real Darija posts.
2. Official data: wilayas 59–69 numbering (JO n° 40, 2026), commune list, institution lists (CSV import is ready).
3. Finish French translation of the remaining pages (clubs, trees, profile, campaigns, donations, donors, associations, impact, admin) using `lib/i18n/dict.ts`.
4. Deployment: Supabase cloud plus host, SMTP, Turnstile, domain; then verify the Telegram/WhatsApp/SMS webhooks live.
5. Legal review and ANPDP declaration; retention limit for raw intake text.
6. Soft `router.refresh()` after server actions was intermittently dropped (stale lists). Fixed with full navigation/reload for campaign and club creation and certificate issue; other admin flows still use soft refresh — watch for stale views.
7. Accessibility audit with a screen reader (keyboard and labels were improved, but no full audit yet); Lighthouse run (the network blocks tiles and fonts here, so scores would be misleading).
8. Branded publishing with admin approval, if still wanted.

## 4. Infrastructure

- **Supabase**: local only (Docker). No remote project was created, linked or modified. 17 migrations in `supabase/migrations/`; they apply cleanly on a fresh database (`npx supabase db reset`).
- **Extensions**: pgcrypto, pg_trgm, vector, pg_cron, plus pgtap for tests.
- **Storage buckets** (all private): `tree-photos`, `report-evidence`, `association-docs`.
- **Scheduled job**: `athar-daily-maintenance` at 03:17 UTC.
- **Integrations**: all optional, behind env vars, with "not configured" states visible in `/admin → السجل والذكاء الاصطناعي`.

## 5. Credentials required

See [`docs/NEEDS_FROM_HATEM.md`](NEEDS_FROM_HATEM.md) for exact steps. In short:
- **Claude key**.
- **Supabase cloud project**: tell me whether it holds data.
- **Domain**.
- **Turnstile keys**.
- **SMTP**.
- **SMS provider**: Twilio or the name of an Algerian gateway.
- **Telegram bot token + secret**.
- **WhatsApp app secret + verify token**.
- **Voyage key** (optional).
- **A speech-to-text choice** (optional).
- **The first ministry-admin email**.

## 6. Testing results (this session, final run)

| Command | Result |
|---|---|
| `npx tsc --noEmit` | pass |
| `npx eslint .` | pass (0 warnings) |
| `npx vitest run` | **42 passed**, 0 failed |
| `npx supabase test db` | **69 passed** (3 files), 0 failed |
| `npm run build` | pass |
| `npx playwright test` (after a fresh `supabase db reset`, app on :3000) | **7 passed**, 5 consecutive runs |
| GitHub Actions CI | not run (UNVERIFIED) |
| Claude / Voyage / Telegram / WhatsApp / Twilio / Turnstile live calls | not run (no credentials or network) |

Bugs found by the tests and fixed: Arabic keyword matching inside other words ("دم" inside "القدم"); a nested interactive element in the alert card; `smallint` RPC parameters not callable with integers; a `club_stats` join that double-counted; an ambiguous PL/pgSQL column (`note`); a captcha bypass that worked in production builds; a campaign navigation race and a stuck disabled button.

## 7. Security findings

Fixed in this session:
- The admin console and `/ingest` were open to everyone.
- Phone numbers were shown publicly.
- Volunteers could self-confirm attendance.
- Points were client-editable.
- Certificates couldn't be verified.
- Every moderator could read the national intake queue (now wilaya-scoped).
- AI logs contained phone numbers (now masked; logs are ministry-only).

Remaining risks:
- CSP allows `'unsafe-inline'` scripts (Next.js bootstrap without nonces). Moving to nonce-based CSP is recommended.
- Unlocated intake items (no wilaya detected) are visible to all staff.
- Rate limiting uses Postgres fixed windows. Fine for a pilot; add an edge or WAF layer for production.
- `ATHAR_HMAC_SECRET` is a long-lived secret: losing it breaks phone and beneficiary matching, and leaking it weakens the hashing. Store it in a secret manager.
- The QR and certificate HMAC secrets are generated per database in `private.app_secrets`. Back them up with the database.
- No independent penetration test has been done. Nothing here claims the application is "secure" or legally compliant.

## 8. Running the application

After `npm ci` and filling `.env.local` from `.env.example` (local values come from `npx supabase status -o env`):

```bash
npx supabase start -x studio,imgproxy,vector,logflare,supavisor,postgres-meta
npm run build
npm start
```

Then open http://localhost:3000. Login codes arrive in Mailpit at http://127.0.0.1:54324. Make yourself ministry admin with the SQL in the README. For `npm start` without Turnstile keys, set `ATHAR_DEV_ALLOW_NO_CAPTCHA=true` in `.env.local`.

## 9. Git status

- Branch: `claude/clever-edison-e06oin` (pushed to origin after each milestone; no force-push; `main` untouched).
- The last commit and push status are in the final chat message of this session.
- Uncommitted changes: none intended.

## 10. Next priorities (ranked)

1. Add the Claude key and validate the pipeline on 30–50 real Algerian posts (precision of extraction and recycled detection).
2. Get the official wilaya 59–69 numbering and commune list, then import them.
3. Create the Supabase cloud project and deploy to a staging domain with Turnstile and SMTP.
4. Run the first live intake channel (Telegram is the easiest).
5. Finish French translation.
6. Pilot with one DJSL (one wilaya), one association and two clubs, following `docs/DEMO.md` with real users.
7. Legal review and ANPDP declaration before handling real personal data at scale.
