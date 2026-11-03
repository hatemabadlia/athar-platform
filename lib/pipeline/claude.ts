import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { serverEnv } from "@/lib/env";
import { AnalysisSchema } from "./types";
import { SYSTEM_PROMPT, type AnalysisProvider, type ProviderResult } from "./provider-types";

export type { AnalysisProvider, ProviderResult };

/** USD per 1M tokens (input, output) for cost logging. Unknown models log cost as null. */
const PRICING: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};



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
        system: SYSTEM_PROMPT,
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
