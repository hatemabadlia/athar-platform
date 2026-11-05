# Athar — development progress log

Read this first after a restart, then `docs/BLOCKERS.md`, then `git status` / `git log`.
Status labels: COMPLETE · PARTIAL · BLOCKED · NOT STARTED · UNVERIFIED.

## Environment facts (cloud dev container)
- Repo: `/home/user/athar-platform`, branch `claude/clever-edison-e06oin` (only branch this session may push).
- Local Supabase via Docker. Docker daemon is not auto-started: run `dockerd &` first if `docker info` fails.
- Supabase images must come from Docker Hub (`export SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io`); ECR blobs are blocked.
- Start: `npx supabase start -x studio,imgproxy,vector,logflare,supavisor,postgres-meta`
- Network allowlist only reaches package registries (no joradp.dz, telegram, meta, voyage, huggingface).
- `.env.local` (untracked) is generated from `npx supabase status -o json` + random secrets.

## Phase log

### Phase 0 — Audit · COMPLETE
`docs/AUDIT.md`. Baseline: `tsc` and `next build` passed on the prototype (no tests, no lint config existed).

### Phase 1 — Database & security · COMPLETE (local)
- 12 migrations in `supabase/migrations/` (schema, RLS, RPCs, column grants, seeds, storage, matching).
- `supabase/tests/database/001_rls_security.test.sql`: 44 pgTAP tests — PASS (`npx supabase test db`).
- Types: `lib/supabase/database.types.ts` (`npx supabase gen types typescript --local`).

### Phase 2/3/4 — Data layer, AI pipeline, intake, core features · COMPLETE (local, tested)
- Mock store and all mock datasets deleted. Server components + server actions + Realtime refresh.
- Email OTP login (Mailpit locally; templates in supabase/templates). Phone OTP: BLOCKED on SMS provider.
- Pipeline (`lib/pipeline/*`): Claude path UNVERIFIED (no key in this environment); rule-based path tested.
- Intake: /submit (consent, rate limit, Turnstile), /api/webhooks/telegram|whatsapp (signature verified; UNVERIFIED against real platforms), moderator paste.
- /admin tabs: queue (correct/approve/reject/merge/resolve, audited phone reveal, confirm volunteers, report), trees, reports, crisis (SMS console provider), shelters, forecast, roles, CSV import, audit + ai_runs + integrations.
- QR check-in (signed/expiring/single-use), points from confirmed actions, certificates + /verify, /impact (+CSV, print), /privacy, data export, deletion request.
- Tests: `npm run test` 39 unit PASS · `npx supabase test db` 44 pgTAP PASS · `npx playwright test` 3 e2e PASS (needs app on :3000 + fresh `supabase db reset`).

### Phase 5 — Humanitarian modules · COMPLETE (local)
Blood donors, in-kind offers/needs, associations + verification, campaigns + HMAC beneficiary dedupe. pgTAP 002 (20 tests), e2e modules.spec.

### Phase 6 — Intelligence · PARTIAL
Seasonal-naive forecasts from own history with "not enough data" state (unit-tested). External signals NOT STARTED.

### Phase 7 — PWA · PARTIAL
Manifest, icons, service worker (no private caching), offline outbox. Not tested on a physical device.

### Phase 8 — Impact · COMPLETE (local)
/impact national + wilaya, period filter, CSV, print view.

### Phase 9 — Hardening · PARTIAL
CSP + headers, error/not-found/loading, wilaya-scoped intake, masked AI logs, pg_cron maintenance, CI workflow (UNVERIFIED). French i18n PARTIAL (public core translated; see MORNING_REPORT). Lighthouse not run (tiles/fonts blocked here).

### Phase 10 — Review · DONE for this session
Final run (session 2): tsc ✓ · eslint ✓ · vitest 42 ✓ · pgTAP 69 ✓ · build ✓ · playwright 7 ✓ (×5). See docs/MORNING_REPORT.md.

### Next (if resuming)
1. Claude key → validate pipeline/chatbot. 2. Official wilayas 59–69 + communes. 3. French i18n. 4. Deployment (with Hatem's approval).
