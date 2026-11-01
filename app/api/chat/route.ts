import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { clientIpKey, getViewer, rateLimit } from "@/lib/server/guards";
import { TOOL_DEFS, runTool, searchAlerts, myPoints, listClubs, crisisInfo } from "@/lib/chat/tools";
import { detectWilaya } from "@/lib/wilayas";
import { extractBloodType } from "@/lib/pipeline/text";
import { normalizeDarija } from "@/lib/pipeline/heuristic";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sha256 } from "@/lib/pipeline/hash";
import type { PublicAlert } from "@/lib/types";

export const runtime = "nodejs";

const Body = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).min(1).max(20),
});

const SYSTEM = `You are "إيثار بوت", the assistant of Athar, an Algerian volunteering platform.
- Reply in the user's language and dialect: Algerian Darija if they write Darija, MSA or French otherwise. Be brief and warm.
- For ANY question about needs, alerts, blood donation, clubs, emergencies or the user's points, call the tools. Only mention alerts, clubs, shelters or numbers that a tool returned. If a tool returns nothing, say clearly that no verified information is available right now — never invent alerts, donors, places or phone numbers.
- Alerts shown to the user are rendered as cards from the tool results, so do not repeat every detail.
- You cannot perform actions (join, donate, approve). Point users to the right page: / (map), /submit (send an alert), /clubs, /trees, /profile.
- Blood eligibility and transfusion decisions belong to blood centres and doctors; say so if asked.
- Wilaya codes: use the official Algerian code (e.g. Alger 16, Oran 31, Constantine 25, Blida 9).`;

type Reply = { text: string; alerts: PublicAlert[]; links: { href: string; label: string }[]; mode: "claude" | "rules" };

async function rulesReply(q: string): Promise<Reply> {
  const n = normalizeDarija(q).text;
  const w = detectWilaya(n);
  const blood = extractBloodType(q);
  if (/طوارئ|كارثة|فيضان|زلزال|حريق|ماوى|مأوى|إيواء/.test(n)) {
    const r = (await crisisInfo({ wilaya_code: w?.code })).json as { active_crises: unknown[]; open_shelters: { name: string }[] };
    if (!r.active_crises.length) return { text: "ما كاين حتى حالة طوارئ معلنة على إيثار دروك.", alerts: [], links: [], mode: "rules" };
    return { text: `كاين ${r.active_crises.length} حالة طوارئ معلنة.${r.open_shelters.length ? ` المراكز المفتوحة: ${r.open_shelters.map((s) => s.name).join("، ")}.` : " ما تسجلش حتى مركز إيواء مفتوح بعد."}`, alerts: [], links: [{ href: "/", label: "الخريطة" }], mode: "rules" };
  }
  if (/نقاط|نقطة|شارة|ساعات|شهادة/.test(n)) {
    const r = (await myPoints()).json as { signed_in: boolean; points?: number; hours?: number };
    if (!r.signed_in) return { text: "لازم تدخل لحسابك باش نشوفلك نقاطك.", alerts: [], links: [{ href: "/login", label: "دخول" }], mode: "rules" };
    return { text: `عندك ${r.points ?? 0} نقطة مؤكدة و${r.hours ?? 0} ساعة تطوع مؤكدة. النقاط تتحسب غير بعد تأكيد الحضور.`, alerts: [], links: [{ href: "/profile", label: "ملفي" }], mode: "rules" };
  }
  if (/نادي|نوادي|دار الشباب/.test(n)) {
    const r = (await listClubs({ wilaya_code: w?.code })).json as { count: number; clubs: { name: string }[] };
    return { text: r.count ? `لقيت ${r.count} نادي${w ? ` في ${w.nameAr}` : ""}: ${r.clubs.map((c) => c.name).join("، ")}.` : `ما كاين حتى نادي مسجل${w ? ` في ${w.nameAr}` : ""} بعد — تقدر تنشئ واحد.`, alerts: [], links: [{ href: "/clubs", label: "النوادي" }], mode: "rules" };
  }
  const isBlood = /دم|فصيل|تبرع/.test(n) || !!blood;
  const r = await searchAlerts({ wilaya_code: w?.code, category: isBlood ? "blood" : undefined, donor_blood_type: blood ?? undefined });
  if (!r.alerts?.length) return { text: `ما كاين حتى نداء معتمد${isBlood ? " للتبرع بالدم" : ""}${w ? ` في ${w.nameAr}` : ""} دروك. نخبروك كي يطلع واحد.`, alerts: [], links: [{ href: "/", label: "الخريطة" }], mode: "rules" };
  return { text: `هذو النداءات المعتمدة${w ? ` في ${w.nameAr}` : ""}${blood ? ` المتوافقة مع فصيلتك ${blood}` : ""}:`, alerts: r.alerts.slice(0, 3), links: [], mode: "rules" };
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const viewer = await getViewer();
  const key = viewer ? `chat:user:${viewer.id}` : `chat:${await clientIpKey()}`;
  if (!(await rateLimit(key, viewer ? 40 : 15, 600))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const msgs = parsed.data.messages;
  const last = msgs[msgs.length - 1];
  if (last.role !== "user") return NextResponse.json({ error: "invalid" }, { status: 400 });

  const env = serverEnv();
  if (!env.ANTHROPIC_API_KEY) return NextResponse.json(await rulesReply(last.content));

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 45_000 });
  const conversation: Anthropic.MessageParam[] = msgs.map((m) => ({ role: m.role, content: m.content }));
  const collected = new Map<string, PublicAlert>();
  const started = performance.now();
  let inTok = 0, outTok = 0;
  try {
    for (let i = 0; i < 5; i++) {
      const response = await client.messages.create({
        model: env.ATHAR_AI_MODEL, max_tokens: 2048, system: SYSTEM, tools: TOOL_DEFS,
        output_config: { effort: "low" }, messages: conversation,
      });
      inTok += response.usage.input_tokens ?? 0; outTok += response.usage.output_tokens ?? 0;
      if (response.stop_reason === "refusal") break;
      if (response.stop_reason !== "tool_use") {
        const text = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
        await supabaseAdmin().from("ai_runs").insert({ stage: "chat", mode: "chatbot", model: env.ATHAR_AI_MODEL, input_hash: sha256(last.content),
          latency_ms: Math.round(performance.now() - started), input_tokens: inTok, output_tokens: outTok, success: true });
        return NextResponse.json({ text: text || "…", alerts: [...collected.values()].slice(0, 4), links: [], mode: "claude" } satisfies Reply);
      }
      conversation.push({ role: "assistant", content: response.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        const out = await runTool(block.name, (block.input ?? {}) as Record<string, unknown>);
        out.alerts?.forEach((a) => collected.set(a.id, a));
        results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(out.json) });
      }
      conversation.push({ role: "user", content: results });
    }
  } catch (e) {
    await supabaseAdmin().from("ai_runs").insert({ stage: "chat", mode: "chatbot", model: env.ATHAR_AI_MODEL, input_hash: sha256(last.content),
      latency_ms: Math.round(performance.now() - started), success: false, error: String(e).slice(0, 300) });
  }
  // Claude unavailable or loop exhausted → rule-based answer from the same tools
  return NextResponse.json(await rulesReply(last.content));
}
