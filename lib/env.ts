import { z } from "zod";

/**
 * Environment validation. Public values are inlined by Next at build time, so they are
 * read explicitly. Optional integrations are optional here: missing ones put the feature
 * in a clearly labelled "not configured" state instead of failing the app.
 */
const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optional = () => z.preprocess(emptyToUndefined, z.string().min(1).optional());

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.preprocess(emptyToUndefined, z.string().url().default("http://localhost:3000")),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optional(),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  // Keyed hash for phone numbers / beneficiary identifiers. Must be long and secret in production.
  ATHAR_HMAC_SECRET: z.string().min(32),
  ANTHROPIC_API_KEY: optional(),
  ATHAR_AI_MODEL: z.preprocess(emptyToUndefined, z.string().default("claude-opus-5-5")),
  VOYAGE_API_KEY: optional(),
  TURNSTILE_SECRET_KEY: optional(),
  TELEGRAM_BOT_TOKEN: optional(),
  TELEGRAM_WEBHOOK_SECRET: optional(),
  WHATSAPP_VERIFY_TOKEN: optional(),
  WHATSAPP_APP_SECRET: optional(),
  SMS_PROVIDER: z.preprocess(emptyToUndefined, z.enum(["console", "twilio"]).default("console")),
  TWILIO_ACCOUNT_SID: optional(),
  TWILIO_AUTH_TOKEN: optional(),
  TWILIO_FROM_NUMBER: optional(),
  SMS_WEBHOOK_SECRET: optional(),
  CRON_SECRET: optional(),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

function format(err: z.ZodError) {
  return err.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
}

export function publicEnv(): PublicEnv {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  });
  if (!parsed.success) throw new Error(`Invalid public environment (see .env.example):\n${format(parsed.error)}`);
  return parsed.data;
}

let cached: ServerEnv | null = null;
export function serverEnv(): ServerEnv {
  if (typeof window !== "undefined") throw new Error("serverEnv() called in the browser");
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) throw new Error(`Invalid server environment (see .env.example):\n${format(parsed.error)}`);
  cached = parsed.data;
  return cached;
}

/** Integration status shown in the admin "Integrations" panel. Never exposes values. */
export function integrationStatus() {
  const e = serverEnv();
  return {
    claude: !!e.ANTHROPIC_API_KEY,
    embeddings: !!e.VOYAGE_API_KEY,
    turnstile: !!(e.TURNSTILE_SECRET_KEY && e.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
    telegram: !!(e.TELEGRAM_BOT_TOKEN && e.TELEGRAM_WEBHOOK_SECRET),
    whatsapp: !!(e.WHATSAPP_VERIFY_TOKEN && e.WHATSAPP_APP_SECRET),
    sms: e.SMS_PROVIDER === "twilio" && !!(e.TWILIO_ACCOUNT_SID && e.TWILIO_AUTH_TOKEN && e.TWILIO_FROM_NUMBER),
    smsProvider: e.SMS_PROVIDER,
    model: e.ATHAR_AI_MODEL,
  };
}
