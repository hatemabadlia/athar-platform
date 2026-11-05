import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIpKey, getViewer, rateLimit, verifyTurnstile } from "@/lib/server/guards";
import { enqueueAndProcess } from "@/lib/server/intake";
import { normalizePhone } from "@/lib/pipeline/text";

export const runtime = "nodejs";
import { SUBMISSION_CONSENT_VERSION as CONSENT_VERSION } from "@/lib/consent";

const Body = z.object({
  text: z.string().trim().min(20, "النص قصير جداً").max(5000),
  channel: z.enum(["web_form", "moderator_paste"]).default("web_form"),
  sourceUrl: z.string().url().max(500).optional().or(z.literal("").transform(() => undefined)),
  name: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(20).optional(),
  consent: z.literal(true, { message: "الموافقة مطلوبة" }),
  turnstileToken: z.string().max(4096).optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues.map((i) => i.message) }, { status: 400 });
  }
  const b = parsed.data;
  const viewer = await getViewer();

  if (b.channel === "moderator_paste" && !viewer?.isStaff) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const key = viewer ? `intake:user:${viewer.id}` : `intake:${await clientIpKey()}`;
  const allowed = await rateLimit(key, viewer?.isStaff ? 120 : viewer ? 10 : 5, 600);
  if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  // Anonymous submissions need Turnstile; signed-in users already passed email OTP and are rate-limited per account.
  if (!viewer) {
    const t = await verifyTurnstile(b.turnstileToken);
    if (!t.ok) return NextResponse.json({ error: "captcha_failed" }, { status: 400 });
  }

  let phone: string | null = null;
  if (b.phone) {
    phone = normalizePhone(b.phone);
    if (!phone) return NextResponse.json({ error: "invalid", issues: ["رقم الهاتف غير صالح"] }, { status: 400 });
  }

  const r = await enqueueAndProcess({
    channel: b.channel, text: b.text, sourceUrl: b.sourceUrl ?? null, submitterId: viewer?.id ?? null,
    contact: { name: b.name ?? null, phone }, consentVersion: CONSENT_VERSION,
  });

  // Staff see the full pipeline; the public only sees that their submission was received.
  if (viewer?.isStaff) return NextResponse.json(r, { status: r.error ? 502 : 200 });
  return NextResponse.json({ intakeId: r.intakeId, received: true, queuedForReview: !r.error });
}
