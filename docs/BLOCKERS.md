# Blockers and unresolved issues

| # | Blocker | Impact | What unblocks it |
|---|---|---|---|
| 1 | No network access to `joradp.dz`, `ons.dz`, Wikipedia, OSM extracts | Wilayas 59–69 not seeded; no baladiya dataset | Allow these domains in the environment, or supply the JO n° 40 (2026) text / an ONS commune CSV |
| 2 | No `ANTHROPIC_API_KEY` in this environment | Claude pipeline and chatbot paths are UNVERIFIED (code compiles and follows the SDK docs; rule-based paths are tested) | Add the key as an environment secret, then run one `/ingest` paste and one chat question |
| 3 | No Voyage key, and Hugging Face blocked | No semantic embeddings; trigram/hash/phone matching only | `VOYAGE_API_KEY` (or allow a local model download) |
| 4 | Telegram / WhatsApp / Twilio / Turnstile hosts unreachable and no credentials | Webhooks verified only by code review and signature logic; not end-to-end | Credentials plus a public URL (deployment) |
| 5 | Map tiles (`basemaps.cartocdn.com`) blocked in this sandbox | Map shows grey here; works for real users | none for users; for screenshots, allow the domain |
| 6 | GitHub Actions can't run in this environment | `.github/workflows/ci.yml` is UNVERIFIED | Push and check the first CI run |
| 7 | Docker daemon isn't auto-started in the container | Must run `dockerd &` before `supabase start` (dev environment only) | Environment setup script |
| 8 | Supabase images from `public.ecr.aws` blocked | Use `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io` | Environment variable (dev only) |
