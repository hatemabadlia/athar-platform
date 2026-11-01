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

### Phase 2/3 — Data layer, AI pipeline, intake · IN PROGRESS
Done:
- `lib/env.ts` zod validation; `lib/supabase/{server,client,admin}.ts`; `middleware.ts` session refresh.
- Pipeline `lib/pipeline/*`: Claude structured output (`claude.ts`), rule-based fallback (`heuristic.ts`),
  anti-hallucination sanitiser, keyed phone hashes, trigram/pgvector matching SQL, explainable scoring, `ai_runs` logging.
- Intake: `/api/intake` (form + moderator paste, rate limit, Turnstile), Telegram + WhatsApp webhooks (signature checked).
Next: rewrite pages off `lib/store.tsx`, auth pages, moderation UI.
