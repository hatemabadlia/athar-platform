# Athar (إيثار): Phase 0 audit

_Date: 2026-11-01 · Commit audited: `5f5ab2c` (initial prototype)_

This file lists every mock dataset, every use of `localStorage`, and every simulated behaviour in the prototype. Each item says what will replace it. No code has changed yet.

Legend: 🔴 fake data or fake behaviour that a user sees · 🟠 a real mechanism with fake inputs · 🟢 true reference data that can stay (with a source)

---

## 1. Summary

| Area | State today | Severity |
|---|---|---|
| Persistence | Everything lives in one React context (`lib/store.tsx`) saved to 7 `localStorage` keys. There is no server, no auth and no multi-user state. | 🔴 |
| Alerts, clubs, trees, shelters, stories, forecasts | All hard-coded in `lib/mock-data.ts` (649 lines). Every page shows invented people, phone numbers and organisations. | 🔴 |
| "AI" pipeline | Keyword heuristics, a 30-word Darija lexicon, and bigram Jaccard against **3** archive records. The UI says "3,412 fingerprints". | 🔴 |
| Live social monitor | Loops over 12 invented posts on a timer. The log prints fake `GET facebook.com/groups/...` lines. | 🔴 |
| Auto-publish | No posting happens. It fabricates FB/IG/X URLs and a random "reach" number. | 🔴 |
| Crisis SMS | No SMS is sent. Six hard-coded numbers, animated confirmations and invented confirmation counts. | 🔴 |
| Voice note / ASR | Types out one hard-coded transcript. There is no audio and no ASR. | 🔴 |
| QR code and scanning | The "QR" is a random pixel pattern that no scanner can read. "Scanning" is `sleep(1800)`, followed by a confirmation. | 🔴 |
| Points and badges | Awarded the moment someone clicks "I can help". No confirmation is needed, and points are client-side and editable. | 🔴 |
| Certificate | `window.print()` on a modal. It claims DJSL endorsement, and nothing can verify it. | 🔴 |
| Chatbot | Regex intents over the local store, with a fake typing delay. It doesn't invent alerts, but it states made-up policy ("honoured on 25 October"). | 🟠 |
| Wilaya list | `lib/wilayas.ts` has **48** wilayas. The stats card says "out of 58", and the current official count is **69** (see §6). | 🔴 |
| Privacy | Raw phone numbers appear publicly on cards, map popups and admin. There is no consent, no privacy page and no deletion flow. | 🔴 |
| Security | No auth. `/admin` and `/ingest` are open to everyone and any visitor can approve alerts. | 🔴 |
| Repo hygiene | `hr.key` (1 MB) is committed. It is an Apple **Keynote** deck (zip of slides and images), not a cryptographic key. It should move out of the repo or into `docs/`, renamed. | 🟠 |

---

## 2. `localStorage` usage (all in `lib/store.tsx`)

| Key | Holds | Replacement |
|---|---|---|
| `athar:alerts:v1` | every alert, seeded from `INITIAL_ALERTS` | `alerts` table (+ `alert_sources`), RLS, Realtime |
| `athar:joined:v1` | IDs of alerts "I joined" | `alert_volunteers` (user_id, alert_id, status: joined/confirmed/no_show) |
| `athar:profile:v1` | name, phone, wilaya, blood type, skills, points, badges | `profiles` (+ auth.users); points and badges become a **view** over confirmed actions |
| `athar:clubs:v1` | clubs, seeded from `YOUTH_CLUBS` | `clubs`, `club_members`, `club_activities` |
| `athar:published:v1` | fake published posts | `published_posts` (status: draft → approved → posted/failed, with real platform IDs) |
| `athar:crisis:v1` | active crisis | `crises` table + Realtime banner |
| `athar:trees:v1` | trees, including base64 photos (hits the storage quota) | `trees` + Supabase Storage bucket `tree-photos`; `tree_likes` |

Also in the store:
- `stats.totalIngested = alerts.length + 1_240` and `recycledFiltered = recycled + 318`. These are **invented offsets**, removed. `volunteerHoursSaved = filtered × 6` is an unsourced multiplier: remove it, or label it clearly as an estimate.
- `resetDemo()` and the ↺ navbar button are removed.
- Random location jitter (`Math.random() * 0.08`) on new alerts and trees is replaced by a real geocode to the baladiya centroid. Rounding to baladiya level is what privacy needs for people.
- `volunteer()` auto-creates a profile and awards 40–100 points on click. Joining will award nothing. Points come only from **confirmed** attendance (QR) or an approved after-action report.

---

## 3. Mock data in `lib/mock-data.ts`, item by item

| Export | Used by | Verdict | Plan |
|---|---|---|---|
| `INITIAL_ALERTS` (≈ 400 lines, invented alerts with real-looking phone numbers and hospitals) | store | 🔴 delete | Empty `alerts` table. Content comes from intake. |
| `HISTORICAL_RECORDS` (3 invented "archive" posts) | ai-pipeline, ingest | 🔴 delete | `historical_posts` with pgvector embeddings, filled **only** from posts the platform actually processed (and resolved or expired) plus a moderator CSV import. |
| `VOLUNTEERS` | unused | 🔴 delete | `profiles` |
| `SAMPLE_POSTS` ("demo scenarios") | ingest | 🔴 remove from runtime | Move to test fixtures (`tests/fixtures/`) for pipeline unit tests only. |
| `YOUTH_CLUBS` (8 invented clubs with real-sounding people's names) | store, chatbot, crisis | 🔴 delete | Empty `clubs`. Clubs are created by `club_lead` users and linked to an institution. |
| `IMPACT_STORIES` (invented testimonials with names) | clubs page | 🔴 delete | Optional `testimonials` table (written by users with consent, moderated). Hidden when empty. |
| `SCRAPE_POOL` (12 invented social posts) | live-monitor | 🔴 delete | Live monitor reads the real `intake_queue` (form / Telegram / WhatsApp / RSS / moderator paste) through Realtime. |
| `SHELTERS` (9 invented shelters with phone numbers) | home, crisis panel, banner | 🔴 delete | Empty `shelters` table + admin CRUD + CSV import. DJSL admins register their own institutions. |
| `FORECASTS` (4 invented forecasts with fake percentages) | admin | 🔴 delete | Phase 5: computed from platform history, otherwise "not enough data yet". |
| `VOICE_SAMPLE` | voice-note | 🔴 delete | Real audio upload → transcription (see §4.4), or the feature is hidden. |
| `INITIAL_TREES` (10 invented trees with names) | store | 🔴 delete | Empty `trees`. |
| `CATEGORY_META`, `URGENCY_META`, `STATUS_META` | many | 🟢 keep | Move to `lib/reference/categories.ts` (UI labels, not data). |
| `SKILLS`, `BLOOD_TYPES`, `BADGES` | profile | 🟢 keep | Blood types are an ABO/Rh fact; add a compatibility matrix with its source. Skills and badges are product definitions. |
| `CRISIS_META` (crisis types, needs, SMS templates) | crisis | 🟢 keep (templates) | Move to reference; templates become editable per wilaya. |
| `TREE_SPECIES`, `TREE_PLACES` | trees | 🟢 keep | Product reference lists. |
| `CO2_PER_TREE_KG = 22` | trees | 🟠 unsourced | The ~22 kg/yr figure is a commonly quoted average for a *mature* tree and varies a lot by species and age. Label it "approximate estimate" with a source, or remove it. Don't show tonnes as fact. |

---

## 4. Simulated behaviours

### 4.1 AI pipeline (`lib/ai-pipeline.ts`, `app/ingest/page.tsx`)
- All 7 steps run synchronously in the browser. Then `sleep(durationMs)` reveals them one by one to look like processing.
- Step text hard-codes the source: "received a post from Facebook".
- "Compared against `HISTORICAL_RECORDS.length * 1000 + 412` fingerprints": a **fabricated count** (3 → 3,412). The header also says "archive: 3,412 fingerprints".
- `buildTitle`/`summary` are templates. The "LLM" Darija normalisation is a 30-entry lexicon.
- `baladiya` is always set to the wilaya name. No baladiya is ever detected.
- The credibility score is additive heuristics (+12 wilaya, +12 phone, −35 CCP).
- **Plan:** a server-side pipeline (Route Handler / Edge Function) with the Claude API, tool-use JSON schema for extraction, pgvector embeddings, real per-step timings streamed to the UI, and `ai_runs` audit rows. The current heuristics become the explicitly labelled **offline fallback** ("heuristic mode, no AI key"). The UI's 7 steps stay.
- Open question: Claude has no embeddings endpoint. Recycled-content detection needs an embedding model: (a) a hosted provider (Voyage AI is the one Anthropic recommends) behind an env var, or (b) a local multilingual model (e.g. `multilingual-e5-small` via `transformers.js` in an Edge Function or the Node server). I propose (b) as the default so it works without another key, with (a) optional.

### 4.2 Live social monitor (`components/ingest/live-monitor.tsx`)
- A `setTimeout` loop over `SCRAPE_POOL`, with fake HTTP log lines (`GET facebook.com/groups/...`), fake reactions and shares, and "14 groups, 5 keywords".
- It auto-adds "fresh" posts to the alert list and can auto-"publish" them to 4 channels.
- **Plan:** keep the radar UI and subscribe to `intake_items` inserts through Realtime. Show the real channel (form/telegram/whatsapp/rss/paste). No FB/IG/TikTok scraping. Auto-publish becomes "create a draft for admin approval".

### 4.3 Branded auto-publish (`publish-modal.tsx`, `post-generator.ts`, `store.publishPost`)
- The "AI generation" is a typewriter effect over a template caption.
- The "upload" is `sleep(650 + random)` per channel.
- URLs are fabricated (`facebook.com/athar.dz/posts/<timestamp>`, `x.com/athar_dz/status/<now>`), and `reach = 120 + random(900)`.
- The short link `athar.dz/a/<hash>` goes nowhere. The domain isn't ours.
- **Plan:** a server-side 1:1 image via `next/og` (Satori). A caption from a template or LLM that the admin edits. `published_posts` goes through an approval state. Real posting through the Meta Graph API (Page + IG Business) and the X API only when env credentials exist. Otherwise the buttons say "not configured". WhatsApp uses `wa.me/?text=` share links. Reach is shown only if the platform API returns it. Short links point to `/a/[id]` on our own domain.

### 4.4 Darija voice note (`voice-note.tsx`)
- No audio. A typewriter effect over `VOICE_SAMPLE.transcript`.
- **Plan:** real audio upload (from Telegram/WhatsApp voice messages too) → transcription. The Claude API does not transcribe audio, so this needs a speech-to-text provider (e.g. an open Whisper model self-hosted, or a hosted STT API) behind an env var. Without one, the card is hidden. Darija ASR quality is a known limitation, and the transcript stays editable before it goes into the pipeline.

### 4.5 Crisis mode + SMS (`admin/crisis-panel.tsx`, `crisis-banner.tsx`, home)
- `numbers = [six hard-coded phone numbers]`, "sending" → "sent" by `sleep(420)`.
- Confirmations are `members × (0.12 + i × 0.09)`: invented. The volunteer count falls back to `|| 120` when the wilaya has no clubs.
- Shelters come from the fake `SHELTERS` list. The home banner says "registered volunteers received an SMS".
- **Plan:** a `crises` row; recipients = profiles in that wilaya with `sms_opt_in` and a verified phone; an `SmsProvider` interface (`ConsoleSmsProvider` for dev + one real adapter); `sms_messages` rows with provider status; an inbound webhook parses "1" and updates `crisis_confirmations`. Real counts from rows. Shelters come from the `shelters` table.

### 4.6 QR attendance (`components/qr-code.tsx`, `app/clubs/page.tsx` ScanModal, profile QR card)
- `QrCode` draws a deterministic random matrix with finder squares. **It is not a QR code.**
- The QR seed is `name + phone`, which would leak the phone number if it were real.
- "Scan" = `sleep(1800)` then `confirmAttendance(20)` on **the volunteer's own** profile. In other words, volunteers confirm themselves.
- **Plan:** a real QR (`qrcode` lib) that encodes a short-lived signed token (HMAC/JWT: user_id, activity_id or "any", exp ≈ 2–5 min, nonce). The club lead scans it with the camera (`html5-qrcode`). The server verifies the signature, expiry, nonce reuse and that the lead runs that activity, then inserts an `attendance` row.

### 4.7 Points, badges, levels (`store.volunteer`, `joinClub`, `createClub`, `reviewTree`, `saveProfile`)
- Points are given for clicking "help" (40–100), joining a club (+30), creating a club (+50) and creating a profile (+20).
- `confirmedPoints` exists but is only fed by the fake scan.
- **Plan:** a `volunteer_points` SQL view summing **confirmed** events only (attendance, approved tree, an after-action report listing the volunteer, a recorded donation). Badges are derived from the same view.

### 4.8 Certificate (`profile/page.tsx` Certificate)
- A print modal. It claims "approved by the Directorate of Youth and Sports", which is untrue.
- **Plan:** a server-generated PDF of **confirmed** hours, with a unique ID and a QR to `/verify/[id]`, where the public verification page shows name, hours and dates, plus a signature hash. Wording: "issued by the Athar platform". An institutional co-sign only once a DJSL admin signs it digitally.

### 4.9 Chatbot (`components/chatbot.tsx`)
- Regex intents with `setTimeout(700 + random)` fake typing.
- It doesn't invent alerts (good). It does state product claims that don't exist: the 25 October ceremony, "the directorate will send you an SMS".
- **Plan:** a server Route Handler with Claude tool use (`search_alerts`, `my_points`, `my_clubs`, `nearest_shelter`), streamed. A system prompt that forbids inventing alerts. Falls back to the current regex intents when there is no key.

### 4.10 Trees (`add-tree-modal.tsx`, `trees/page.tsx`, `admin/tree-review.tsx`)
- Photos are base64 in `localStorage`. GPS is from the browser and unchecked. Likes are local only. Review is open to anyone.
- **Plan:** a Storage upload (re-encoded server-side, EXIF GPS/date read then **stripped** from the public copy), with a distance check between EXIF/GPS and the claimed location, a moderation queue limited to `moderator`/`djsl_admin` of that wilaya, and `tree_likes` with a unique (tree, user) pair.

### 4.11 Admin dashboard (`app/admin/page.tsx`, `components/admin/*`)
- Hard-coded header: "Directorate of Youth, Sports and Leisure for the wilaya of Algiers", with no auth.
- "Export report" button: does nothing.
- `stats-cards`: "out of 58 wilayas" (wrong now, see §6). The numbers include the invented +1,240 / +318 offsets.
- `forecasts`: static `FORECASTS`. `clubs-summary`/`wilaya-chart`/`activity-feed`: derived from fake store data. The mechanism is fine, the inputs are fake.
- **Plan:** role-scoped admin (the wilaya taken from the admin's profile; ministry sees all), a real CSV/PDF export, and a moderation queue.

### 4.12 Public portal (`app/page.tsx`, `alert-card`, `help-modal`, `live-map`, `impact-section`)
- Hero: "Live feed · updated from Facebook, X, Instagram and WhatsApp" is untrue. "Athar reads thousands of posts a day" is untrue.
- Contact phone numbers are visible to everyone on cards and map popups.
- `help-modal` collects name and phone with no consent and stores them nowhere real.
- `impact-section` renders `alert.report` from mock alerts (after-action reports were invented in `INITIAL_ALERTS`).
- **Plan:** honest copy, the phone shown only to the owner, admins and volunteers who joined (enforced by RLS and a `security definer` RPC), a consent checkbox, empty states with CTAs.

### 4.13 Profile (`app/profile/page.tsx`)
- The SMS toggle saves to `localStorage` only. "Matched alerts" scoring is fine but runs on fake alerts; the blood match is an exact tag-string match.
- **Plan:** server-side matching with the blood compatibility matrix, availability, distance (wilaya, then neighbouring wilayas).

---

## 5. Privacy gaps (Law 18-07 in spirit)

1. No consent capture before collecting a phone number, a blood type (health data, which Law 18-07 treats as *sensitive*) or a location.
2. Phone numbers are public on every card and popup.
3. No privacy notice, no stated purpose, no retention period, no right of access or deletion.
4. Alert locations are jittered randomly around the wilaya centre: neither precise nor deliberately generalised.
5. The QR seed embeds the phone number.
6. **Plan:** a `consents` table (purpose, version, timestamp), a `/privacy` page in Arabic (and French later), a `/account/delete` flow (soft-delete → hard purge job via `pg_cron` after N days, keeping anonymised aggregates), people's locations rounded to the baladiya centroid in public views, phone numbers in a separate column readable only through an RLS-guarded RPC, and `audit_log` on admin reads of sensitive fields.

> Note: Law 18-07 also requires declaring or authorising processing with the national authority (ANPDP). That is an organisational step for the operator (the ministry or the association), not something code can do. I'll list it in `docs/PRIVACY.md`.

---

## 6. Facts checked

### Number of wilayas: **69** (not 48, not 58)
- Algeria went from 48 to 58 wilayas in 2019 and to **69** under the new territorial-organisation law (published in the Journal officiel, 2026). The 11 new wilayas' names, chief towns and numbers (59–69) were then fixed by decree published in JO n° 40 (2026).
- **The secondary sources I found disagree on which number goes with which new wilaya.** For example, one gives 60 = Brika/Barika, 66 = Messaad, while TSA gives 66 = Ksar El Boukhari, 69 = Messaad. They agree on the 11 names: Aflou, Barika, El Kantara, Bir El Ater, El Aricha, Ksar Chellala, Aïn Oussara, Messaad, Ksar El Boukhari, Bou Saâda, El Abiodh Sidi Cheikh.
- I could not reach the Journal officiel text from this session: news sites outside the session's network allowlist fail to resolve.
- **Plan for Phase 1:** seed codes 1–58 (stable, well documented) from a cited dataset, and add 59–69 **only** after checking their codes against the JO n° 40 text (joradp.dz). Until then they go in a `pending_verification` CSV that an admin import loads. The DB keeps `wilayas.code` as data, not as an enum, so the reorganisation (and any later one) is just a data update. Baladiyas also moved between parent wilayas, so `baladiyas.wilaya_code` must follow the new mapping.
- Baladiyas (1,541 communes after the reform) need a sourced dataset with Arabic and French names and centroids. Candidates: ONS/ASAL publications, OpenStreetMap admin_level=8 (ODbL licence, attribution required). To be confirmed in Phase 1 and documented in `docs/DATA_SOURCES.md`.

### Other facts still to verify (later phases, not assumed)
- Official list of دور الشباب and ANS blood-donation centres: I'm not aware of a public machine-readable dataset. Plan: admin CSV import, tables left empty.
- Meta Graph API (Pages/IG publishing), X API tier and pricing, WhatsApp Cloud API webhook terms, Telegram Bot API: check current terms when implementing Phase 3/4.
- Blood donation eligibility rules (interval, age, weight) in Algeria: check against the ANS (Agence Nationale du Sang) before encoding; keep them configurable.
- Météo Algérie: check whether a public feed or API exists and what its terms of use are (Phase 5).

---

## 7. Plan (phases, mapped to the findings above)

| Phase | Addresses | Key outputs |
|---|---|---|
| 1. Backend foundation | §2, §5, §6 | `supabase/` migrations for all tables in the brief + `intake_items`, `consents`, `institutions`; roles enum; RLS on every table; pgTAP (or SQL) RLS tests; sourced seeds (wilayas 1–58 + verified 59–69, baladiyas, blood matrix, categories); generated types |
| 2. Replace the store | §2, §3, §4.7, §4.11–4.13 | supabase-js + TanStack Query hooks, server actions, Realtime; delete `mock-data` runtime exports and the reset button; empty states on every page; auth (phone OTP + email) |
| 3. AI pipeline + intake | §4.1–4.4 | Server pipeline (Claude tool use, embeddings, `ai_runs`), heuristic fallback, intake: form + Turnstile, Telegram bot, WhatsApp webhook, moderator paste; live monitor on Realtime; moderation queue; rate limiting |
| 4. Real features | §4.5–4.10 | Matching, signed QR + camera scan, confirmed-only points view, tree Storage + EXIF checks, crisis + SMS provider + inbound webhook, after-action reports, verifiable PDF certificate |
| 5. Forecasts | §4.11 | Seasonality from own history; external signals only where real; "not enough data yet" |
| 6. New features | brief | Blood donor network, needs⇄offers, verified associations, campaigns with hashed beneficiary dedupe, PWA, transparency page |
| 7. Hardening | all | zod env, error boundaries, a11y, tests (unit + Playwright), CI, `.env.example`, README + docs |

### Small fixes I'll fold into Phase 1–2
- Add `eslint` + `eslint-config-next`. `npm run lint` currently has no config and would prompt interactively. Add a `typecheck` script.
- Move `hr.key` (Keynote deck) out of the repo root (to `docs/presentation.key`, or delete it if you don't want it tracked). **Your call.**
- README route table still says `app/ pages: / , /ingest , /admin` only; rewrite in Phase 7.

## 8. Decisions I need from you before Phase 1

1. **Embeddings provider:** local model (no key, slower, the default I propose) or Voyage AI (needs a key)?
2. **Speech-to-text for voice notes:** hide the feature until you pick a provider, or wire a self-hosted Whisper?
3. **SMS adapter:** Twilio (works now, international pricing) or a specific Algerian gateway you have an account with?
4. **New wilayas 59–69:** OK to ship 1–58 first and add 59–69 once you (or I, with network access to joradp.dz) confirm the JO n° 40 numbering?
5. **`hr.key`:** move to `docs/`, or remove from git?

---

## 9. Status after implementation (2026-11-01)

| Finding (section) | Severity | Production blocker? | Status |
|---|---|---|---|
| localStorage store, mock datasets (§2, §3) | Critical | yes | **Resolved**: deleted; Supabase data layer under RLS |
| Fake archive count and stats offsets (§4.1, §2) | High | yes | **Resolved**: all numbers come from real rows (`portal_stats`, `impact_stats`) |
| Heuristic "AI" (§4.1) | High | yes | **Resolved in code**: Claude structured output + labelled fallback; Claude path UNVERIFIED (no key) |
| Fake live monitor (§4.2) | High | yes | **Resolved**: real intake queue over Realtime |
| Fake publishing and reach (§4.3) | High | yes | **Removed**; real publishing NOT STARTED |
| Fake ASR (§4.4) | Medium | yes | **Removed**; needs a speech-to-text provider |
| Fake SMS (§4.5) | High | yes | **Resolved**: SmsProvider (console/Twilio), real rows, inbound webhook |
| Fake QR / self check-in (§4.6) | Critical | yes | **Resolved**: signed, expiring, single-use, scanned by someone else |
| Points on click (§4.7) | High | yes | **Resolved**: confirmed actions only |
| Unverifiable certificate (§4.8) | High | yes | **Resolved**: HMAC + `/verify` |
| Chatbot invented claims (§4.9) | Medium | no | **Resolved**: tool-based; rules fallback queries the DB |
| Trees in localStorage, open review (§4.10) | Medium | yes | **Resolved**: private storage, EXIF stripped, scoped review |
| Admin open to all, dead export (§4.11) | Critical | yes | **Resolved**: role-scoped, CSV/print export |
| Public phone numbers, no consent (§4.12, §5) | Critical | yes | **Resolved**: RLS + consent + privacy page + deletion |
| 48 wilayas (§6) | High | yes | **Partially resolved**: 58 seeded (unverified flag); 59–69 BLOCKED on official numbering |
| No lint config / tests | Medium | yes | **Resolved**: ESLint, 41 unit, 69 pgTAP, 6 e2e |
| Accessibility (nested interactive card, unlabeled controls) | Medium | no | **Improved**: labels, roles, skip link, focus states; no full screen-reader audit yet |
| `hr.key` in repo root | Low | no | Moved to `docs/presentation/` |
