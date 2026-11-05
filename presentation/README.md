# Athar (إيثار): hackathon pitch deck

| File | What it is |
|---|---|
| `ATHAR_HACKATHON_AR.pptx` | The editable deck: 14 slides, 16:9 (13.33″ × 7.5″), Arabic RTL, Tajawal font, speaker notes on every slide, **native PowerPoint transitions and build animations** |
| `ATHAR_SPEAKER_SCRIPT_AR.md` | Per-slide script: what the audience sees, exact words, transition, timing, emphasis and a backup answer. About 8:45 in total |
| `ATHAR_SERVICES_AR.pptx` | **Complete services catalogue**: 15 slides covering all 29 services in 9 domains (see below) |
| `ATHAR_JURY_QA_AR.md` | 20 likely jury questions plus "trap" questions, answered from the real implementation status |
| `preview/` | `ATHAR_HACKATHON_AR.pdf` (LibreOffice render) and `slide-01.jpg` … `slide-14.jpg` |
| `ASSETS/` | Fonts, generated visuals (`gen/`) and real app screenshots (`screens/`) |
| `build/` | Scripts that regenerate everything |

## Services deck: `ATHAR_SERVICES_AR.pptx`

This is a second, separate deck: a complete catalogue of **every** service in the platform. It has 15 slides in the same dark RTL design, with native animations and speaker notes. Previews are in `preview/services/`. Build it with:

```bash
cd presentation/build && node build-services.js
```

- **Single source of truth.** The `S` array in `build-services.js` lists all 29 services, grouped into 9 domains. Each entry has its route, a [lucide](https://lucide.dev) icon (the app's own icon set), a description, and a status taken from `docs/MORNING_REPORT.md`. Every count on the slides (29, 23, 6, and the "n services" pills) is computed from that array, so the deck cannot drift from the list.
- **Slides:**
  1. Cover
  2. The 9 domains, with service numbers and slide references
  3. Users and the 6 roles, from the RLS rules
  4–13. One slide per domain; the humanitarian domain takes two slides. Each one pairs real screenshots with numbered service cards.
  14. Status matrix of all 29 services, plus what is still needed for real operation
  15. Close
- **Status colours:**
  - cyan = "يعمل · مختبَر محلياً" (implemented and tested locally)
  - purple = partial, or waiting for keys, accounts or a provider. The short note on the card names what is missing: Claude key, Telegram/WhatsApp accounts, SMS provider, device test, phone login and French.

| # | Domain | Services |
|---|---|---|
| 1 | Intake and access | 1 Live alert map · 2 Submit an alert · 3 Multi-channel intake · 4 AI assistant |
| 2 | AI analysis | 5 Seven-stage pipeline · 6 Duplicate/recycled detection and credibility score |
| 3 | Moderation and governance | 7 Moderation queue · 8 Live intake queue · 9 Roles and wilaya scopes · 10 Audit/AI logs and CSV import |
| 4 | Volunteer journey | 11 Profile and smart matching · 12 Joining alerts · 13 Clubs and activities · 14 Notifications |
| 5 | Recognition | 15 QR attendance · 16 Points and 8 badges · 17 Certificates and public verification |
| 6 | Humanitarian and environment | 18 Blood donor network · 19 In-kind donations · 20 Verified associations · 21 Solidarity campaigns · 22 Athar forest (trees) |
| 7 | Crisis | 23 Crisis mode, shelters and SMS alerts |
| 8 | Impact and data | 24 After-action reports · 25 Impact transparency and exports · 26 Seasonal forecasts |
| 9 | Privacy and platform | 27 Privacy centre · 28 Offline web app (PWA) · 29 Login and languages |

QA: the services deck passes the validator. I checked every slide in the LibreOffice render and fixed the pill/name collisions, the tile text overlaps, the crisis card titles and a bidi-garbled route. It has 574 entrance effects and only 2 clicks: slide 11 (the facts) and slide 14 (what is still needed). Everything else builds automatically.

## Before presenting

1. **Install Tajawal** on the presenting machine from `ASSETS/fonts/Tajawal-Regular.ttf` and `Tajawal-Bold.ttf`. These are merged Arabic and Latin subsets of Google's Tajawal, under the SIL Open Font License 1.1. Without the font, PowerPoint substitutes another one and line breaks may shift. The PDF in `preview/` has the font embedded and is a safe fallback.
2. **Check the QR code.** It encodes `https://github.com/hatemabadlia/athar-platform`, captioned "مستودع المشروع". Whether that repository is public has **not been verified**. If it is private, or if you have a live demo URL, replace `REPO_URL` in `build/build-deck.js` and rebuild.
3. **Contact details are intentionally absent.** None were verified, so none were invented. Add them on slide 14 if you want them.

## Animations

Every slide has a fade transition. Slides 1 and 14 fade through black. On top of that, 392 native entrance animations build each slide in reading order, right to left. Most of them play **automatically**. The presenter clicks only at 10 "reveal" moments, and each one is marked **[🖱️ نقرة]** in the speaker script.

| Slide | Plays automatically | On click |
|---|---|---|
| 1 Hook | Question fades in slowly, then the "يحتاج / مستعدّ" labels | Logo and "إيثار" line |
| 2 Problem | Picture, then the 6 problems rise one by one | — |
| 3 Story | Label, then card → broken link → card → broken link → card | Punchline "حلقة الوصل" |
| 4 Solution | Athar hub zooms in, links appear, 6 actors pop in one by one | Tagline |
| 5 How it works | 5 steps rise right to left, each arrow wipes in before the next step; step 3 (human review) zooms | "القرار الحسّاس…" callout |
| 6 AI | Darija message → arrow → structured card → fields → capability chips | Real screenshots |
| 7 Platform | 3 screenshots one by one, then the QR card | — |
| 8 Difference | "Today" column, row by row | The whole "مع إيثار" column, row by row |
| 9 Modules | 8 tiles pop in sequence, then the footnote | — |
| 10 Impact | Map, then citizen → municipality → wilaya → national | Empty "—" metrics |
| 11 Tech | Architecture layers and the Claude/pgvector box | ① 69 / 42 / 7 ② privacy list |
| 12 Roadmap | Timeline line wipes right to left, then phases 1 to 5 | — |
| 13 Ask | 6 asks pop in | — |
| 14 Close | Closing sentence fades slowly, then logo, then QR | Final purple sentence |

How it works: pptxgenjs cannot write animations. `build-deck.js` tags shapes with `anim(step, effect, trigger, ms)`, which stores the tag in the shape name. `build/animate.js` then rewrites each slide's XML with a `<p:transition>` and a `<p:timing>` tree. The effects use PowerPoint's own presets: Fade, Float-in ("rise"), Zoom, and Wipe from the right. They stay editable in PowerPoint's Animation Pane. To change an animation, edit the `anim(...)` calls and rebuild. To remove all animations, delete the `require("./animate.js")` line.

Checked: the file passes the validator, and the LibreOffice import shows 14 transitions, 392 entrance effects and exactly 10 click triggers. **Playback in Microsoft PowerPoint itself was not tested in this environment.** Rehearse once in PowerPoint before presenting. Keynote and Google Slides import the transitions but may simplify some effects.

## Honesty rules applied

- No invented statistics, users, partners, endorsements or official logos.
- Every illustrative example is labelled on the slide:
  - slide 3: "سيناريو توضيحي — ليس حالة حقيقية"
  - slide 6: "مثال توضيحي"
- Status is shown per item:
  - "مطوَّر ومختبَر محلياً" (developed and tested locally)
  - "جاهز للتجربة" (ready to pilot)
  - "مخطَّط" (planned)
  - "مدمج — يعمل عند إضافة المفاتيح" for Claude and pgvector, since neither has been verified with a real key.
  - SMS is marked as waiting for a provider.
- The slide 10 map shows the 58 wilaya seats from `lib/wilayas.ts` at their approximate coordinates. It carries **no numbers**, and the metric chips show "—" until real data exists.
- The test counts on slide 11 (69 pgTAP, 42 unit, 7 e2e) come from the last full run recorded in `docs/PROGRESS.md`.
- The roadmap has no dates.

## Asset sources

| Asset | Source |
|---|---|
| `screens/*.png` | **Real screenshots** of the prototype running locally. They were captured by `build/capture.spec.ts`, which creates **fictional demo content through the real UI** with dummy phone numbers `0555 00 00 0x`. No real person's data is used. |
| `gen/bg-*.png`, `fragmented.png`, `algeria-network.png`, `bg-close.png` | Generated by `build/assets.js` (SVG rendered with sharp). The map uses the real wilaya centroid coordinates. |
| `gen/*-top.png`, `pipeline-*.png`, `duplicate-steps.png`, `moderation-modal.png` | Crops of the real screenshots |
| `gen/logo.png` | Rasterised from the app icon `public/icons/icon.svg`. **This is a temporary mark, not a final brand logo.** |
| Photography | **None.** The build environment's network blocked image sites. If you want human photos for slides 1, 3 or 14, use properly licensed photos with consent. Do not use photos of real beneficiaries. |

The interactive map tiles do not appear in the screenshots, because the capture environment could not reach the tile servers. The map exists in the app.

## Regenerate

You need Node 22+, plus LibreOffice and poppler-utils for previews.

```bash
cd presentation/build && npm install
```

1. **(Optional) Re-capture screenshots.** This needs a fresh local stack and the app on :3000; see the root `README.md`.

   ```bash
   npx supabase db reset
   ```

   ```bash
   npx playwright test -c presentation/build/pw.config.ts
   ```

2. **Generated visuals and crops:**

   ```bash
   cd presentation/build && node assets.js
   ```

3. **Deck** (this also runs `animate.js`):

   ```bash
   cd presentation/build && node build-deck.js
   ```

4. **Previews:**

   ```bash
   cd presentation && soffice --headless --convert-to pdf --outdir preview ATHAR_HACKATHON_AR.pptx
   ```

   ```bash
   cd presentation && pdftoppm -jpeg -r 110 preview/ATHAR_HACKATHON_AR.pdf preview/slide
   ```

Implementation notes:

- pptxgenjs writes `rtl="1"` only from the first run's options, so `text()` in `build-deck.js` pushes `rtlMode`, `lang: "ar-DZ"` and the font into **every** run. Without that, mixed-colour Arabic lines render left-to-right.
- Every image has Arabic `altText`, so local file paths do not leak into the file.
- Titles longer than 46 characters drop from 32 pt to 26 pt. LibreOffice ignores `fit: shrink`.

## QA checklist (final render)

Each slide was checked in the LibreOffice render (`preview/`) after the last rebuild. The file validates with the pptx skill validator: "All validations PASSED!". `pdffonts` shows Tajawal Regular and Bold embedded.

| # | Slide | RTL | Overflow / overlap | Contrast | Honesty labels | Notes / fixes made |
|---|---|---|---|---|---|---|
| 1 | Hook | ✓ | ✓ | ✓ | n/a | — |
| 2 | Problem | ✓ | ✓ | ✓ | No stats | — |
| 3 | Human story | ✓ | ✓ | ✓ | "سيناريو توضيحي" | **Fixed:** card titles were overlapping the body text. Taller cards, title box 0.8″ |
| 4 | Solution / ecosystem | ✓ | ✓ | ✓ | n/a | — |
| 5 | How it works | ✓ | ✓ | ✓ | Human review emphasised | Arrows point right to left |
| 6 | AI | ✓ | ✓ | ✓ | "مثال توضيحي" plus "rules mode, no Claude key" caption | **Fixed:** caption pushed into the footer. Images moved up and the caption shortened |
| 7 | Platform | ✓ | ✓ | ✓ | "real screenshots… demo data" | — |
| 8 | Differentiation | ✓ | ✓ | ✓ | No competitor names | **Fixed:** two-line title crowding the table header. Long titles now 26 pt |
| 9 | Modules | ✓ | ✓ | ✓ | Status pill on every tile | **Fixed:** "01"/"05" numbers colliding with titles, titles running into the body, crisis pill overflowing. The pill is now "مطوَّر — SMS بانتظار مزوّد" |
| 10 | Impact map | ✓ | ✓ | ✓ | Metrics "—", 58 wilayas caption | — |
| 11 | Tech and trust | ✓ | ✓ | ✓ | "منجز" vs "مدمج — يعمل عند إضافة المفاتيح" | — |
| 12 | Roadmap | ✓ | ✓ | ✓ | Done / ready / planned, no dates | — |
| 13 | Vision and ask | ✓ | ✓ | ✓ | n/a | **Fixed:** title wrapping into the subtitle (26 pt) |
| 14 | Close | ✓ | ✓ | ✓ | QR labelled "مستودع المشروع" | — |

Known limitations:

- The preview was rendered by LibreOffice. PowerPoint and Keynote shape Arabic slightly differently, so give it a quick pass in PowerPoint with Tajawal installed.
- Some numerals and symbols (✓ ✕ ← and Latin runs) fall back to DejaVuSans or Inter in the LibreOffice render.
