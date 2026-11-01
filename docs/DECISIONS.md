# Architecture decisions

Each entry: decision → why → trade-off.

1. **Authorisation lives in Postgres (RLS + column grants + security-definer RPCs), not in Next.js.** That makes it impossible to bypass from a new route or a direct API call, and it's testable with pgTAP. The cost is more SQL to maintain. 69 pgTAP tests guard it.
2. **Server components + server actions + Realtime-triggered `router.refresh()` instead of TanStack Query.** This means less client state, data is fetched as the user under RLS, and pages work on an empty database without client caches. The cost is that real-time updates re-render the page rather than patching a cache, which is fine at pilot scale.
3. **One structured Claude call for stages 2–4 instead of three calls.** It's cheaper and faster, and the stages share context. The UI still shows all 7 stages; their timings are reported honestly (stages 2–4 share one duration). It uses `messages.parse` + Zod (structured outputs), model `claude-opus-5-5` (configurable through `ATHAR_AI_MODEL`), effort `low` because this is a classification-style task.
4. **Rule-based fallback kept and clearly labelled.** The platform stays usable with no key or during an outage. Results show "قواعد" (rules) everywhere, and confidence is capped at 0.7.
5. **Post-validation of model output (`sanitize.ts`).** Fields that aren't present in the source text are dropped, so the AI can't invent a phone number, blood type or wilaya.
6. **Server-side refusal fallbacks (`fallbacks` beta) not used.** On a refusal or error the pipeline falls back to the local rule-based analysis and logs the failure. That avoids a beta dependency, at the cost of not getting a second model's opinion.
7. **Embeddings: Voyage (1024-dim) behind an env var; trigram + content hash + keyed phone hash without it.** Claude has no embeddings endpoint, and a local model couldn't be downloaded here (network). The column is `vector(1024)`. Switching providers means a migration if dimensions differ.
8. **Duplicates auto-link only at ≥ 0.85 text similarity within the same wilaya and category; otherwise the merge is suggested.** Moderators decide uncertain cases, and evidence (sources) is never deleted.
9. **Recycled matches become `pending` with a warning, not auto-rejected.** A similar old post doesn't prove fraud; a real case can recur.
10. **People's public locations are wilaya centroids.** Baladiya data isn't loaded (no verified dataset), and wilaya level is the privacy-safe default. Markers are spread visually and labelled "approximate".
11. **QR tokens are signed and verified inside Postgres (HMAC secret in a `private` schema).** No secret is needed in the app tier, and anti-replay (`used_qr_nonces`) and "points exactly once" (`unique(activity, user)`) are atomic. The secret rotates with a migration.
12. **Points come from a view over confirmed rows (`point_events`), not a counter.** It can't drift, it can't be self-awarded, and it's auditable.
13. **Certificates: browser print-to-PDF of a server-rendered page plus HMAC verification at `/verify/[id]`.** Server-side PDF libraries handle Arabic shaping poorly. Verifiability comes from the signature, not the file format. The cost is that the user clicks "Save as PDF".
14. **SMS behind `SmsProvider` with a console default.** Nothing real is sent without explicit configuration. Real sends ask for a confirmation showing the recipient count.
15. **Email OTP as the only enabled login.** Phone OTP depends on an SMS provider and credentials. Email works locally (Mailpit) and in production with SMTP.
16. **Turnstile only for anonymous submissions.** Signed-in users passed OTP and are rate-limited per account, which also lets offline-queued submissions sync.
17. **Wilayas 59–69 not seeded.** Their official numbering couldn't be verified, and inventing it would corrupt every alert's location.
18. **Mock data removed rather than hidden behind a flag.** The brief is "no fake data in production code paths". Demo content is created through the UI (`docs/DEMO.md`).
19. **Branded auto-publishing (Facebook/Instagram/X) not built.** The fake version was removed. Real posting needs Meta/X apps, review and admin approval. It's lower priority than core safety.
20. **French i18n not implemented.** Arabic RTL is complete. Retrofitting next-intl across every component was deferred so it could be done properly rather than half-done (see the morning report).
21. **Branch:** work is on `claude/clever-edison-e06oin` (the only branch this session can push to), not `feat/athar-production`.
