import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { serverEnv } from "@/lib/env";
import { AnalysisSchema, type Analysis } from "./types";

/** USD per 1M tokens (input, output) for cost logging. Unknown models log cost as null. */
const PRICING: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};

export interface ProviderResult {
  analysis: Analysis;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
}

export interface AnalysisProvider {
  readonly name: "claude";
  analyze(text: string): Promise<ProviderResult>;
}

const SYSTEM = `You analyse public messages posted in Algeria asking for volunteers, blood donors or humanitarian help.
Messages are often in Algerian Darija (Arabic script or Latin "Arabizi"), MSA, French or a mix.

Rules:
- Only report what the message states. If a field is not explicitly present, return null (or an empty list). Never guess a wilaya, phone number, blood type, date or quantity.
- normalized_text: rewrite the message in clear Modern Standard Arabic with the same meaning. Keep names, places, numbers and phone numbers exactly as written.
- darija_terms: list dialect words/expressions you translated, with their MSA meaning.
- wilaya_code: the official Algerian wilaya code (1–58) only when the wilaya or a well-known city in it is named.
- phone_numbers: copy them exactly as they appear.
- urgency: critical = life-threatening or within hours (blood for surgery today, people without shelter tonight); medium = days; normal = planned activity.
- mentioned_dates: every explicit year or date, so stale reposts can be detected.
- attention: short Arabic notes for a human moderator (e.g. money transfer request, old date, vague location). Do not judge whether the request is genuine — that is the moderator's job.
- title and summary in Arabic.`;

let client: Anthropic | null = null;

export function claudeProvider(): AnalysisProvider | null {
  const env = serverEnv();
  if (!env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 60_000 });
  const model = env.ATHAR_AI_MODEL;
  return {
    name: "claude",
    async analyze(text: string): Promise<ProviderResult> {
      const response = await client!.messages.parse({
        model,
        max_tokens: 4096,
        system: SYSTEM,
        output_config: { effort: "low", format: zodOutputFormat(AnalysisSchema) },
        messages: [{ role: "user", content: `<message>\n${text}\n</message>` }],
      });
      if (response.stop_reason === "refusal") throw new Error("model declined to analyse this message");
      if (response.stop_reason === "max_tokens") throw new Error("analysis truncated (max_tokens)");
      const parsed = response.parsed_output;
      if (!parsed) throw new Error("structured output did not validate");
      const price = PRICING[model];
      const inT = response.usage.input_tokens ?? null;
      const outT = response.usage.output_tokens ?? null;
      return {
        analysis: parsed,
        model,
        inputTokens: inT,
        outputTokens: outT,
        costUsd: price && inT != null && outT != null ? (inT * price[0] + outT * price[1]) / 1_000_000 : null,
      };
    },
  };
}
