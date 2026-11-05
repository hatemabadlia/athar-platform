# What I need from you (credentials and external actions)

Never paste keys into chat. Put them in the environment's secret settings (cloud session) or in `.env.local` / the host's secret store. Variable names are in `.env.example`.

| Priority | Item | Variable(s) | How to get it | Unlocks |
|---|---|---|---|---|
| 1 | Claude API key | `ANTHROPIC_API_KEY` (optional `ATHAR_AI_MODEL`, default `claude-opus-5-5`) | console.anthropic.com → API keys | Real Darija normalisation, extraction, classification; chatbot |
| 1 | Supabase cloud project (or confirmation to stay local) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | supabase.com → new project (EU region is closest to Algeria) → Settings → API. **Tell me if it already holds data**: I will not push migrations to it without your explicit OK | Deployment |
| 1 | Domain name | `NEXT_PUBLIC_SITE_URL` | Your registrar | Certificate QR links, email links, webhooks |
| 1 | Production HMAC secret | `ATHAR_HMAC_SECRET` | `openssl rand -hex 32`, kept secret and **never rotated casually** (rotation breaks phone/beneficiary matching) | — |
| 2 | Cloudflare Turnstile | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | dash.cloudflare.com → Turnstile → add site (free) | Bot protection on `/submit` |
| 2 | SMTP for auth emails | Supabase dashboard → Auth → SMTP | Any transactional email provider | Login codes in production |
| 2 | SMS provider | `SMS_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` (or tell me which Algerian gateway, and I'll write the adapter) | twilio.com; check sender rules for +213 | Crisis SMS, "reply 1", phone OTP |
| 3 | Telegram bot | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` (any random string) | @BotFather → /newbot; then `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<SITE>/api/webhooks/telegram&secret_token=<SECRET>` | Telegram intake |
| 3 | WhatsApp Business Cloud API | `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` | developers.facebook.com → app → WhatsApp → webhook URL `<SITE>/api/webhooks/whatsapp` | WhatsApp intake |
| 3 | Voyage AI key | `VOYAGE_API_KEY` | voyageai.com | Semantic recycled-post detection |
| 3 | Speech-to-text choice | — | Pick a provider (e.g. hosted Whisper) | Darija voice notes (currently disabled) |
| 3 | Meta / X developer apps | — | Only if you want auto-publishing | Branded publishing (not built) |

## External actions only you (or the operator) can do

1. **Official data**: the JO n° 40 (2026) text for wilaya numbers 59–69, an official commune list, and lists of دور الشباب and blood centres (CSV) to import through `/admin → استيراد`.
2. **Blood donation interval**: the official minimum interval from the ANS / a blood centre, with a reference. It is entered as `app_settings.blood_min_interval_days`.
3. **Legal**: a privacy review and the ANPDP declaration under Law 18-07; name the data controller (ministry or association).
4. **First ministry admin**: give me the email address, or run the SQL in the README yourself.
5. **Push authorisation** for `main`, and a deployment target. Nothing has been deployed or merged.
