# ATHAR (إيثار) — Phase 1 audit for the hackathon

_Date: 2026-11-03. Branch `claude/clever-edison-e06oin`. Written from the code, the docs, the test results and the real screenshots in `presentation/ASSETS/screens`. The app was **not** run today (see §7)._

## 1. What ATHAR actually is

**Problem it solves.** In Algeria, requests for help (blood, relief, clean-ups, orphans, medical help, education) are scattered across Facebook groups and WhatsApp forwards. Nobody can tell whether a call is real, still open, or a 2021 post being shared again. Volunteers who could help never see it, and nobody measures what was achieved.

**What it does.**
1. **Collects** calls from the public form, Telegram, WhatsApp, and moderators pasting posts.
2. **Runs a 7-stage pipeline** on each one: it understands the Darija, extracts the details (wilaya, phone, blood type…), detects **recycled old posts** and **duplicates**, and gives an **explainable credibility score**.
3. **Sends every call to a human moderator** (the wilaya's DJSL) before it's published.
4. **Matches** each published call to the right volunteers (wilaya, compatible blood type, skills).
5. **Closes the loop**: QR attendance, points from confirmed actions only, verifiable certificates, after-action reports, and a public impact page.

**Target users.**

| User | Need |
|---|---|
| Volunteers (youth 16–30) | Find a real, nearby need that matches what they can do |
| People and families in need, hospitals | Be seen fast by the right people |
| Associations | Avoid duplicated aid and prove their impact |
| Youth clubs at دور الشباب | Organise activities and record attendance |
| DJSL (wilaya youth directorates) and the Ministry | Moderation, crisis mode, national statistics |

## 2. Stack and architecture

- **App:** Next.js 15 (App Router, server components and actions), TypeScript, Tailwind, react-leaflet, PWA with a service worker.
- **Backend:** Supabase.
  - Postgres with 17 migrations (18 with today's), RLS on every table, column grants and security-definer RPCs.
  - Extensions: `pg_trgm`, `pgvector`, `pg_cron`.
  - Also Auth (email OTP), Storage (private buckets) and Realtime.
- **AI:**
  - **Analysis:** one Claude call (`messages.parse` with a Zod schema, effort `low`) for normalisation, extraction and classification. A labelled rule-based fallback runs when there's no key or on error.
  - **Anti-hallucination:** a sanitiser drops any field that isn't literally in the source text.
  - **Detection:** SQL trigram, hash and phone-HMAC matching for recycled and duplicate posts.
  - **Chatbot:** a Claude tool-use loop over database tools.
  - I checked both Claude calls against the current SDK docs, and both are correct.
- **Integrations (each behind an env var):** Telegram, WhatsApp Cloud, Twilio SMS, Turnstile, Voyage embeddings.

## 3. What's verified (from the previous session's runs, plus mine today)

| Check | Result | Run by |
|---|---|---|
| `tsc --noEmit` | pass | me, today |
| `eslint .` | pass | me, today |
| `vitest` | 42 passed | me, today |
| pgTAP database security tests | 69 passed | previous session (I could not rerun: no database) |
| Playwright end-to-end (7 flows) | passed | previous session |
| Claude pipeline and chatbot **live** | **never run** (no key yet) | — |
| Telegram / WhatsApp / SMS / Turnstile live | never run | — |

## 4. Feature status (honest)

**Working and tested:**
- Submission → pipeline → moderation → map
- Volunteer matching with reasons
- QR attendance (signed, single use)
- Points from confirmed actions only, plus certificates and `/verify`
- Trees with moderation
- Blood donor network with compatibility
- In-kind offers ⇄ needs
- Verified associations
- Campaigns with privacy-safe beneficiary dedupe
- Impact page with CSV export
- Privacy: consent, export, deletion

**Added today (type-checked, not yet run in a browser):**
- Wilayas 59–69
- Demo seed through the real pipeline
- Branded share card and `/?alert=` deep link
- Darija voice dictation (browser speech recognition)
- Demo samples on `/ingest`

**Partial:**
- Crisis SMS (console provider only)
- Chatbot (rule mode tested; the Claude mode isn't)
- PWA (not tested on a phone)
- French (only the public pages)

**Missing:**
- Auto-publishing to Facebook/Instagram. Replaced by the share card, which is honest and works.
- Phone OTP (needs an SMS provider).
- Official commune list.

## 5. Problems found

### Blocking for the hackathon
1. **No running environment.** There's no database: Docker is broken on this Mac, and no Supabase cloud project exists yet. No live link either.
2. **The real AI has never run once.** The most important claim in the pitch ("Claude understands Darija") is unproven until the key is added and tested on 20+ real-style posts.
3. **An empty database is a weak demo.** Fixed in code by `npm run seed:demo`, which still needs a database to run.

### UX / visual (seen in the real screenshots)
4. **Navigation is overloaded.** There are 9+ top-level items (map, submit, campaigns, clubs, forest, profile, notifications, moderation, processing, more). Labels wrap onto two lines at laptop width ("غابة إيثار", "أرسل نداءً"). Judges will feel the clutter.
5. **Weak brand mark.** The logo is a "!" in a green square, which reads as "warning", not "إيثار".
6. **The pages look clean but generic** ("admin template" feel). The hero is a gradient with three counters. There's no single "wow" moment on the landing page.
7. **The home page never states the core promise** ("we tell you if a call is real") in words a parent would understand.

### Technical debt / risk
8. **Soft refresh after server actions was flaky.** The previous session switched some flows to a full reload. Watch for stale lists during the demo.
9. **CI workflow never ran** on GitHub.
10. **Rate limiting and Turnstile are fine for production, but block a live demo.** Need `ATHAR_DEV_ALLOW_NO_CAPTCHA=true` on a staging deploy, or real Turnstile keys.
11. **Wilaya coordinates are approximate.** Wilayas 59–69 are seeded `verified=false` and should be checked against the JORADP text.

### Security
No critical issues found in this review:
- The service-role key is used only server-side.
- Authorisation lives in Postgres.
- Phone numbers are HMAC-hashed and revealed only after joining, with an audit trail.
- The share card never contains a phone number.

Remaining: an independent review of RLS before a real pilot, and a legal / Law 18-07 review.

## 6. What makes ATHAR different (the winning angle)

Most volunteer platforms are **directories**. ATHAR is a **trust filter in front of the chaos that already exists**. It doesn't ask Algerians to leave WhatsApp; it checks what comes out of WhatsApp.

The memorable moment: paste a viral post → in seconds, "this was first seen in January 2021, shared 47 times, already resolved" → it's blocked before it wastes a single volunteer's evening.

### Ranked improvements (innovation · impact · feasibility · user value · demo value, each /5)

| # | Improvement | Inn | Imp | Feas | Value | Demo | Notes |
|---|---|---|---|---|---|---|---|
| 1 | **"Is this post real?" public checker.** Anyone pastes a forwarded post and gets an instant verdict (recycled / duplicate / verified / unknown) with reasons, without creating an alert | 5 | 5 | 5 | 5 | 5 | Reuses stages 1–7 read-only. Turns every citizen into a user. The best 20 seconds of the demo |
| 2 | **Live AI on real Darija, with an evaluation set of ~30 posts** and the measured accuracy shown on a slide | 4 | 4 | 5 | 4 | 5 | Turns "we use AI" into "88% field accuracy on 30 posts" (whatever the real number is) |
| 3 | **Navigation + brand redesign**: 4 primary tabs (Map, Check a post, Act/Volunteer, My space) + role-based admin menu; real logo | 2 | 3 | 5 | 5 | 5 | Judges score UX in the first 10 seconds |
| 4 | **Critical blood alert → compatible donors notified in-app**, shown live on a second phone | 4 | 5 | 4 | 5 | 5 | Already built in the DB; needs a demo-quality flow |
| 5 | **Share card + deep link back to the platform** (done today) | 3 | 4 | 5 | 4 | 4 | Brings people from WhatsApp into ATHAR |
| 6 | **Ministry impact dashboard as the closing shot** (per-wilaya map, hours, blood units, recycled posts blocked) | 3 | 4 | 5 | 3 | 4 | Exists; needs polish and demo data |

## 7. Why the app wasn't run today
Docker Desktop on this Mac lives in a "Previously Relocated Items" folder after a macOS upgrade and hangs on start. Decision: **skip Docker and use Supabase cloud**, which is also needed for the public link. The template `.env.local` is ready and waiting for the keys.

## 8. Proposed order of work (after your OK)
1. Supabase cloud up, migrations pushed, demo seed run, app running. Then **test every journey in the browser** and fix what breaks.
2. Live Claude test plus a 30-post evaluation, with the real accuracy measured and written down.
3. Improvement #1 (the public checker) and #3 (navigation + brand).
4. Demo polish: #4, the impact dashboard, the landing-page "wow".
5. Deploy to Vercel, then a full QA pass on phone and laptop.
6. Phase 7 deliverables in Arabic: pitch (3 min), demo script (5 min), jury Q&A, technical Q&A, updated deck.
