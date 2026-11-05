# Reference data sources

Verification date of this document: 2026-11-01. "Verified" means checked line by line against the primary official text **in this project**. Nothing below is verified to that standard yet, and each row says why.

| Dataset | Where | Source | Licence | Status | Refresh |
|---|---|---|---|---|---|
| Wilayas 1–48 (codes, AR/FR names) | `supabase/migrations/*_reference_seed.sql`, `lib/wilayas.ts` | Law 84-09 of 4 February 1984 on the territorial organisation of the country | Official text (public) | Seeded, `verified=false`. These codes are widely documented, but I didn't have access to the JORADP text from the build environment | A ministry admin flips `verified` after checking. Update via SQL or migration |
| Wilayas 49–58 | same | Law 19-12 of 11 December 2019 (amending Law 84-09) | Official text | Seeded, `verified=false` | same |
| Wilayas 59–69 (2026 reform) | seeded (`20261103000100_wilayas_2026.sql`, verified=false); numbering cross-checked between Algerie360 (citing JO n° 40) and Wikipedia (citing TSA) | The territorial organisation law (Journal officiel 2026, n° 25) raises the total to 69 wilayas; a presidential decree (JO n° 40, 2026) set the names, chief towns and numbers. Secondary sources (Algerie360, TSA, Elbilad) agree on the 11 names (Aflou, Barika, El Kantara, Bir El Ater, El Aricha, Ksar Chellala, Aïn Oussara, Messaad, Ksar El Boukhari, Bou Saâda, El Abiodh Sidi Cheikh) but **disagree on which number goes with which** | Official text | **BLOCKED**: joradp.dz was unreachable from the build environment, so the numbering couldn't be confirmed | Add a migration with the 11 rows once someone checks JO n° 40. The 2026 reform also moved communes between parent wilayas, so `baladiyas.wilaya_code` must follow |
| Wilaya coordinates | same | Approximate chef-lieu positions (±0.05°) compiled by the developer | n/a | For map centring only, never used for analytics | Replace with an official or OSM centroid dataset if needed |
| Baladiyas (communes) | `baladiyas` table | **Empty.** Candidates: ONS (Office National des Statistiques) commune list; JORADP; OpenStreetMap `admin_level=8` (ODbL, attribution required) | depends | **BLOCKED** on network access to a source | Admin CSV import: `/admin → استيراد → البلديات` (stores the stated source on every row) |
| Institutions (دور الشباب, blood centres, hospitals…) | `institutions` table | **Empty.** No public machine-readable official list was found | n/a | Waiting for a list from the Ministry of Youth / DJSL or the ANS | Admin CSV import, with the source stated |
| Shelters | `shelters` table | **Empty.** Entered by DJSL admins for real institutions | n/a | — | Admin UI or CSV |
| Recycled-post archive | `historical_posts` | Only real content: alerts resolved or recycled on the platform, plus admin CSV imports of posts the team actually observed | n/a | Starts empty | Grows automatically; CSV import |
| ABO/RhD red-cell compatibility | `blood_compatibility`, `lib/matching.ts` | Standard transfusion reference (WHO *The Clinical Use of Blood*; AABB Technical Manual). Red cells only; plasma and platelets differ | — | Standard rules, encoded twice (SQL + TS) and unit-tested | Static |
| Blood donation minimum interval | `app_settings.blood_min_interval_days` | **Not set.** Must come from the Agence Nationale du Sang / a blood-centre policy | — | Not shown to users until set with a source | Ministry admin sets the value and source |
| Categories, crisis SMS templates, tree species, skills, badges | `categories`, `lib/reference/meta.ts` | Product definitions | — | — | Code |
| Map tiles | CARTO basemaps over OpenStreetMap data | © OpenStreetMap contributors (ODbL), © CARTO | Attribution shown on the map | — | — |

## External APIs: terms to re-check before go-live

| API | Terms to confirm |
|---|---|
| Anthropic Claude | Commercial terms, data retention, and whether personal data may be sent (we send message text only) |
| Voyage AI | Same as above |
| Telegram Bot API | Bots receive only messages sent to them or posted in groups that added them. No scraping |
| WhatsApp Business Cloud API | Business verification, opt-in rules, template rules for outbound messages (inbound only here) |
| Meta Graph / X APIs | Not integrated (auto-publishing isn't built) |
| Twilio or an Algerian SMS gateway | Sender ID registration for Algeria, pricing, consent requirements |
| Cloudflare Turnstile | Free tier terms |
