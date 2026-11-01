/**
 * Generates a social-media-ready post in Athar's brand identity
 * from an AI classification result. In production this would be an
 * LLM prompt with brand guidelines; here it is a deterministic template.
 */
import type { BrandedPost, ClassificationResult } from "./types";
import { extractBloodType, extractPhones } from "./ai-pipeline";
import { CATEGORY_META, URGENCY_META } from "./mock-data";

const CAT_HASHTAG: Record<string, string> = {
  blood: "تبرع_بالدم", relief: "إغاثة", cleanup: "بيئة_نظيفة", orphans: "كفالة_الأيتام", medical: "قافلة_طبية", education: "دعم_مدرسي",
};

export function shortId(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h.toString(36).slice(0, 5);
}

export function generateBrandedPost(text: string, r: ClassificationResult, hub?: string): BrandedPost {
  const cat = CATEGORY_META[r.category];
  const urg = URGENCY_META[r.urgency];
  const phones = extractPhones(text);
  const blood = extractBloodType(text);
  const time = text.match(/\d{1,2}[:h]\d{2}/)?.[0];
  const place = r.extractedEntities.find((e) => e.label === "مؤسسة")?.value;
  const wilaya = r.wilaya?.nameAr ?? "الجزائر";
  const shortLink = `athar.dz/a/${shortId(text)}`;

  const headline =
    r.category === "blood" ? `نداء تبرع بالدم${blood ? ` ${blood}` : ""} — ${wilaya}`
    : r.category === "cleanup" ? `حملة تطوعية — ${wilaya}`
    : r.category === "orphans" ? `دعم الأيتام وكبار السن — ${wilaya}`
    : r.category === "medical" ? `قافلة طبية تطوعية — ${wilaya}`
    : r.category === "education" ? `متطوعون للدعم المدرسي — ${wilaya}`
    : `نداء إغاثة — ${wilaya}`;

  const details: BrandedPost["details"] = [];
  if (place) details.push({ icon: "📍", text: place });
  if (blood) details.push({ icon: "🩸", text: `الفصيلة المطلوبة: ${blood}` });
  if (time) details.push({ icon: "⏰", text: `قبل ${time}` });
  if (phones[0]) details.push({ icon: "📞", text: phones[0] });
  if (hub) details.push({ icon: "🏛️", text: `نقطة التجمع: ${hub}` });

  const hashtags = ["إيثار", "الجزائر_تتطوع", CAT_HASHTAG[r.category], wilaya.replace(/\s/g, "_"), ...(r.urgency === "critical" ? ["عاجل"] : [])];
  const cta = `🙋 سجّل مشاركتك في ثوانٍ: ${shortLink}`;

  const caption = [
    `${cat.emoji} ${r.urgency === "critical" ? "🚨 " : ""}${headline}`,
    `✅ نداء موثّق بواسطة إيثار — درجة المصداقية ${r.credibilityScore}% · ${urg.labelAr}`,
    "",
    r.aiSummary,
    "",
    ...details.map((d) => `${d.icon} ${d.text}`),
    "",
    cta,
    "",
    hashtags.map((h) => `#${h}`).join(" "),
  ].join("\n");

  return { headline, caption, hashtags, cta, shortLink, category: r.category, urgency: r.urgency, wilaya, score: r.credibilityScore, details };
}
