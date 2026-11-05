# Security, privacy and trust audit

ATHAR handles phone numbers, blood types and locations of vulnerable people. Findings are ranked by severity.

## 🔴 Act now
| Issue | Evidence | Fix |
|---|---|---|
| **Database password pasted in chat** | conversation of 2026-11-04 | Supabase → Database → Reset password; update `.env.local` (and later Vercel). |
| **Gemini API key pasted in chat** | conversation of 2026-11-03 | AI Studio → delete key → create a new one → `.env.local`. |
| Exposed `service_role` key would bypass every security rule | currently only in `.env.local` (git-ignored, checked) | Never paste it anywhere. On Vercel it's a server-only variable (no `NEXT_PUBLIC_` prefix). ✅ correct today |

## 🟢 Strong (verified)
- **RLS on all 46 public tables.** Checked: 0 tables without RLS. 69 pgTAP tests pass on the cloud database (cross-wilaya reads blocked, phone access, QR replay/tamper/self check-in, points exactly once, certificate tamper).
- **Role-based access control is enforced in Postgres**, not in the browser:
  - `can_moderate(w)`, `can_administer(w)`, `is_ministry()`.
  - Roles can only change through `grant_role` / `revoke_role` RPCs.
- **Phone privacy:**
  - Numbers are stored HMAC-hashed for matching, and the raw number sits in `alert_contacts`.
  - Volunteers see it only after joining, with consent.
  - Moderator reveal is audited.
  - The share card and `/check` never include a phone number (the API response was checked).
- **Donor privacy:** `notify_compatible_donors` returns a count only, is throttled to once per 6 h per alert, and is audited.
- **Location privacy:** people's requests are shown at the **wilaya centroid**, never a home address.
- **AI data minimisation:** phone numbers are masked before text goes to Gemini (unit-tested). Only a hash of the input is logged in `ai_runs`.
- **AI hallucinations:** `sanitize.ts` drops any phone, blood type or wilaya not literally present in the source text.
- **QR abuse:** tokens are HMAC-signed, expire after 5 minutes, are single use (`used_qr_nonces`), can't be self-scanned, and only a club lead or moderator can scan.
- **Rate limiting:** intake 5/10 min anonymous, 10 signed in; `/api/verify` 8/10 min anonymous; chat 15/10 min. IPs are stored hashed.
- **Security headers / CSP:** a strict allow-list (self, Supabase, OSM tiles, Turnstile).
- **Audit log** for moderation decisions, role changes, contact reveals and donor notifications.

## 🟡 Gaps to close before a real pilot (not blockers for the demo)
| Gap | Risk | Practical safeguard |
|---|---|---|
| Turnstile not configured | Bot spam on the anonymous form in production (the code refuses anonymous submissions in production without it) | Free Cloudflare Turnstile keys, or keep the demo at "signed-in submit + anonymous `/check`" |
| Supabase built-in email (a few/hour) | Login codes stop arriving during the demo | Log demo accounts in **before** the pitch; configure free SMTP (Brevo/Resend) for the pilot |
| Gemini free tier may use submitted text | Privacy perception | Phones already masked. State it on `/privacy` (done). Move to a paid tier / Claude for the pilot |
| OSM public tiles | Usage policy limits heavy traffic | Fine for the demo; a tile provider plan for production (one-line change in `lib/map-tiles.ts`) |
| Fake requests by signed-in users | Spam into moderation queues | Rate limit exists. Add per-account reputation and verified-association priority (exists) |
| Raw intake text retention | Personal data kept indefinitely | A daily `pg_cron` job exists. Set an explicit retention period for `intake_items.raw_text` |
| Wilayas 59–69 `verified=false` | Wrong scoping if the numbering is wrong | Check against the JORADP text |
| No external security review / Law 18-07 declaration | Legal | Name a data controller (ministry or association); ANPDP declaration before any real data |

## AI vs human vs confirmed: the trust ladder (rule for UI and pitch)
1. **AI assessment:** triage only. Labelled "تحليل آلي" with the model name. **Never auto-reject, never auto-publish.** The code always creates `pending` alerts; nothing goes public without a moderator.
2. **Human moderation:** the wilaya moderator approves, rejects or merges, and the decision is audited. The public badge "راجعه مشرف" means only that.
3. **Confirmed on the ground:** volunteers confirmed present (QR or moderator), plus an after-action report approved. Only this level feeds points, certificates and impact numbers.

Recommendation (P1): show this ladder as one consistent three-step badge on alerts and on `/check`.
