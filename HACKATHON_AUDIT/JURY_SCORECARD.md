# Jury scorecard (honest)

Scored as a demanding jury that has already seen 30 projects. Scores reflect the state on 2026-11-05: local plus cloud database, **not yet publicly deployed, not rehearsed.**

| # | Criterion | Score /10 | Evidence | What costs points |
|---|---|---|---|---|
| 1 | Innovation and originality | **8** | Most volunteer apps are directories. ATHAR is a verification layer on top of WhatsApp/Facebook (`/check`, archive matching, 5 evidence-based verdicts). | The idea of an "AI fact-check" exists elsewhere. Originality comes from the Algerian/Darija + humanitarian + wilaya-moderation combination, so the pitch must say that explicitly. |
| 2 | Problem relevance | **9** | Every Algerian has seen recycled blood/aid posts. The demo case (a 2021 post shared 47×) is instantly recognisable. | No field data: no survey and no counts of recycled posts. The slides currently say "observations", which is honest but weaker. |
| 3 | Social impact | **7** | Blood-donor matching, campaign beneficiary dedupe, QR-verified hours, impact page. | Zero real users and no partner (association, دار الشباب, blood centre). Impact is potential, not demonstrated. |
| 4 | AI innovation and technical depth | **6.5** | Structured LLM extraction with an anti-hallucination sanitiser, provider fallback (Claude → Gemini → rules), explainable additive scoring, a measured 30-post evaluation. | One LLM call plus SQL trigram matching is solid engineering, not deep AI. No semantic embeddings active, no images, and the evaluation set was written by the team (not blind). |
| 5 | Technical architecture | **8.5** | Postgres RLS on 46 tables, column grants, security-definer RPCs, 69 pgTAP tests, Realtime, audit log, HMAC QR tokens. Unusually strong for a hackathon. | Judges only notice it if you show it (one architecture slide + "69 security tests"). |
| 6 | Product completeness | **7** | Core loop works end to end (7/7 journeys). | QR is not linked to help requests (clubs only). No "request more info". The skills mismatch in the demo data hides the matching. Several modules are untested in a browser (certificates, chatbot-Gemini, voice, share card). |
| 7 | UX / UI | **7** | New identity (khatam seal), 4-section navigation, phone tab bar, strong `/check` result page, live donor toast. | The admin modal is dense (forms, 11 tabs). French is partial. Some module pages keep the older style. Not yet tested by a real user. |
| 8 | Scalability | **7** | Stateless Next.js + managed Postgres; per-wilaya scoping fits national roll-out. | Free-tier AI quota (Gemini Flash-Lite limits), OSM public tiles (usage policy), Supabase built-in email (a few emails/hour). All are fine for a pilot, not for national scale. |
| 9 | Security and privacy | **8** | RLS tested, phone numbers HMAC-hashed and revealed only after joining (audited), phones masked before going to Gemini, donor identities hidden, consent and deletion flows. | Two secrets were pasted in chat and must be rotated. The Gemini free tier may use the (masked) text. No external review. Law 18-07 / ANPDP declaration not done. |
| 10 | Demonstration quality | **6 → 9 possible** | The journeys work and are scripted (`npm run demo:check`). | No public link, no backup video, no rehearsal, and live AI depends on a free tier during the demo. |
| 11 | Feasibility in Algeria | **7** | Arabic-first, Darija, 69 wilayas, fits the DJSL / دور الشباب structure, offline-capable PWA. | Needs institutional adoption (moderators per wilaya) and a legal/data-controller decision. Not addressed in the product yet beyond docs. |
| 12 | Competitive advantage | **8** | The "is this real?" checker, wilaya moderation and QR-verified impact together are hard to copy in a weekend. | The advantage only exists if the demo makes it visible in under 30 seconds. |

**Estimated overall: 74/100** (weighted average, demo counted at today's 6). With the P0 and P1 items in `WINNING_ROADMAP.md` done and rehearsed: **85–88/100**, which is a realistic winning range.

## Three biggest reasons we could lose
1. **The demo breaks or feels slow live.** There's no public link, the AI runs on a free tier with daily quotas, the venue Wi-Fi may be poor, and logins depend on rate-limited email codes.
2. **"Nice prototype, but who will use it?"** There's no partner letter, no real users, and no field number. Judges reward evidence of demand.
3. **The judges miss the depth.** Too many modules (trees, campaigns, associations, donations…) dilute the story. If the pitch tours features instead of telling one verified-request story, ATHAR looks like "another platform".

## Three strongest reasons we could win
1. **A 20-second "wow" that every judge has lived:** paste a viral post, get "already resolved in 2021, shared 47 times, don't re-share", with the evidence shown.
2. **Responsible AI by design:** the AI never decides alone, never says "fraud", masks phone numbers, has a human moderator per wilaya, and is honestly measured. Juries increasingly reward this.
3. **Real engineering under the hood:** 69 database security tests, live two-device blood alert, QR anti-fraud. It visibly works; it isn't slides.
