# AI technical audit

## Architecture (as implemented)

```
text ─► mask phones (Gemini only) ─► ONE structured LLM call (Claude if key → Gemini free tier → rules)
     ─► sanitize (drop any phone/blood type/wilaya not literally in the text)
     ─► SQL match_historical (exact hash · trigram · keyed phone hash · pgvector if Voyage key)
     ─► SQL match_active_alerts (same wilaya + category, 21 days)
     ─► scoreCredibility (additive, every factor labelled)  ─► human moderator
     └► /check: verifyVerdict → 5 evidence-based states (active / resolved / recycled / suspicious / insufficient)
```

**Files:**
- `lib/pipeline/{run,check,provider,claude,gemini,heuristic,sanitize,scoring,verify,text}.ts`
- `supabase/migrations/*_matching.sql`

**Model in use today:** `gemini-3.5-flash-lite` (free tier). Fallbacks: `gemini-3.1-flash-lite` → `gemini-3-flash-preview` → `gemini-3.5-flash` → rules. Every call is logged in `ai_runs` (input hash, tokens, latency, success).

**Measured** (`docs/AI_EVAL_RESULTS.md`, 30 posts, 2026-11-04):

| Metric | Result |
|---|---|
| Verdicts | 30/30 |
| Category | 27/30 |
| Wilaya | 29/30 |
| False positives / false negatives | 0 / 0 |
| Median time | 3.2 s (outliers 19 s and 43 s during model fallback) |

## A. Darija understanding

| Question | What happens now | Assessment |
|---|---|---|
| Different Algerian dialects? | The LLM handles Arabic-script Darija and Arabizi. The test set is mostly central/eastern Darija. | Plausible, but **not measured per region** (Oran, Kabyle-influenced, Saharan). |
| Arabic/French mix? | French and Arabizi cases passed. | ✅ on the test set |
| Location, urgency, type, contact? | Schema fields plus sanitiser. Phone numbers come from a local regex (Gemini never sees them). | ✅. Baladiya is free text, not matched to a commune table (none loaded). |
| Spelling mistakes / informal? | The LLM is tolerant. The rules fallback is not (a fixed lexicon of ~40 words). | OK while the LLM is up. **Weak during an outage.** |

**Weakness: the evaluation isn't independent.** Thirty posts written by the same person who wrote the rules.
- **Stronger:** 60–100 real public posts, labelled by someone else, with regional variety.
- **Complexity:** low (data work, 1 day).
- **Jury impact:** high. "Measured on N real posts" is a strong slide.

## B. Duplicate and recycled detection

| Question | Now | Assessment |
|---|---|---|
| Same request, different wording? | Trigram similarity ≥ 0.55 within the same wilaya and category, **or** the same phone number. Reworded eval cases passed, helped by the phone match. | Works when the wording overlaps or the phone is the same. **Heavy paraphrase without a phone would be missed** (no embeddings active). |
| Copied request from a different date? | Exact hash or trigram against the archive, plus a stale-year signal. | ✅ |
| Recycled images? | Not implemented: intake is text only. | ❌ |
| Legitimate update vs duplicate? | An update ("we got 2 donors, still need 1") is treated as a possible duplicate and **suggested** for merge, never auto-deleted. | Safe but unhelpful. |

**Stronger implementations:**
1. **Activate semantic embeddings.** Gemini offers an embeddings endpoint on the free tier, so it can be wired like `embeddings.ts`. That needs a migration if the vector size differs from 1024. Complexity: medium (½–1 day). Impact: medium.
2. **"Update" detection.** Same phone + same wilaya + newer date + changed quantity → link as an update on the original request's timeline instead of flagging it as a duplicate. Complexity: low-medium. Impact: medium (shows nuance).
3. **Image fingerprinting** (perceptual hash of attached images against an archive). Complexity: high (needs image intake). Impact: high wow, but **don't do it before the hackathon.** Mention it as roadmap.

## C. Credibility assessment

**Signals:**
- source channel and verified association
- phone present, wilaya present, institution named, deadline stated
- money transfer requested (−30)
- not a help request (−20)
- stale years (−20)
- archive match (−35), same phone in old content (−5), old case closed (−5)
- possible duplicate
- model confidence (±5)

**Explainable?** Yes. Every factor is a labelled line with its +/− value, shown to moderators. The `/check` page shows the evidence grouped as: in ATHAR's records / warning / in the text / missing.

**Unverified vs fraudulent?** Yes, by design:
- The UI repeats "أداة فرز وليست دليلاً".
- `verify.ts` never uses the words fraud, fake or "كاذب", and a unit test enforces this.
- Money requests are "suspicious → don't share", not "fraud".

**Presents predictions as facts?** Mostly no. One gap: the public alert card shows "راجعه مشرف" (good). But the **three trust levels (AI assessment → human moderation → confirmed on the ground) are not shown as one consistent visual language.** Adding a three-step trust badge would make this obvious to judges. Complexity: low. Impact: high.

## D. Volunteer matching

- **Considers:** wilaya (+3), blood compatibility (+4/+5, incompatible requests are excluded), skills (+2), urgency (+1), availability "anytime" on critical (+1), deadline not passed, request not full. Each match carries readable reasons.
- **Blood rules:** the standard ABO/RhD red-cell table, in the code and in the database. The UI says eligibility is decided by the blood centre. ✅ This is correct for red cells. Plasma and platelets are not modelled, and the UI should keep saying "red cells / whole blood".
- **Sensitive data:** blood type lives in `profile_private` (owner only). Donors are notified **without** their identity being revealed to the moderator (count only). ✅
- **Bug found:** the demo seed's skills ("سياقة", "تمريض", "حمل ونقل"…) aren't in the canonical `SKILLS` list, so the "مهارة مطلوبة" reason never appears in the demo. Fix the seed (30 min). Jury impact: medium (matching looks smarter).
- **Missing for "smart matching":** distance inside a wilaya (no commune data), and a volunteer's track record. Fine to leave for after the hackathon.

## Risks on demo day
- **Free-tier quota or slowness.** Flash-Lite answered in about 2 s today, but the fallback chain produced 19–43 s outliers.
  - **Mitigation:** run `npm run ai:smoke` 1 hour before the pitch.
  - Have a second free key from another Google account ready in `.env`.
  - If the AI fails, the rules fallback still produces a labelled result, and the archive match (SQL) still catches the recycled post. The headline demo survives an AI outage. **Say so if it happens:** it's a feature.
