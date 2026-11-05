import { NextResponse } from "next/server";
import { z } from "zod";
import { getViewer, rateLimit } from "@/lib/server/guards";
import { analyzeCivicPhoto } from "@/lib/pipeline/civic-vision";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sha256 } from "@/lib/pipeline/hash";

export const runtime = "nodejs";

// ≤ ~1.4 MB of base64 (the browser re-encodes photos to ≤1280 px JPEG before sending)
const Body = z.object({ image: z.string().max(2_000_000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/) });

/** AI suggestion for a civic photo. Nothing is stored except a hashed audit row; the photo itself is not kept here. */
export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "auth" }, { status: 401 });
  if (!(await rateLimit(`civic-ai:${viewer.id}`, 30, 3600))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  const [, mime, data] = parsed.data.image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/)!;
  const started = performance.now();
  try {
    const r = await analyzeCivicPhoto(mime as "image/jpeg", data);
    if (!r) return NextResponse.json({ mode: "manual", suggestion: null });
    await supabaseAdmin().from("ai_runs").insert({ stage: "civic_vision", mode: r.mode, model: r.model, input_hash: sha256(data.slice(0, 20000)),
      latency_ms: Math.round(performance.now() - started), input_tokens: r.inputTokens, output_tokens: r.outputTokens, success: true });
    return NextResponse.json({ mode: r.mode, model: r.model, suggestion: r.vision });
  } catch (e) {
    await supabaseAdmin().from("ai_runs").insert({ stage: "civic_vision", mode: "gemini", input_hash: sha256(data.slice(0, 20000)),
      latency_ms: Math.round(performance.now() - started), success: false, error: String(e).slice(0, 300) });
    return NextResponse.json({ mode: "manual", suggestion: null, unavailable: true });
  }
}
