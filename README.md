# إيثار — Athar Volunteer Intelligence Platform

Interactive frontend prototype for the **National Hackathon for Innovation in Volunteer Work (Algeria)**.

AI-powered volunteer intelligence: ingests social-media posts, structures them into geo-located alerts,
detects **recycled/stale viral calls** against a historical archive, merges duplicates, and surfaces
verified needs on a live map + ministry dashboard.

> No backend, DB, or API keys required — all data is TypeScript mock data + React state persisted to `localStorage`.

## Run

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Routes

| Route     | What it is                                                                                   |
| --------- | -------------------------------------------------------------------------------------------- |
| `/`       | Public volunteer portal — live Leaflet map, category filters, "I can help" flow              |
| `/ingest` | AI processing pipeline demo — paste a post or click a preset scenario, watch it get classified |
| `/admin`  | Ministry / DJSL dashboard — KPI cards, filterable table, approve / reject / resolve actions   |
| `/clubs`  | Youth volunteer clubs hosted at دور الشباب — national leaderboard, join / create a club, impact wall |
| `/trees`  | غابة إيثار — tree-planting social feed with photo upload, admin verification, points and likes |
| `/profile`| Volunteer profile — smart matching (wilaya · blood type · skills), points, badges, certificate |

## Demo script (3 minutes)

1. **`/ingest` → click "منشور معاد تدويره 🏆"** — the Blida relief post is matched against a 2021 archive record
   (12% credibility, "first seen in 2021", recycled 47×). This is the headline feature.
2. Click **"نداء جديد عاجل"** — O+ blood call at Mustapha Pacha → `Blood · Algiers · Critical · 98%`. Save it.
3. Click **"نداء مكرر"** — Tipaza beach cleanup is merged into the existing active event.
4. **`/admin`** — the new pending alert appears with a bell badge; approve it.
5. **`/`** — it's now on the map. Click a pin → "أستطيع المساعدة" → volunteer count updates live.
6. **`/profile`** — create a volunteer profile (O+, Algiers) → "نداءات مناسبة لك" recommends the blood call; join → +100 points, badges.
7. **`/clubs`** — youth clubs at دور الشباب with a national leaderboard; join a club or create one ("مؤسسات الشباب فضاءات للابتكار والتطوع").
8. The ↺ button in the navbar resets the demo data.

## Extra innovations (all working in the prototype)

| Feature | Where | What it demonstrates |
|---|---|---|
| **إيثار بوت** (Darija-aware assistant) | floating button, every page | "وين نتبرع بالدم في وهران؟" → answers from live store data |
| **Live social-media monitor** | `/ingest` top | radar + streaming posts, each scanned & stamped (verified / recycled / duplicate / flagged) |
| **Auto-publish in Athar brand identity** | `/ingest` (toggle + modal) | verified call → branded 1:1 visual + caption + hashtags + tracking link → FB/IG/X/WhatsApp |
| **Darija voice note** | `/ingest` left column | WhatsApp voice → ASR transcript → Darija→MSA lexicon → full pipeline |
| **Crisis mode + SMS without internet** | `/admin` | DJSL activates flood/quake/fire/cold → youth centres become shelters on the map, sitewide banner, SMS broadcast with "reply 1" confirmations (animated phone) |
| **QR attendance check-in** | `/profile` (QR card) + `/clubs` (scanner) | club leader confirms presence → "confirmed points" (anti-fraud) |
| **Closing the loop** | `/` bottom | after-action reports for resolved calls (attended, outcome, hours) |
| **غابة إيثار — tree-planting social feed** | `/trees` + `/admin` review | plant → photo (phone camera) → admin verifies → appears in national forest, +50 pts, 🌳 badge, likes, CO₂ counter, wilaya leaderboard |
| **Predictive needs** | `/admin` sidebar | seasonal forecasts (O- shortage before holidays, wildfire risk, winter clothing) |

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · react-leaflet + OpenStreetMap/CARTO tiles · lucide-react.

## Structure

```
app/            pages: / , /ingest , /admin
components/     ui primitives, map, public portal, ingest pipeline, admin dashboard
lib/
  types.ts        domain types
  mock-data.ts    alerts, historical archive, sample posts, category/urgency metadata
  wilayas.ts      58-wilaya coordinates + Arabic alias detection
  ai-pipeline.ts  simulated NLP: normalization, entity extraction, classification,
                  recycled-content fingerprinting (n-gram Jaccard + phone match), dedupe, scoring
  store.tsx       React context + localStorage persistence
```
