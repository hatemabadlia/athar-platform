import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { clientIpKey, getViewer, rateLimit } from "@/lib/server/guards";
import { TOOL_DEFS, runTool, searchAlerts, myPoints, listClubs, crisisInfo } from "@/lib/chat/tools";
import { detectWilaya, WILAYAS } from "@/lib/wilayas";
import { isFrench } from "@/lib/chat/lang";
import { extractBloodType } from "@/lib/pipeline/text";
import { normalizeDarija } from "@/lib/pipeline/heuristic";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sha256 } from "@/lib/pipeline/hash";
import { geminiJson } from "@/lib/pipeline/gemini";
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

type Reply = { text: string; alerts: PublicAlert[]; links: { href: string; label: string }[]; mode: "claude" | "gemini" | "rules" };

const fold = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function detectWilayaFr(q: string) {
  const f = fold(q);
  return [...WILAYAS].sort((a, b) => b.name.length - a.name.length).find((w) => new RegExp(`\\b${fold(w.name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(f)) ?? null;
}

async function rulesReply(q: string): Promise<Reply> {
  const fr = isFrench(q);
  const n = fr ? fold(q) : normalizeDarija(q).text;
  const w = fr ? detectWilayaFr(q) : detectWilaya(n);
  const wName = w ? (fr ? w.name : w.nameAr) : null;
  const blood = extractBloodType(q);
  const L = fr ? {
    noCrisis: "Aucune urgence n'est déclarée sur Athar pour le moment.",
    crisis: (k: number, sh: string[]) => `${k} urgence(s) déclarée(s).${sh.length ? ` Centres ouverts : ${sh.join(", ")}.` : " Aucun centre d'hébergement ouvert n'est encore enregistré."}`,
    loginForPoints: "Connectez-vous pour voir vos points.", points: (p: number, h: number) => `Vous avez ${p} points confirmés et ${h} h de bénévolat confirmées. Les points ne comptent qu'après confirmation de présence.`,
    clubs: (k: number, names: string[]) => (k ? `${k} club(s)${wName ? ` à ${wName}` : ""} : ${names.join(", ")}.` : `Aucun club enregistré${wName ? ` à ${wName}` : ""} pour l'instant — vous pouvez en créer un.`),
    none: (isB: boolean) => `Aucun appel vérifié${isB ? " de don de sang" : ""}${wName ? ` à ${wName}` : ""} pour le moment.`,
    found: () => `Voici les appels vérifiés${wName ? ` à ${wName}` : ""}${blood ? ` compatibles avec votre groupe ${blood}` : ""} :`,
    map: "Carte", login: "Connexion", profile: "Mon profil", clubsL: "Clubs",
    reCrisis: /urgence|inondation|seisme|incendie|abri|hebergement/, rePoints: /points?|heures|certificat|badge/, reClubs: /club|maison de jeunes/, reBlood: /sang|donneur|don\b/,
  } : {
    noCrisis: "ما كاين حتى حالة طوارئ معلنة على إيثار دروك.",
    crisis: (k: number, sh: string[]) => `كاين ${k} حالة طوارئ معلنة.${sh.length ? ` المراكز المفتوحة: ${sh.join("، ")}.` : " ما تسجلش حتى مركز إيواء مفتوح بعد."}`,
    loginForPoints: "لازم تدخل لحسابك باش نشوفلك نقاطك.", points: (p: number, h: number) => `عندك ${p} نقطة مؤكدة و${h} ساعة تطوع مؤكدة. النقاط تتحسب غير بعد تأكيد الحضور.`,
    clubs: (k: number, names: string[]) => (k ? `لقيت ${k} نادي${wName ? ` في ${wName}` : ""}: ${names.join("، ")}.` : `ما كاين حتى نادي مسجل${wName ? ` في ${wName}` : ""} بعد — تقدر تنشئ واحد.`),
    none: (isB: boolean) => `ما كاين حتى نداء معتمد${isB ? " للتبرع بالدم" : ""}${wName ? ` في ${wName}` : ""} دروك. نخبروك كي يطلع واحد.`,
    found: () => `هذو النداءات المعتمدة${wName ? ` في ${wName}` : ""}${blood ? ` المتوافقة مع فصيلتك ${blood}` : ""}:`,
    map: "الخريطة", login: "دخول", profile: "ملفي", clubsL: "النوادي",
    reCrisis: /طوارئ|كارثة|فيضان|زلزال|حريق|ماوى|مأوى|إيواء/, rePoints: /نقاط|نقطة|شارة|ساعات|شهادة/, reClubs: /نادي|نوادي|دار الشباب/, reBlood: /دم|فصيل|تبرع/,
  };
  if (L.reCrisis.test(n)) {
    const r = (await crisisInfo({ wilaya_code: w?.code })).json as { active_crises: unknown[]; open_shelters: { name: string }[] };
    if (!r.active_crises.length) return { text: L.noCrisis, alerts: [], links: [], mode: "rules" };
    return { text: L.crisis(r.active_crises.length, r.open_shelters.map((x) => x.name)), alerts: [], links: [{ href: "/", label: L.map }], mode: "rules" };
  }
  if (L.rePoints.test(n)) {
    const r = (await myPoints()).json as { signed_in: boolean; points?: number; hours?: number };
    if (!r.signed_in) return { text: L.loginForPoints, alerts: [], links: [{ href: "/login", label: L.login }], mode: "rules" };
    return { text: L.points(r.points ?? 0, r.hours ?? 0), alerts: [], links: [{ href: "/profile", label: L.profile }], mode: "rules" };
  }
  if (L.reClubs.test(n)) {
    const r = (await listClubs({ wilaya_code: w?.code })).json as { count: number; clubs: { name: string }[] };
    return { text: L.clubs(r.count, r.clubs.map((c) => c.name)), alerts: [], links: [{ href: "/clubs", label: L.clubsL }], mode: "rules" };
  }
  const isBlood = L.reBlood.test(n) || !!blood;
  const r = await searchAlerts({ wilaya_code: w?.code, category: isBlood ? "blood" : undefined, donor_blood_type: blood ?? undefined });
  if (!r.alerts?.length) return { text: L.none(isBlood), alerts: [], links: [{ href: "/", label: L.map }], mode: "rules" };
  return { text: L.found(), alerts: r.alerts.slice(0, 3), links: [], mode: "rules" };
}

/**
 * Gemini (free tier) path: retrieval first, generation second. The database is queried by the same tools as
 * the rules path; Gemini only rewrites those facts as a natural reply in the user's dialect, so it cannot
 * introduce alerts, places or numbers that the database did not return. Any failure → the rules reply.
 */
async function geminiReply(msgs: { role: "user" | "assistant"; content: string }[], question: string): Promise<Reply> {
  const base = await rulesReply(question);
  const started = performance.now();
  const facts = {
    answer_from_database: base.text,
    alerts: base.alerts.map((a) => ({ title: a.title, wilaya: a.wilaya, urgency: a.urgency, blood_type: a.bloodType })),
    links: base.links.map((l) => l.label),
  };
  try {
    const r = await geminiJson({
      system: `${SYSTEM}\n\nYou do not call tools here. FACTS below were already retrieved from the database. Write the reply using ONLY these facts — no other alerts, places, numbers or promises. If FACTS say nothing is available, say so kindly. Keep it under 60 words. Alerts are shown to the user as cards after your text.`,
      user: `Conversation so far:\n${msgs.slice(-6).map((m) => `${m.role}: ${m.content}`).join("\n")}\n\nFACTS (JSON):\n${JSON.stringify(facts)}`,
      schema: { type: "object", properties: { reply: { type: "string" } }, required: ["reply"] },
      timeoutMs: 25_000,
    });
    const reply = String((JSON.parse(r.text) as { reply?: string }).reply ?? "").trim();
    await supabaseAdmin().from("ai_runs").insert({ stage: "chat", mode: "chatbot", model: r.model, input_hash: sha256(question),
      latency_ms: Math.round(performance.now() - started), input_tokens: r.inputTokens, output_tokens: r.outputTokens, cost_usd: 0, success: true });
    return reply ? { ...base, text: reply, mode: "gemini" } : base;
  } catch (e) {
    await supabaseAdmin().from("ai_runs").insert({ stage: "chat", mode: "chatbot", model: serverEnv().ATHAR_GEMINI_MODEL, input_hash: sha256(question),
      latency_ms: Math.round(performance.now() - started), success: false, error: String(e).slice(0, 300) });
    return base;
  }
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
  if (!env.ANTHROPIC_API_KEY && env.GEMINI_API_KEY) return NextResponse.json(await geminiReply(msgs, last.content));
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
