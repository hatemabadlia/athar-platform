import "server-only";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { AnalysisSchema } from "./types";
import { maskPhones } from "./text";
import { SYSTEM_PROMPT, type AnalysisProvider, type ProviderResult } from "./provider-types";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
/** Tried in order when the configured model is overloaded or rate-limited (free tier: HTTP 429/503 happen). */
// Free-tier quotas are per model and per day (gemini-3.5-flash: only 20 requests/day), so several are tried.
const FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3-flash-preview", "gemini-3.5-flash"];

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
  error?: { code?: number; message?: string };
};

/** One structured-output call. Returns parsed JSON text plus token usage. Throws with the HTTP status on failure. */
export async function geminiJson(opts: { system: string; user: string; schema: object; model?: string; timeoutMs?: number; images?: { mime: string; data: string }[]; maxModels?: number; attempts?: number }) {
  const env = serverEnv();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");
  const models = [opts.model ?? env.ATHAR_GEMINI_MODEL, ...FALLBACK_MODELS].filter((m, i, a) => a.indexOf(m) === i).slice(0, opts.maxModels ?? 99);
  const errors: string[] = [];
  for (const model of models) {
    for (let attempt = 0; attempt < (opts.attempts ?? 3); attempt++) {
      let res: Response;
      try {
        res = await fetch(`${BASE}/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: opts.system }] },
          contents: [{ role: "user", parts: [...(opts.images ?? []).map((i) => ({ inline_data: { mime_type: i.mime, data: i.data } })), { text: opts.user }] }],
          generationConfig: { responseMimeType: "application/json", responseJsonSchema: opts.schema, temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
      });
      } catch (e) {
        // Timeout or network error: try the next model rather than failing the whole analysis.
        errors.push(`${model} ${e instanceof Error ? e.name : "error"}`);
        break;
      }
      const json = (await res.json().catch(() => ({}))) as GeminiResponse;
      if (res.ok) {
        const c = json.candidates?.[0];
        const text = (c?.content?.parts ?? []).filter((p) => !p.thought && p.text).map((p) => p.text).join("");
        if (!text) throw new Error(`Gemini returned no content (finishReason ${c?.finishReason ?? "?"})`);
        const u = json.usageMetadata ?? {};
        return { text, model, inputTokens: u.promptTokenCount ?? null, outputTokens: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0) || null };
      }
      const err = `${model} ${res.status} ${json.error?.message?.slice(0, 120) ?? ""}`;
      errors.push(err);
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable) throw new Error(`Gemini ${err}`);
      if (res.status === 429) break; // daily/minute quota for this model: move to the next one
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error(`Gemini unavailable: ${errors.slice(-3).join(" | ")}`);
}

// The schema Gemini receives. Phone numbers are not requested: they are masked before sending (see below)
// and extracted locally, so they never leave the server through the free tier.
const { phone_numbers: _omit, ...analysisShape } = AnalysisSchema.shape;
void _omit;
const GeminiAnalysisSchema = z.object(analysisShape);
const GEMINI_SCHEMA = z.toJSONSchema(GeminiAnalysisSchema, { target: "draft-7" }) as Record<string, unknown>;
delete GEMINI_SCHEMA.$schema;

export function geminiProvider(): AnalysisProvider | null {
  const env = serverEnv();
  if (!env.GEMINI_API_KEY) return null;
  return {
    name: "gemini",
    async analyze(text: string): Promise<ProviderResult> {
      const { masked, phones } = maskPhones(text);
      const r = await geminiJson({
        system: `${SYSTEM_PROMPT}\n- Phone numbers have been replaced with placeholders like [هاتف-1]; keep the placeholders as they are.`,
        user: `<message>\n${masked}\n</message>`,
        schema: GEMINI_SCHEMA,
      });
      const parsed = GeminiAnalysisSchema.safeParse(JSON.parse(r.text));
      if (!parsed.success) throw new Error(`structured output did not validate: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`);
      return { analysis: { ...parsed.data, phone_numbers: phones }, model: r.model, inputTokens: r.inputTokens, outputTokens: r.outputTokens, costUsd: 0 };
    },
  };
}
