import "server-only";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { serverEnv } from "@/lib/env";
import { CIVIC_CATEGORY_KEYS } from "@/lib/civic";
import { geminiJson } from "./gemini";

/** What the AI may say about a civic photo. Only what is visible; never a judgement on whether it is "real". */
export const CivicVisionSchema = z.object({
  is_public_issue: z.boolean().describe("true only if the photo visibly shows a problem in a public space or infrastructure"),
  category: z.enum(CIVIC_CATEGORY_KEYS as [string, ...string[]]).nullable().describe("Best matching category, null if unclear"),
  description_ar: z.string().describe("One or two short Arabic sentences describing ONLY what is visible. No guesses about causes, places or dates."),
  severity: z.enum(["low", "medium", "high", "danger"]).describe("danger only for visible immediate risks (open manhole, exposed live wires, deep hole on a road)"),
  safety_risks: z.array(z.string()).describe("Visible safety risks, short Arabic phrases; empty if none"),
  contains_people_or_plates: z.boolean().describe("true if identifiable faces or readable vehicle number plates are visible"),
  private_property_visible: z.boolean().describe("true if the inside of a private home/courtyard or similar private details are clearly visible"),
  confidence: z.number().describe("0..1 confidence in the category"),
  moderator_notes: z.array(z.string()).describe("Short Arabic notes for a human moderator (e.g. image looks like a screenshot, text overlay, unclear subject). Never say the image is fake."),
});
export type CivicVision = z.infer<typeof CivicVisionSchema>;

const SYSTEM = `You look at ONE photo sent by a citizen in Algeria to report a problem in a public space (roads, street lighting, waste, water leaks, sidewalks, traffic signs, open manholes, dangerous electrical wires, blocked drainage, abandoned public spaces).
Rules:
- Describe only what is visible in the image. Do not invent places, dates, causes, or how long the problem has existed.
- Choose the closest category from the allowed list, or null if the photo does not clearly show such a problem.
- Never claim the photo is fake or real; if something looks unusual (screenshot, watermark, edited), say it neutrally in moderator_notes.
- Flag identifiable faces, readable number plates and private property so a human can hide them before publication.
- Write Arabic text in clear, simple Modern Standard Arabic.`;

export type VisionResult = { vision: CivicVision; mode: "claude" | "gemini"; model: string; inputTokens: number | null; outputTokens: number | null };

/** Claude if configured, otherwise Gemini (free tier). Returns null when no provider is configured. */
export async function analyzeCivicPhoto(mime: "image/jpeg" | "image/png" | "image/webp", base64: string): Promise<VisionResult | null> {
  const env = serverEnv();
  if (env.ANTHROPIC_API_KEY) {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 45_000 });
    const r = await client.messages.parse({
      model: env.ATHAR_AI_MODEL, max_tokens: 2048, system: SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(CivicVisionSchema) },
      messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mime, data: base64 } }, { type: "text", text: "Analyse this report photo." }] }],
    });
    if (r.stop_reason === "refusal" || !r.parsed_output) throw new Error("vision analysis unavailable");
    return { vision: r.parsed_output, mode: "claude", model: env.ATHAR_AI_MODEL, inputTokens: r.usage.input_tokens ?? null, outputTokens: r.usage.output_tokens ?? null };
  }
  if (env.GEMINI_API_KEY) {
    const schema = z.toJSONSchema(CivicVisionSchema, { target: "draft-7" }) as Record<string, unknown>;
    delete schema.$schema;
    const r = await geminiJson({ system: SYSTEM, user: "Analyse this report photo.", schema, images: [{ mime, data: base64 }], timeoutMs: 12_000, maxModels: 2, attempts: 1 }); // a citizen is waiting on the street: fail fast to manual
    const parsed = CivicVisionSchema.safeParse(JSON.parse(r.text));
    if (!parsed.success) throw new Error("structured output did not validate");
    return { vision: parsed.data, mode: "gemini", model: r.model, inputTokens: r.inputTokens, outputTokens: r.outputTokens };
  }
  return null;
}
