import { z } from "zod";

export const CATEGORIES = ["blood", "relief", "cleanup", "orphans", "medical", "education"] as const;
export const URGENCIES = ["critical", "medium", "normal"] as const;
export const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"] as const;
export type Category = (typeof CATEGORIES)[number];
export type Urgency = (typeof URGENCIES)[number];
export type BloodType = (typeof BLOOD_TYPES)[number];
export type Verdict = "fresh" | "recycled" | "duplicate" | "low-confidence";
export type AnalysisMode = "claude" | "heuristic";

/**
 * What stages 2–4 produce. The same shape comes from Claude (structured output) and from the
 * rule-based fallback, so the rest of the pipeline does not care which ran.
 * Unknown values are null — never guessed.
 */
export const AnalysisSchema = z.object({
  normalized_text: z.string().describe("The message rewritten in Modern Standard Arabic, same meaning, keeping names, places, numbers and phone numbers exactly"),
  darija_terms: z.array(z.object({ from: z.string(), to: z.string() })).describe("Darija/dialect expressions found and their MSA meaning"),
  is_help_request: z.boolean().describe("true only if the message asks for volunteers, donations, blood or humanitarian help"),
  category: z.enum(CATEGORIES).nullable(),
  urgency: z.enum(URGENCIES),
  wilaya_code: z.number().int().nullable().describe("Algerian wilaya code 1-69 if the place is clearly stated, else null"),
  baladiya: z.string().nullable().describe("Commune/neighbourhood as written, else null"),
  institution: z.string().nullable().describe("Hospital, youth house, school or association named, else null"),
  phone_numbers: z.array(z.string()).describe("Phone numbers exactly as they appear in the text"),
  blood_type: z.enum(BLOOD_TYPES).nullable(),
  quantity: z.number().int().nullable().describe("Number of donors/volunteers/items requested if stated"),
  deadline_text: z.string().nullable().describe("Deadline or time as written (e.g. 'before 17:00', 'tomorrow morning')"),
  contact_name: z.string().nullable(),
  required_resources: z.array(z.string()),
  mentioned_dates: z.array(z.string()).describe("Every explicit date or year mentioned (e.g. '2021', '14/03/2021')"),
  money_request: z.boolean().describe("true if it asks to transfer money (CCP, bank, BaridiMob, etc.)"),
  title: z.string().describe("Short Arabic title, max 80 characters"),
  summary: z.string().describe("One-sentence Arabic summary of the need"),
  confidence: z.number().describe("0..1 confidence in the category and fields"),
  attention: z.array(z.string()).describe("Reasons a human moderator should look carefully (Arabic), empty if none"),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

export interface StageResult {
  id: "ingest" | "normalize" | "entities" | "classify" | "recycle" | "dedupe" | "score";
  labelAr: string;
  status: "done" | "warning" | "error" | "skipped";
  detail: string;
  durationMs: number;
  mode?: AnalysisMode | "embedding" | "sql";
}

export interface CredibilityReason {
  label: string;
  delta: number;
}

export interface HistoricalCandidate {
  id: string;
  normalized_text: string;
  first_seen_at: string;
  resolved_at: string | null;
  times_seen: number;
  exact: boolean;
  text_similarity: number;
  vector_similarity: number | null;
  phone_match: boolean;
}

export interface ActiveCandidate {
  id: string;
  title: string;
  status: string;
  wilaya_code: number | null;
  category: string;
  created_at: string;
  text_similarity: number;
  vector_similarity: number | null;
  phone_match: boolean;
  same_place: boolean;
  same_category: boolean;
}

export const STAGE_LABELS: Record<StageResult["id"], string> = {
  ingest: "استقبال المنشور",
  normalize: "تطبيع الدارجة إلى العربية الفصحى",
  entities: "استخراج الكيانات (ولاية، هاتف، فصيلة، موعد)",
  classify: "التصنيف ودرجة الاستعجال والثقة",
  recycle: "كاشف المنشورات المعاد تدويرها",
  dedupe: "كشف التكرار مع النداءات النشطة",
  score: "درجة المصداقية مع الأسباب",
};
