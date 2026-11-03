# Credentials and infrastructure checklist

Never paste a key into chat, an issue, a commit, a screenshot or a document. Local values go in `.env.local`, which is git-ignored (checked with `git check-ignore .env.local`). Deployed values go in the hosting provider's encrypted environment settings.

_Status as of 2026-11-03: every required item below is still **missing**._

## Required for the hackathon demo

| Variable / item | Purpose | Where it comes from | Where to put it | Blocks |
|---|---|---|---|---|
| Supabase project (EU region) | Database, auth, storage, realtime | supabase.com → New project | — | everything below |
| `NEXT_PUBLIC_SUPABASE_URL` | API URL of the project (public) | Supabase → Project Settings → API | `.env.local` + Vercel | app start |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser key; access is limited by RLS (public) | same page, "anon / publishable" | `.env.local` + Vercel | app start |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret.** Server-only key for the pipeline, webhooks and seed | same page, "service_role / secret" | `.env.local` + Vercel (server only) | intake, check, seed |
| `SUPABASE_DB_PASSWORD` | **Secret.** Pushes migrations (`supabase db push`) | chosen when creating the project | `.env.local` only (never Vercel) | creating the tables |
| `ATHAR_HMAC_SECRET` | **Secret.** Keyed hash of phone numbers and beneficiary IDs. Never rotate it casually | already generated locally (`openssl rand -hex 32`) | `.env.local` + Vercel (same value) | recycled-phone matching, dedupe |
| `ANTHROPIC_API_KEY` | **Secret.** Real Claude analysis + chatbot | console.anthropic.com → API keys | `.env.local` + Vercel | real AI, evaluation |
| `NEXT_PUBLIC_SITE_URL` | Links in QR codes, certificates and share cards | the Vercel URL after the first deploy | Vercel (and `.env.local` = `http://localhost:3000`) | correct share links |
| Supabase Auth → URL configuration | Login emails must return to the right site | Supabase → Authentication → URL Configuration: Site URL + redirect `https://<site>/auth/callback` | Supabase dashboard | login on the public site |
| Vercel account + `vercel login` | Public deployment | vercel.com (sign in with GitHub) | terminal: `! npx vercel login` | public link |

## Recommended for production (optional for the demo)

| Variable | Purpose | Without it |
|---|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Bot protection on the anonymous form | Anonymous submissions are refused in production unless `ATHAR_DEV_ALLOW_NO_CAPTCHA=true` on a non-production Vercel environment. The checker and signed-in users work either way |
| SMTP (Supabase → Auth → SMTP) | Reliable login emails | Supabase's built-in mailer, which is rate-limited (a few emails per hour). Fine for a demo with pre-created accounts |
| `VOYAGE_API_KEY` | Semantic (meaning-based) recycled detection | Text + hash + phone matching only |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` | Telegram intake | Channel shown as "not configured" |
| `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` | WhatsApp intake | Channel shown as "not configured" |
| `SMS_PROVIDER=twilio` + `TWILIO_*`, `SMS_WEBHOOK_SECRET` | Real crisis SMS | Console provider: messages are recorded, not sent |
| `CRON_SECRET` | Protects `/api/cron/*` | already generated locally |

## Blocked right now (and what unblocks it)

| Task | Unblocked by |
|---|---|
| Push migrations, run database security tests, seed demo data | Supabase project + the 4 Supabase values above |
| Browser test of every journey | Same |
| Real Claude run + 30-post evaluation (`npm run eval:ai`) | Supabase + `ANTHROPIC_API_KEY` |
| Two-session blood-alert test | Supabase (+ login emails) |
| Public deployment | Vercel login + the same variables in Vercel |
