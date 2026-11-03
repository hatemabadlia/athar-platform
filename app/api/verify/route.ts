import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIpKey, getViewer, rateLimit } from "@/lib/server/guards";
import { checkPost } from "@/lib/pipeline/check";

export const runtime = "nodejs";

const Body = z.object({ text: z.string().trim().min(20, "النص قصير جداً").max(5000, "النص طويل جداً") });

/** Public, read-only "Is this post real?" check. Stores nothing but a hashed audit row. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.issues.map((i) => i.message) }, { status: 400 });
  const viewer = await getViewer();
  const key = viewer ? `verify:user:${viewer.id}` : `verify:${await clientIpKey()}`;
  if (!(await rateLimit(key, viewer ? 30 : 8, 600))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  try {
    return NextResponse.json(await checkPost(parsed.data.text));
  } catch (e) {
    console.error("verify failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
