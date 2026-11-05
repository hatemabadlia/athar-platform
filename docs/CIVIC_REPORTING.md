# صوّر وبلّغ | Swer w Blaghi — ATHAR civic reporting

> "شفت مشكل؟ صوّرو، بلّغ عليه، وساهم في إصلاح منطقتك."

Citizens document public-space problems (potholes, lighting, waste, water leaks, sidewalks, signs, open manholes, dangerous wires, drainage, abandoned spaces). Wilaya moderators verify them; neighbours support them; everyone follows the resolution.

**Kept separate from humanitarian requests:** separate tables, statuses and severity, with no credibility score.

## Pages

| Route | What it is |
|---|---|
| `/civic` | Landing: tagline, real counters (`civic_stats`), how it works, latest verified reports, emergency warning |
| `/civic/new` | Report in under a minute: photo(s) → AI suggestion → GPS / map / search → details → duplicate check → confirmation with reference |
| `/civic/map` | Public map: category-styled markers with a status ring, screen-grid clustering, filters (category, status, wilaya), area search, details panel, list view |
| `/civic/r/[ref]` | Details: photos (when allowed), trust ladder, status path, timeline, support / still-exists / add info / flag / share; reporter's reply when info is requested |
| `/civic/mine` | My reports and their status |
| `/admin?tab=civic` | Moderators: KPIs and analytics, filters, report drawer (photos, AI suggestion, private signals, citizen flags, transitions, photo publish toggle, forwarding with authority, resolution evidence, internal notes, full history) |

Navigation entry points:
- the sidebar group "صوّر وبلّغ"
- the "تطوّع" hub card
- the homepage banner

## Workflow (enforced in `public.civic_set_status`)

```
pending_review → verified | needs_info | rejected | duplicate
needs_info     → pending_review (reporter replies) | verified | rejected | duplicate
verified       → forwarded* | in_progress | resolved | duplicate | rejected
forwarded      → in_progress | resolved          in_progress → resolved
resolved       → closed | in_progress            rejected / duplicate → pending_review
```

- `*` **forwarded** requires naming the authority and channel. ATHAR never claims an authority received a report otherwise, and the UI says so.
- Every change goes to `civic_report_events` (with actor role) and to `audit_log`.
- The reporter is notified. Supporters are notified when a report is resolved.

## Trust and anti-abuse

- **AI is a suggestion only.** It never rejects or verifies anything. It reports only what's visible, never "fake". If it fails or is too slow (more than about 24 s), the form continues with manual classification.
- **Duplicates:**
  - `civic_nearby` checks distance (150 m, haversine), category, and a **64-bit perceptual hash** (Hamming ≤ 6). The hash also catches the same photo re-used anywhere in the country.
  - The citizen chooses to *support the existing report* or *send a different one*. Nothing is ever merged automatically.
- **Private moderator signals:**
  - distance between where the photo's EXIF says it was taken and the chosen point
  - photo age
  - a recycled-photo match
  - AI flags for faces, number plates or private property
  - whether the user changed the AI's category
- **Rate and abuse limits:** 10 reports per user per day (database), 6 per 10 minutes (server), 30 AI analyses per hour, 3 comments per report, one support and one confirmation per person, abuse flags.

## Privacy

- Sign-in is required to report. The reporter's identity is never exposed: the public view `civic_public_reports` has no reporter column.
- EXIF metadata is removed by re-encoding the image in the browser before upload.
- Photos live in the private `civic-photos` bucket. They're readable by the uploader, the wilaya's moderators, and the public **only after verification and an explicit "allow photo" decision** (`civic_photo_readable`).
- Face and plate blurring is **not automated**. The AI flags them and the moderator decides.
- GPS is read once, only when the user taps the button. There's no tracking.

## AI (implemented)

- **Function:** `analyzeCivicPhoto` (`lib/pipeline/civic-vision.ts`). It uses Claude when `ANTHROPIC_API_KEY` is set, otherwise Gemini (`GEMINI_API_KEY`, free tier), with structured output (Zod).
- **Returns:** category, visible description, severity, safety risks, people/plates flag, private-property flag, confidence, notes for the moderator.
- **Measured on 3 freely licensed Wikimedia Commons photos (2026-11-05):**

  | Photo | Result | Time |
  |---|---|---|
  | Pothole | `road`, `danger`, "a deep hole full of water in the middle of the road" | 3.5 s |
  | Garbage | `waste`, `medium` | 1.8 s |
  | Close-up of a sticker on a lamp post | category `null`, `is_public_issue=false` (honest) | 1.8 s |

  This is a smoke test, not an accuracy study.

## Tests executed

| Suite | Result |
|---|---|
| pgTAP `006_civic.test.sql` on the cloud DB | **22/22**: privacy before verification, raw rows hidden, pending description hidden in duplicates, cross-wilaya refused, invalid transitions refused, forwarding needs an authority, internal notes never public, photo unreadable before publication and readable after, one support per person, reporter can't support own report, notification sent, recycled photo found 400 km away |
| All pgTAP files | **106/106** |
| `npm run civic:check` (real Chrome, cloud DB, real Gemini) | **13/13**: anonymous AI call refused · AI recognised the pothole · submit with reference · duplicate detected for a second citizen · support instead of duplicate · wilaya 16 + pending · moderator verifies · forwarding refused without authority · resolved with photo public and forwarding recorded · 6 history events · public page shows photo and timeline · marker on the public map · 3 notifications to the reporter |
| Unit (`vitest`) | 69/69 (6 civic) |
| Lint / typecheck / build | clean |

Bugs found and fixed while testing:
- Published photos weren't readable publicly (the storage policy ran with anonymous rights). Fixed with a `SECURITY DEFINER` helper.
- The helper then returned NULL instead of false for anonymous callers. Fixed.
- AI analysis was lost if a photo was picked before the page was fully interactive. Fixed by triggering it from an effect.
- Moderator buttons stayed disabled during the background refresh. Fixed with a separate busy flag.
- The shared `Modal` had no dialog semantics. Added `role="dialog"`, `aria-modal` and a labelled close button.

## Known limitations

- No official municipal integration. "Forwarded" is a manual moderator record.
- No automatic face or plate blurring; it's the moderator's decision.
- Wilaya is the nearest wilaya seat to the GPS point, which is approximate near borders, because boundary polygons aren't loaded.
- Address lookup and place search use public OpenStreetMap Nominatim, which is light-use only and needs a provider or self-hosting at scale.
- Clustering is a simple screen-grid algorithm, fine for hundreds of reports.
- Camera capture on real phones, HEIC photos from iPhones (depends on browser support), and offline submission are **not tested on devices**.
- French UI isn't done for the civic pages (Arabic only).
- No push or SMS notifications: in-app only, delivered live.
