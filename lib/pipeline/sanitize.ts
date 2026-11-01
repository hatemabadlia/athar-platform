/**
 * Post-validation of any analysis (Claude or rules) against the original text.
 * A value the model returns but that is not literally supported by the source is dropped,
 * so the pipeline never stores invented phone numbers, blood types or wilayas.
 */
import { findWilaya, detectWilaya } from "@/lib/wilayas";
import type { Analysis } from "./types";
import { extractBloodType, extractPhones, normalizePhone, phoneAppearsIn } from "./text";

export function sanitizeAnalysis(a: Analysis, original: string): { analysis: Analysis; dropped: string[] } {
  const dropped: string[] = [];
  const out: Analysis = { ...a };

  const phones = new Set<string>();
  for (const p of a.phone_numbers) {
    if (phoneAppearsIn(p, original)) phones.add(normalizePhone(p)!);
    else dropped.push(`رقم غير موجود في النص: ${p}`);
  }
  // numbers present in the text but missed by the model are added back
  extractPhones(original).forEach((p) => phones.add(p));
  out.phone_numbers = [...phones];

  if (a.blood_type && extractBloodType(original) !== a.blood_type) {
    // accept Arabic spellings the regex may miss only if a blood keyword exists
    if (!/فصيل|دم|sang|groupe/i.test(original)) { dropped.push(`فصيلة غير مذكورة: ${a.blood_type}`); out.blood_type = null; }
  }

  if (a.wilaya_code != null) {
    if (!findWilaya(a.wilaya_code)) { dropped.push(`رمز ولاية غير صالح: ${a.wilaya_code}`); out.wilaya_code = null; }
  }
  if (out.wilaya_code == null) {
    const w = detectWilaya(a.normalized_text) ?? detectWilaya(original);
    if (w) out.wilaya_code = w.code;
  }

  out.confidence = Math.max(0, Math.min(1, Number.isFinite(a.confidence) ? a.confidence : 0));
  if (a.quantity != null && (a.quantity <= 0 || a.quantity > 10000)) out.quantity = null;
  out.title = (a.title || "نداء").slice(0, 120);
  if (dropped.length) out.attention = [...a.attention, ...dropped];
  return { analysis: out, dropped };
}
