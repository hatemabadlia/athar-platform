/** Shared by every AI provider (Claude, Gemini) so the pipeline does not care which one ran. */
import type { Analysis } from "./types";

export interface ProviderResult {
  analysis: Analysis;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
}

export interface AnalysisProvider {
  readonly name: "claude" | "gemini";
  analyze(text: string): Promise<ProviderResult>;
}

export const SYSTEM_PROMPT = `You analyse public messages posted in Algeria asking for volunteers, blood donors or humanitarian help.
Messages are often in Algerian Darija (Arabic script or Latin "Arabizi"), MSA, French or a mix.

Rules:
- Only report what the message states. If a field is not explicitly present, return null (or an empty list). Never guess a wilaya, phone number, blood type, date or quantity.
- normalized_text: rewrite the message in clear Modern Standard Arabic with the same meaning. Keep names, places, numbers and phone numbers exactly as written.
- darija_terms: list dialect words/expressions you translated, with their MSA meaning.
- wilaya_code: the official Algerian wilaya code (1–69) only when the wilaya or a well-known city in it is named.
- phone_numbers: copy them exactly as they appear.
- urgency: critical = life-threatening or within hours (blood for surgery today, people without shelter tonight); medium = days; normal = planned activity.
- mentioned_dates: every explicit year or date, so stale reposts can be detected.
- attention: short Arabic notes for a human moderator (e.g. money transfer request, old date, vague location). Do not judge whether the request is genuine — that is the moderator's job.
- title and summary in Arabic.`;
