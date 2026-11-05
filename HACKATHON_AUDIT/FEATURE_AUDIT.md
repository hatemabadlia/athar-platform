# Feature audit — what actually works

Audited on 2026-11-05 at commit `cac6e2d` (branch `claude/clever-edison-e06oin`).

**Evidence sources**
- Source code I read.
- `npm test`: 54 unit tests pass.
- pgTAP on the cloud database: 69/69 pass.
- `npm run eval:ai`: 30/30 verdicts (Gemini 3.5 Flash-Lite).
- `npm run demo:check`: 7/7 journeys pass in headless Chrome against the cloud database.

**Status legend**
- ✅ Fully implemented and tested
- 🟢 Implemented, not tested end-to-end
- 🟡 Partial
- 🖼 UI only
- 🎭 Mocked or simulated
- ❌ Missing

| Feature | UI | Backend | Actually works | Evidence | Status |
|---|---|---|---|---|---|
| Request submission (public form) | `/submit` | `app/api/intake/route.ts` → `lib/server/intake.ts` → `processIntake` | Yes | Journey "Public submission accepted" passed; the row appears in `intake_items` and as a pending alert in wilaya 16 | ✅ |
| Submission by moderator paste | `/ingest` | same API, `channel=moderator_paste`, staff only (403 otherwise) | Yes | Code + previous session's e2e | 🟢 |
| Telegram / WhatsApp intake | status shown in `/ingest` | `app/api/webhooks/telegram`, `…/whatsapp` with secret/signature checks | Never run against the real platforms (no tokens) | Code only | 🟡 |
| Multilingual understanding (MSA / French / mixed) | pipeline steps, checker "ما فهمه إيثار" | `lib/pipeline/gemini.ts` / `claude.ts`, one structured-output call | Yes | Eval: French case `ins-8` and MSA cases correct | ✅ |
| Darija understanding (Arabic script + Arabizi) | same | same, plus the rule-based lexicon fallback `heuristic.ts` | Yes on the test set | `ai:smoke` and eval: Arabizi `ins-7` gives Blida, O+; Darija terms listed | ✅ (small, self-made test set) |
| Information extraction (wilaya, phone, blood type, deadline, institution, quantity) | admin detail, checker | Zod schema `lib/pipeline/types.ts`; `sanitize.ts` drops values absent from the text | Yes | Eval: wilaya 29/30, category 27/30 | ✅ |
| Duplicate detection (active requests) | badge "مكرر محتمل", merge suggestion | SQL `match_active_alerts` (trigram + keyed phone hash, same wilaya and category, 21 days); auto-link at ≥ 0.85 | Yes | Seed post 16 → `duplicate`; eval act-1…6 and rec-3…5 correct | ✅ |
| Recycled-post detection (archive) | badge "قديم محتمل", checker "سبق حلّه" | SQL `match_historical` (exact hash, trigram, phone hash, optional pgvector); archive is fed by `alert_decide` on resolve/recycle | Yes | Seed posts 17–18 → `recycled`; eval res-1…5, rec-1…2 correct | ✅ |
| Semantic (meaning-based) duplicates | — | `embeddings.ts` (Voyage) behind a key | Not active: no key, so text similarity only | Code | 🟡 |
| Recycled **image** detection | — | — | — | No image ingestion at all (text only) | ❌ |
| Update vs duplicate distinction | — | — | Treated as a duplicate | No "update" concept in `scoring.ts` | ❌ |
| Credibility assessment | score ring + reasons | `scoring.ts` (additive, each factor labelled) | Yes | Unit tests; visible in admin detail | ✅ |
| Explainable verification ("Is this post real?") | `/check` | `lib/pipeline/check.ts` + `verify.ts` (5 evidence-based verdicts, never "fraud") | Yes | 10 unit tests; journey "old viral post → resolved" passed; no phone in the response | ✅ |
| Wilaya moderation | `/admin` (scope badge) | RLS + `can_moderate(w)` + `alert_decide` RPC + audit log | Yes | pgTAP: cross-wilaya reads blocked; journey: Algiers DJSL sees the new Algiers request | ✅ |
| Moderator: approve / reject / merge / resolve / reopen / mark recycled | buttons in the detail modal | `alert_decide` | Yes | pgTAP transitions; screenshot `04a` | ✅ |
| Moderator: "request more information" | — | — | — | No action or status | ❌ |
| Volunteer matching (wilaya, blood, skills, availability, urgency) | "مقترح لك" + reasons on the map list | `lib/matching.ts` (pure, unit-tested) | Logic yes. **Demo data: skills never match**, because the seed uses free-text skills ("سياقة") that are not in `SKILLS` | Unit tests; `scripts/seed-demo.ts` vs `lib/reference/meta.ts` | 🟡 (data bug) |
| Blood compatibility | reasons, donor network | `RED_CELL_COMPATIBILITY` + DB `blood_compatibility`; standard ABO/RhD red-cell table | Yes | Unit tests; DB notify picks only compatible donors (B+ Batna → 1 donor) | ✅ |
| Donor privacy | "لا تُكشف هويات المتبرعين" | `notify_compatible_donors` returns a count only; 6 h throttle; audited | Yes | pgTAP + journey | ✅ |
| Notifications (in-app, live) | toast + bell badge | `notifications` table, Realtime + RLS | Yes | Journey: two sessions, donor's phone shows the red alert | ✅ |
| Push / SMS notifications | crisis SMS panel | `lib/sms.ts`: console provider; Twilio adapter behind env vars | SMS is only **recorded**, not sent | Code | 🎭 (clearly labelled "لا إرسال حقيقي") |
| QR attendance (club activities) | live QR in `/profile`, scanner in `/clubs` | `issue_qr_token` / `check_in`: HMAC, 5 min, single use, no self check-in | Yes | pgTAP (replay, tamper, self); camera path never tested on a phone | ✅ (backend) / 🟢 (camera) |
| QR attendance for a **help request** (mission) | — | `club_activities.alert_id` exists in the schema and in `createActivity` | No UI links a request to an activity | `components/clubs/*` never passes `alertId` | 🟡 |
| Attendance confirmation for requests | "حضر / لم يحضر" in the admin detail | `alert_volunteers.status=confirmed` → `point_events` | Yes | Screenshot `04a` | 🟢 |
| Points / badges | profile | `point_events` view (confirmed rows only) | Yes | pgTAP "points exactly once" | ✅ |
| Certificates | `/certificates/[id]` + print-to-PDF | `issue_certificate` / `verify_certificate` (HMAC) | Yes | pgTAP (valid and tampered) | ✅ (not re-run in today's browser test) |
| Public certificate verification | `/verify/[id]` | same | Yes | pgTAP | 🟢 |
| Impact dashboard | `/impact` (+ CSV, print) | SQL stats over real rows | Renders with seeded data | Journey "impact page renders" | 🟢 (numbers come from demo data) |
| Live map | `/` (OpenStreetMap tiles, fallback server) | approved alerts at wilaya centroids | Yes | Tile check: 24 tiles, 0 broken; phone screenshot | ✅ |
| Admin dashboard | `/admin`: 11 tabs (alerts, associations, trees, reports, crisis, shelters, forecasts, roles, import, audit/AI) | RPCs + RLS | Main tab tested; other tabs not exercised today | Screenshot `03` | 🟢 |
| Crisis mode + shelters | `/admin` crisis tab, `/crisis/[id]`, banner | tables + RPCs; SMS via the console provider | Partially (no real SMS) | Code | 🟡 |
| Chatbot (إيثار بوت) | floating button | retrieval-first DB tools; Gemini only rewrites the facts | Rules path tested before; Gemini path never run live | Code | 🟢 |
| Voice input (Darija) | mic on `/submit`, `/ingest`, `/check` | browser speech recognition (`ar-DZ`) | Not tested (needs a real browser with microphone) | Code | 🟢 |
| Share card (no phone number) | share button on each alert | canvas image + deep link `/?alert=` | Not tested in a browser | Code | 🟢 |
| PWA / offline | install, offline outbox | `public/sw.js` v2, `lib/outbox.ts` | Not tested on a device | Code | 🟢 |
| French UI | language switch | `lib/i18n/dict.ts` | Public core only; admin and modules stay Arabic | Previous report | 🟡 |
| Authentication | `/login` (email OTP), `/auth/callback` (code + token_hash) | Supabase Auth | Yes (token_hash path tested by journeys) | Journeys log in 3 roles | ✅ |
| Rate limiting | — | `rate_limit_hit` RPC on intake, verify, chat | Yes (code) | Not load-tested | 🟢 |

## Mock / simulated / placeholder inventory

- **No mock data in runtime code.** `lib/mock-data.ts` and `lib/store.tsx` were deleted earlier. The demo content is a separate, removable seed: `scripts/seed-demo.ts`, accounts `@demo.athar.dz`, phones `0555 00 0x xx`.
- **Simulated:** SMS sending (console provider), labelled in the UI.
- **Approximate:** map positions are wilaya centroids, labelled "approximate". Wilayas 59–69 are `verified=false`.
- **Demo-only:** institutions, shelters and associations marked "(تجريبي)".
- **Not present (fake versions removed):** auto-publishing to Facebook/Instagram, and recycled-image detection.
