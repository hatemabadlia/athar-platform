/**
 * Rule-based analysis (stages 2–4) used when no Claude API key is configured or the API fails.
 * Results are labelled "heuristic" everywhere they are shown. Lexicon-based Darija normalisation,
 * keyword classification and regex extraction — limited, but it never invents values.
 */
import { detectWilaya } from "@/lib/wilayas";
import type { Skill } from "@/lib/reference/meta";
import type { Analysis, Category, Urgency } from "./types";
import { extractBloodType, extractPhones, extractTime, extractYears, normalizeArabic } from "./text";

export const DARIJA_LEXICON: Record<string, string> = {
  "سبيطار": "مستشفى", "لسبيطار": "بمستشفى", "فسبيطار": "بمستشفى", "خاوتي": "إخوتي", "راهم": "هم", "راه": "هو",
  "يحتاجو": "يحتاجون", "اللي": "الذي", "يقدر": "يستطيع", "يجي": "يأتي", "دروك": "الآن",
  "بزاف": "كثيراً", "غدوة": "غداً", "عافاكم": "من فضلكم", "بلاصة": "مكان", "طوموبيل": "سيارة",
  "كسيدة": "حادث مرور", "لكسيدة": "حادث مرور", "عندو": "عنده", "ولاد": "أطفال",
  "ما عندهمش": "ليس لديهم", "حوايج": "ملابس", "ماكلة": "طعام", "عاونونا": "ساعدونا", "شاركو": "شاركوا",
  "نتلاقاو": "نلتقي", "العشية": "مساءً", "واش": "ماذا", "كاين": "يوجد", "ماكانش": "لا يوجد", "نحوسو": "نبحث",
  "جيبو": "أحضروا", "فيسع": "بسرعة", "مسكين": "مسكين",
};

export function normalizeDarija(text: string): { text: string; terms: { from: string; to: string }[] } {
  const terms: { from: string; to: string }[] = [];
  let out = text;
  for (const [d, m] of Object.entries(DARIJA_LEXICON).sort((a, b) => b[0].length - a[0].length)) {
    if (d === m) continue;
    const re = new RegExp(`(^|[^\\p{L}])${d}(?=$|[^\\p{L}])`, "gu");
    if (re.test(out)) {
      terms.push({ from: d, to: m });
      out = out.replace(re, `$1${m}`);
    }
  }
  return { text: out, terms };
}

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  blood: ["تبرع بالدم", "فصيلة", "حقن الدم", "متبرعين بالدم", "متبرعين", "دم"],
  cleanup: ["تنظيف", "شاطئ", "تشجير", "غابة", "بيئة", "نفايات"],
  orphans: ["ايتام", "يتيم", "دار الرحمه", "كفالة", "مسنين"],
  medical: ["قافلة طبية", "اطباء", "ممرضين", "ادوية", "طبية", "دواء"],
  education: ["دروس", "بكالوريا", "اساتذة", "تعليم", "مدرسة", "دعم مدرسي"],
  relief: ["اغاثة", "عائلة", "فيضانات", "زلزال", "ماوي", "مواد غذائية", "اغطية", "مشردين", "حريق", "ملابس"],
  skills: ["مصمم", "تصميم", "مبرمج", "موقع", "مترجم", "ترجمة", "محامي", "استشارة", "سائق", "متطوع بمهارته"],
};

/** Keywords → skills from the canonical list (rule-based fallback only; the AI path extracts these itself). */
const SKILL_KEYWORDS: Record<Skill, string[]> = {
  "إسعافات أولية": ["اسعافات", "مسعف"],
  "نقل وتوزيع": ["سائق", "طوموبيل", "سيارة", "توصيل", "نقل", "يوصل"],
  "طبخ": ["طبخ", "يطبخو", "وجبات"],
  "تعليم ودعم مدرسي": ["دروس", "استاذ", "اساتذة", "دعم مدرسي"],
  "تصميم وإعلام": ["مصمم", "تصميم", "منشورات", "شعار"],
  "برمجة": ["مبرمج", "برمجة", "موقع", "تطبيق"],
  "تنظيم فعاليات": ["تنظيم"],
  "ترجمة": ["مترجم", "ترجمة"],
  "مرافقة إدارية": ["اجراءات", "وثائق", "ملف اداري"],
  "تصوير": ["مصور", "تصوير"],
  "دعم نفسي": ["دعم نفسي"],
  "صيانة وبناء": ["بناء", "ترميم", "صيانة", "بنّاء"],
  "استشارة طبية": ["طبيب", "استشارة طبية"],
  "استشارة قانونية": ["محامي", "استشارة قانونية"],
  "أخصائي نفساني": ["نفساني", "اخصائي نفسي"],
};

export function extractSkills(text: string): { skills: Skill[]; remote: boolean } {
  const n = normalizeArabic(text);
  const skills = (Object.keys(SKILL_KEYWORDS) as Skill[]).filter((s) => SKILL_KEYWORDS[s].some((kw) => hasKeyword(n, kw)));
  const remote = /عن بعد|اونلاين|أونلاين|en ligne|online|بالفيديو/i.test(text);
  return { skills, remote };
}

/**
 * Keyword present as a whole word (Arabic clitics و/ف/ب/ل/ال allowed in front), so that short keywords
 * like "دم" (blood) do not match inside "القدم" (football).
 */
export function hasKeyword(normalized: string, keyword: string): boolean {
  const kw = normalizeArabic(keyword).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)(?:و|ف|ب|ل|ك)?(?:ال|لل)?${kw}(?:ات|ين|ون|ه|ها|ي)?(?=$|\\s)`, "u").test(normalized);
}

export function classifyCategory(text: string): { category: Category | null; confidence: number } {
  const n = normalizeArabic(text);
  let best: Category | null = null;
  let bestScore = 0;
  (Object.keys(CATEGORY_KEYWORDS) as Category[]).forEach((cat) => {
    const score = CATEGORY_KEYWORDS[cat].reduce(
      (acc, kw) => acc + (hasKeyword(n, kw) ? (kw.length > 4 ? 2 : 1) : 0), 0);
    if (score > bestScore) { bestScore = score; best = cat; }
  });
  // rule-based confidence is deliberately capped low: it is keyword matching, not understanding
  return { category: best, confidence: best ? Math.min(0.7, 0.35 + bestScore * 0.08) : 0.1 };
}

export function classifyUrgency(text: string, category: Category | null): Urgency {
  const n = normalizeArabic(text);
  const criticalKw = ["عاجل", "حرج", "خطر", "فورا", "الليله", "العنايه المركزه", "بدون ماوي", "فيضان", "زلزال", "حريق"];
  const hits = criticalKw.filter((k) => hasKeyword(n, k)).length;
  if (hits >= 2 || (category === "blood" && hits >= 1)) return "critical";
  if (hits === 1 || category === "blood" || category === "medical") return "medium";
  return "normal";
}

const TITLES: Record<Category, string> = {
  blood: "نداء تبرع بالدم", relief: "نداء إغاثة", cleanup: "حملة بيئية تطوعية",
  orphans: "دعم الأيتام والمسنين", medical: "مساعدة طبية", education: "دعم تعليمي", skills: "طلب مهارة تطوعية",
};

export function heuristicAnalyze(raw: string): Analysis {
  const { text, terms } = normalizeDarija(raw);
  const wilaya = detectWilaya(text);
  const phones = extractPhones(raw);
  const blood = extractBloodType(raw);
  const { category, confidence } = classifyCategory(text);
  const urgency = classifyUrgency(text, category);
  const time = extractTime(raw);
  const skillReq = extractSkills(text);
  const institution = text.match(/((?:مستشفى|دار الشباب|مركز الشباب|جمعية|الهلال الأحمر)(?:\s[ؠ-ي]+){0,3})/)?.[1]?.trim() ?? null;
  const money = /ccp|bna|baridimob|بريدي ?موب|تحويل|حساب (?:بريدي|بنكي)|rip/i.test(raw);
  const attention: string[] = ["تحليل آلي بالقواعد فقط (بدون نموذج ذكاء اصطناعي) — تحقّق من كل الحقول."];
  if (!wilaya) attention.push("لم تُحدَّد الولاية.");
  if (!category) attention.push("لم تُحدَّد الفئة.");
  if (money) attention.push("يطلب تحويلاً مالياً.");
  const w = wilaya ? ` — ${wilaya.nameAr}` : "";
  return {
    normalized_text: text,
    darija_terms: terms,
    is_help_request: category !== null,
    category,
    urgency,
    wilaya_code: wilaya?.code ?? null,
    baladiya: null,
    institution,
    phone_numbers: phones,
    blood_type: blood,
    quantity: null,
    deadline_text: time,
    contact_name: null,
    required_resources: [],
    required_skills: skillReq.skills,
    remote_possible: skillReq.remote,
    mentioned_dates: extractYears(raw).map(String),
    money_request: money,
    title: `${category ? TITLES[category] : "منشور غير مصنّف"}${blood ? ` ${blood}` : ""}${w}`.slice(0, 80),
    summary: `${category ? TITLES[category] : "منشور"}${blood ? ` (فصيلة ${blood})` : ""}${wilaya ? ` في ${wilaya.nameAr}` : ""}.`,
    confidence,
    attention,
  };
}
