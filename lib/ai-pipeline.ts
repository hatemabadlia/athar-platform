/**
 * Simulated AI processing pipeline.
 * In production this would call an LLM + vector DB. Here we use keyword
 * heuristics, n-gram similarity against historical records, and fuzzy
 * matching against active alerts to produce a believable demo.
 */
import type {
  Alert,
  Category,
  ClassificationResult,
  HistoricalRecord,
  PipelineStep,
  Urgency,
  Wilaya,
} from "./types";
import { HISTORICAL_RECORDS } from "./mock-data";
import { detectWilaya } from "./wilayas";

export const PIPELINE_TEMPLATE: Omit<PipelineStep, "status" | "detail">[] = [
  { id: "ingest", label: "Ingestion", labelAr: "استقبال المنشور", durationMs: 500 },
  { id: "normalize", label: "Arabic NLP Normalization", labelAr: "تطبيع النص العربي (NLP)", durationMs: 700 },
  { id: "entities", label: "Entity Extraction", labelAr: "استخراج الكيانات (ولاية، هاتف، فصيلة)", durationMs: 900 },
  { id: "classify", label: "Category & Urgency Classification", labelAr: "تصنيف الفئة ودرجة الاستعجال", durationMs: 800 },
  { id: "recycle", label: "Recycled-Content Detector", labelAr: "كاشف المنشورات القديمة (Temporal Fingerprint)", durationMs: 1200 },
  { id: "dedupe", label: "Duplicate Merge", labelAr: "كشف التكرار والدمج", durationMs: 700 },
  { id: "score", label: "Credibility Scoring", labelAr: "حساب درجة المصداقية", durationMs: 600 },
];

// ---------- Darija → MSA lexicon (subset, extended by LLM in production) ----------
export const DARIJA_LEXICON: Record<string, string> = {
  "سبيطار": "مستشفى", "لسبيطار": "بمستشفى", "فسبيطار": "بمستشفى", "خاوتي": "إخوتي", "راهم": "هم", "راه": "هو",
  "يحتاجو": "يحتاجون", "يحتاج": "يحتاج", "اللي": "الذي", "يقدر": "يستطيع", "يجي": "يأتي", "دروك": "الآن",
  "بزاف": "كثيراً", "غدوة": "غداً", "الليلة": "الليلة", "عافاكم": "من فضلكم", "مسكين": "مسكين",
  "بلاصة": "مكان", "طوموبيل": "سيارة", "كسيدة": "حادث مرور", "لكسيدة": "حادث مرور", "عندو": "عنده",
  "ولاد": "أطفال", "دار": "منزل", "ما عندهمش": "ليس لديهم", "حوايج": "ملابس", "ماكلة": "طعام",
  "عاونونا": "ساعدونا", "شاركو": "شاركوا", "نتلاقاو": "نلتقي", "الصباح": "صباحاً", "العشية": "مساءً",
};

export function normalizeDarija(text: string): { text: string; terms: { from: string; to: string }[] } {
  const terms: { from: string; to: string }[] = [];
  let out = text;
  for (const [d, m] of Object.entries(DARIJA_LEXICON).sort((a, b) => b[0].length - a[0].length)) {
    if (out.includes(d) && d !== m) {
      terms.push({ from: d, to: m });
      out = out.split(d).join(m);
    }
  }
  return { text: out, terms };
}

// ---------- text utils ----------
export function normalizeArabic(text: string): string {
  return text
    .replace(/[ً-ْ]/g, "") // harakat
    .replace(/[إأآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}\s+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function shingles(text: string, n = 2): Set<string> {
  const words = normalizeArabic(text).split(" ").filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i <= words.length - n; i++) out.add(words.slice(i, i + n).join(" "));
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  a.forEach((x) => { if (b.has(x)) inter++; });
  return inter / (a.size + b.size - inter);
}

export function extractPhones(text: string): string[] {
  const m = text.match(/0[5-7](?:[\s.-]?\d{2}){4}/g) ?? [];
  return m.map((p) => p.replace(/[\s.-]/g, "").replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4"));
}

export function extractBloodType(text: string): string | null {
  const m = text.match(/\b(A|B|AB|O)\s?([+-]|موجب|سالب)/i);
  if (!m) return null;
  const sign = m[2] === "موجب" ? "+" : m[2] === "سالب" ? "-" : m[2];
  return `${m[1].toUpperCase()}${sign}`;
}

// ---------- classification ----------
const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  blood: ["تبرع بالدم", "فصيلة", "حقن الدم", "متبرعين بالدم", "دم"],
  cleanup: ["تنظيف", "شاطئ", "غابة", "بيئة", "نفايات"],
  orphans: ["ايتام", "يتيم", "دار الرحمه", "كفالة", "مسنين"],
  medical: ["قافلة", "اطباء", "ممرضين", "ادوية", "طبية"],
  education: ["دروس", "بكالوريا", "اساتذة", "تعليم", "مدرسة"],
  relief: ["اغاثة", "عائلة", "فيضانات", "زلزال", "ماوى", "مواد غذائية", "اغطية", "مشردين"],
};

export function classifyCategory(text: string): { category: Category; confidence: number } {
  const n = normalizeArabic(text);
  let best: Category = "relief";
  let bestScore = 0;
  (Object.keys(CATEGORY_KEYWORDS) as Category[]).forEach((cat) => {
    const score = CATEGORY_KEYWORDS[cat].reduce(
      (acc, kw) => acc + (n.includes(normalizeArabic(kw)) ? (kw.length > 4 ? 2 : 1) : 0),
      0
    );
    if (score > bestScore) { bestScore = score; best = cat; }
  });
  return { category: best, confidence: Math.min(0.99, 0.6 + bestScore * 0.1) };
}

export function classifyUrgency(text: string, category: Category): Urgency {
  const n = normalizeArabic(text);
  const criticalKw = ["عاجل", "حرج", "خطر", "فورا", "الليلة", "غدا صباحا", "بدون ماوى", "فيضان", "زلزال"];
  const hits = criticalKw.filter((k) => n.includes(normalizeArabic(k))).length;
  if (hits >= 2 || (category === "blood" && hits >= 1)) return "critical";
  if (hits === 1 || category === "blood" || category === "medical") return "medium";
  return "normal";
}

export function detectRecycled(text: string): { record: HistoricalRecord; similarity: number } | null {
  const s = shingles(text);
  let best: { record: HistoricalRecord; similarity: number } | null = null;
  for (const rec of HISTORICAL_RECORDS) {
    const sim = jaccard(s, shingles(rec.text));
    const phones = extractPhones(text);
    const phoneMatch = phones.some((p) => rec.text.includes(p));
    const fingerprintHits = rec.fingerprint.filter((f) => normalizeArabic(text).includes(normalizeArabic(f))).length;
    const combined = Math.min(1, sim * 0.6 + (phoneMatch ? 0.3 : 0) + (fingerprintHits / rec.fingerprint.length) * 0.4);
    if (combined > 0.45 && (!best || combined > best.similarity)) best = { record: rec, similarity: combined };
  }
  return best;
}

export function detectDuplicate(text: string, activeAlerts: Alert[], wilaya: Wilaya | null, category: Category) {
  const s = shingles(text);
  const phones = extractPhones(text);
  let best: { alert: Alert; similarity: number } | null = null;
  for (const a of activeAlerts) {
    if (["rejected", "recycled", "merged"].includes(a.status)) continue;
    const sim = jaccard(s, shingles(a.originalText));
    const phoneMatch = phones.some((p) => a.contactPhone.replace(/\s/g, "") === p.replace(/\s/g, ""));
    const sameLoc = wilaya ? a.wilayaCode === wilaya.code : false;
    const sameCat = a.category === category;
    const combined = Math.min(1, sim * 0.5 + (phoneMatch ? 0.35 : 0) + (sameLoc && sameCat ? 0.2 : 0));
    if (combined > 0.4 && (!best || combined > best.similarity)) best = { alert: a, similarity: combined };
  }
  return best;
}

function buildTitle(category: Category, wilaya: Wilaya | null, bloodType: string | null): string {
  const w = wilaya ? ` - ${wilaya.nameAr}` : "";
  switch (category) {
    case "blood": return `تبرع بالدم${bloodType ? ` ${bloodType}` : ""}${w}`;
    case "cleanup": return `حملة تنظيف${w}`;
    case "orphans": return `دعم الأيتام${w}`;
    case "medical": return `مساعدة طبية${w}`;
    case "education": return `دعم تعليمي${w}`;
    default: return `نداء إغاثة${w}`;
  }
}

/** Full synchronous classification (used by the runner with delays). */
export function classifyPost(rawText: string, activeAlerts: Alert[]): ClassificationResult {
  const { text, terms: darijaTerms } = normalizeDarija(rawText);
  const wilaya = detectWilaya(text);
  const phones = extractPhones(text);
  const bloodType = extractBloodType(text);
  const { category, confidence } = classifyCategory(text);
  const urgency = classifyUrgency(text, category);
  const recycled = detectRecycled(text);
  const duplicate = recycled ? null : detectDuplicate(text, activeAlerts, wilaya, category);

  const entities: { label: string; value: string }[] = [];
  if (wilaya) entities.push({ label: "الولاية", value: wilaya.nameAr });
  phones.forEach((p) => entities.push({ label: "هاتف", value: p }));
  if (bloodType) entities.push({ label: "فصيلة الدم", value: bloodType });
  const timeMatch = text.match(/\d{1,2}[:h]\d{2}/);
  if (timeMatch) entities.push({ label: "توقيت", value: timeMatch[0] });
  const STOP = /^(بال|في|من|لل|ل(مريض|طفل|سيد|شاب|عائل|حال)|،|,)/;
  const hospitalMatch = text.match(/مستشفى((?:\s[\u0620-\u064A\u0660-\u06FF]+){1,3})/);
  const hospital = hospitalMatch
    ? "مستشفى " + hospitalMatch[1].trim().split(/\s+/).filter((w, i, arr) => !arr.slice(0, i).some((x) => STOP.test(x)) && !STOP.test(w)).join(" ")
    : null;
  if (hospital) entities.push({ label: "مؤسسة", value: hospital });

  const reasoning: string[] = [];
  let score: number;
  let verdict: ClassificationResult["verdict"];

  if (recycled) {
    const years = new Date().getFullYear() - new Date(recycled.record.firstSeenAt).getFullYear();
    score = Math.max(4, Math.round(22 - recycled.similarity * 10));
    verdict = "recycled";
    reasoning.push(`تطابق بنسبة ${Math.round(recycled.similarity * 100)}% مع سجل أرشيفي رُصد لأول مرة في ${recycled.record.firstSeenAt.slice(0, 4)}.`);
    if (phones.some((p) => recycled.record.text.includes(p)))
      reasoning.push("رقم الهاتف مطابق لرقم في سجل قديم تم حله سابقاً.");
    reasoning.push(`المنشور أُعيد تداوله ${recycled.record.timesRecycled} مرة خلال ${years} سنوات.`);
    if (recycled.record.resolvedAt)
      reasoning.push(`الحالة تم حلها بتاريخ ${recycled.record.resolvedAt.slice(0, 10)} — لا حاجة لتدخل جديد.`);
  } else if (duplicate) {
    score = Math.round(duplicate.alert.credibilityScore * 0.95);
    verdict = "duplicate";
    reasoning.push(`تشابه ${Math.round(duplicate.similarity * 100)}% مع حدث نشط: "${duplicate.alert.title}".`);
    reasoning.push("نفس رقم الاتصال والولاية والفئة → دمج تلقائي لتفادي تشتيت المتطوعين.");
  } else {
    let s = 55;
    if (wilaya) { s += 12; reasoning.push("تم تحديد الولاية بدقة."); } else reasoning.push("⚠️ لم يتم تحديد الولاية.");
    if (phones.length) { s += 12; reasoning.push("رقم اتصال جزائري صالح مستخرج."); } else reasoning.push("⚠️ لا يوجد رقم اتصال.");
    if (hospital || /مستشفى|جمعية|الهلال|دار/.test(text)) { s += 10; reasoning.push("ذكر مؤسسة معروفة يرفع المصداقية."); }
    if (timeMatch) { s += 5; reasoning.push("وجود توقيت محدد يدل على نداء حديث."); }
    if (/ccp|تحويل|حساب بريدي/i.test(text)) { s -= 35; reasoning.push("🚩 طلب تحويل مالي بدون جهة معتمدة."); }
    s += Math.round(confidence * 6);
    score = Math.min(98, Math.max(5, s));
    verdict = score >= 60 ? "fresh" : "low-confidence";
    reasoning.push("لا يوجد تطابق مع الأرشيف → محتوى جديد (Verified Fresh).");
  }

  const summary = (() => {
    const loc = wilaya ? `ب${wilaya.nameAr}` : "";
    if (verdict === "recycled") return `منشور قديم ${loc} يعود إلى ${recycled!.record.firstSeenAt.slice(0, 4)} — تم حله سابقاً، تمت تصفيته تلقائياً.`;
    if (verdict === "duplicate") return `نداء مكرر لحدث نشط: ${duplicate!.alert.title}.`;
    const catAr = { blood: "تبرع بالدم", relief: "إغاثة", cleanup: "تنظيف", orphans: "دعم أيتام", medical: "مساعدة طبية", education: "دعم تعليمي" }[category];
    return `نداء ${catAr}${bloodType ? ` (${bloodType})` : ""} ${loc}${phones.length ? ` — الاتصال: ${phones[0]}` : ""}.`;
  })();

  return {
    verdict,
    category,
    urgency: verdict === "recycled" ? "normal" : urgency,
    wilaya,
    baladiya: wilaya?.nameAr ?? "غير محدد",
    credibilityScore: score,
    confidence,
    extractedEntities: entities,
    matchedHistorical: recycled?.record,
    similarity: recycled?.similarity ?? duplicate?.similarity,
    mergedIntoAlert: duplicate?.alert,
    reasoning,
    aiSummary: summary,
    title: buildTitle(category, wilaya, bloodType),
    darijaTerms,
  };
}
