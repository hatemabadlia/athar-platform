# Winning roadmap

## End-to-end journeys: what breaks or confuses

**User 1: person asking for help**
1. Writes the request on `/submit`, typed or by voice. ✅ AI extraction happens server-side. ✅
2. ⚠️ Anonymous submitters get "وصلنا نداؤك", then **nothing**: no tracking link, no status, no way to answer a moderator's question.
3. ⚠️ Moderators can't **request more information**; they can only approve or reject.
4. Approved → appears on the map. ✅
5. Completion: a report can be filed by the owner or a club lead (`submitReport`) and then resolved. ✅ (Not exercised in today's browser run.)

**User 2: volunteer**
1. Account via email code. ⚠️ Built-in email sends only a few per hour, so this is fragile live.
2. Profile: wilaya, skills, blood type. ✅ ⚠️ Demo volunteers' skills don't match the canonical list.
3. Suggested requests with reasons. ✅
4. "أستطيع المساعدة" → contact revealed, with consent. ✅
5. ⚠️ **QR is not available for help requests.** Attendance for a request is a moderator's "حضر" click. QR only works for club activities, so the story "accept mission → QR check-in" breaks.
6. Points after confirmation → certificate → public `/verify`. ✅ (backend tested)

**User 3: moderator**
1. Queue limited to their wilaya. ✅
2. AI evidence: original text, MSA, reasons with +/−, duplicate/recycled flags. ✅ The modal is dense.
3. Approve / reject / merge / resolve / reopen, plus donor alert. ✅ ⚠️ No "need more info".
4. Tracking: volunteers list with present/absent. ✅ ⚠️ No single timeline view of a request's history.
5. Close with a report. ✅

## P0: must fix before submission
| # | Problem | Solution | Files | Diff. | Time | Jury +pts | Acceptance |
|---|---|---|---|---|---|---|---|
| P0-1 | No public link | Deploy to Vercel (London region, next to Supabase); set env vars; Supabase Auth URL config | `next.config.ts`, Vercel, Supabase dashboard | Low | 1–2 h | +5 (demo) | Public URL passes `BASE_URL=<url> npm run demo:check` 7/7 |
| P0-2 | Secrets exposed in chat | Rotate the DB password and the Gemini key | `.env.local`, Vercel | Low | 15 min | risk | Old values no longer work |
| P0-3 | Demo logins rely on email codes | Log the 3 demo roles in on the demo devices beforehand; keep a token_hash login helper for rehearsal only; add SMTP if possible | `scripts/demo-journeys.ts`, Supabase SMTP | Low | 30 min | risk | All demo devices already signed in |
| P0-4 | Matching looks dumb in the demo | Use canonical `SKILLS` in the seed; re-seed | `scripts/seed-demo.ts` | Low | 30 min | +1 | Volunteer sees "مهارة مطلوبة: …" reasons |
| P0-5 | Free AI quota or latency on stage | `npm run ai:smoke` 1 h before; a second free key ready; rehearse the "AI is down, SQL still catches it" line | `.env.local` | Low | 15 min | risk | Smoke passes < 5 s per post |
| P0-6 | No backup if the venue internet dies | Record a 3-minute screen video of the full demo; keep screenshots in the deck | — | Low | 1 h | risk | Video plays offline |
| P0-7 | Work is only on one laptop | Push the branch to GitHub; tag `hackathon-v1` | git | Low | 5 min | risk | Commit visible on GitHub |

## P1: high impact
| # | Problem | Solution | Files | Diff. | Time | Jury +pts | Acceptance |
|---|---|---|---|---|---|---|---|
| P1-1 | Trust levels are invisible | Three-step trust badge (AI → moderator → confirmed) on alert cards, the alert detail and `/check` | `components/public/alert-card.tsx`, `app/check/checker.tsx`, new `components/trust-badge.tsx` | Low | 3 h | +3 | Every request shows its exact level; nothing AI-only looks "verified" |
| P1-2 | QR doesn't cover help requests | "Start mission check-in" button for the moderator/owner on an approved request → creates `club_activities` with `alert_id`; the volunteer shows the existing profile QR; check-in confirms `alert_volunteers` too | `app/actions/clubs.ts`, admin modal, `check_in` RPC (+ migration), tests | Med | 1 day | +3 | Journey: join request → QR scan → confirmed → points → certificate |
| P1-3 | Request history is hidden | Public "سجل التحقق" timeline per request (received via X, AI verdict, approved by wilaya moderator at T, N volunteers confirmed, resolved + report) from `audit_log`/`alert_sources`/`reports` | new `app/alerts/[id]/page.tsx`, a SQL view with safe columns | Med | 1 day | +3 | Opening a shared link shows the timeline without personal data |
| P1-4 | Moderator can't ask for details | Action "طلب معلومات" → status `needs_info` + message to the signed-in submitter (notification) | migration (enum + RPC), admin modal, notifications | Med | ½ day | +1 | Submitter gets a notification; the request leaves the queue until answered |
| P1-5 | Evaluation is self-made | 60–100 real public posts labelled by a teammate; re-run `eval:ai` on that file | `tests/eval/real-*.json` | Low (data) | 1 day | +2 | New results file + one slide |

## P2: competitive advantages
| # | Idea | Files | Diff. | Time | Acceptance |
|---|---|---|---|---|---|
| P2-1 | Wilaya gap view on `/impact` (open needs vs registered compatible donors/volunteers) | `app/impact/page.tsx`, SQL view | Med | ½–1 day | Map/table highlights under-served wilayas |
| P2-2 | "Update, not duplicate" (same phone + changed quantity → update on the timeline) | `lib/pipeline/scoring.ts`, `run.ts` | Med | ½ day | Re-posted progress messages appear as updates |
| P2-3 | Semantic duplicates with free Gemini embeddings | `lib/pipeline/embeddings.ts`, migration (vector size) | Med | ½–1 day | A paraphrase with no shared phone is detected in tests |
| P2-4 | Simplify the admin modal (tabs: الأدلة / تصحيح / المتطوعون / القرار) | `components/admin/moderation-queue.tsx` | Low | ½ day | Moderator decides without scrolling |

## P3: after the hackathon (don't start now)
Recycled-image fingerprinting · live Telegram/WhatsApp bots · real SMS · full French UI · commune-level locations · volunteer reputation · native app · Law 18-07 / ANPDP process · paid AI tier.

**Order of work:** P0-2, P0-7, P0-4, P0-1, P0-3/5/6 (day 1) → P1-1, P1-2 (day 2) → P1-3 (day 3) → rehearse ×3 → P1-4 / P1-5 / P2 only if time remains.
