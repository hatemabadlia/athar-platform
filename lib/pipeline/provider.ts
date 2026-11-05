import "server-only";
import { claudeProvider } from "./claude";
import { geminiProvider } from "./gemini";
import type { AnalysisProvider } from "./provider-types";

/** First configured AI provider: Claude, then Gemini (free tier). Null → the labelled rule-based fallback runs. */
export function aiProvider(): AnalysisProvider | null {
  return claudeProvider() ?? geminiProvider();
}
