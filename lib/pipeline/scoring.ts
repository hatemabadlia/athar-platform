/**
 * Stages 5–7 decision logic (pure, unit-tested).
 * The credibility score is an explainable triage aid for moderators — never proof that a request is genuine.
 */
import { modeLabel, type ActiveCandidate, type Analysis, type AnalysisMode, type CredibilityReason, type HistoricalCandidate, type Verdict } from "./types";

export const THRESHOLDS = {
  recycledText: 0.6,
  recycledVector: 0.92,
  recycledPhoneText: 0.3,
  duplicateText: 0.55,
  duplicateVector: 0.9,
  autoLinkText: 0.85,
} as const;

export function bestRecycled(cands: HistoricalCandidate[]): HistoricalCandidate | null {
  const hits = cands.filter((c) =>
    c.exact
    || c.text_similarity >= THRESHOLDS.recycledText
    || (c.vector_similarity ?? 0) >= THRESHOLDS.recycledVector
    || (c.phone_match && c.text_similarity >= THRESHOLDS.recycledPhoneText));
  return hits.sort((a, b) => Number(b.exact) - Number(a.exact) || b.text_similarity - a.text_similarity)[0] ?? null;
}

export function bestDuplicate(cands: ActiveCandidate[]): (ActiveCandidate & { autoLink: boolean }) | null {
  const hits = cands.filter((c) => c.same_category && c.same_place && (
    c.text_similarity >= THRESHOLDS.duplicateText
    || (c.vector_similarity ?? 0) >= THRESHOLDS.duplicateVector
    || c.phone_match));
  const best = hits.sort((a, b) => b.text_similarity - a.text_similarity)[0];
  if (!best) return null;
  return { ...best, autoLink: best.text_similarity >= THRESHOLDS.autoLinkText };
}

/**
 * Years that make an emergency post look stale: two or more years ago, or last year once we are
 * past March (a December post read in January is still plausible).
 */
export function staleYears(mentioned: string[], now = new Date()): number[] {
  const current = now.getFullYear();
  const years = new Set(mentioned.flatMap((d) => [...d.matchAll(/(19[9]\d|20\d{2})/g)].map((m) => Number(m[1]))));
  return [...years].filter((y) => y >= 1990 && (y <= current - 2 || (y === current - 1 && now.getMonth() >= 2)));
}

export interface ScoreInput {
  analysis: Analysis;
  mode: AnalysisMode;
  channel: string;
  verifiedAssociation: boolean;
  wilayaMatched: boolean;
  recycled: HistoricalCandidate | null;
  duplicate: ActiveCandidate | null;
  now?: Date;
}

export function scoreCredibility(i: ScoreInput): { score: number; reasons: CredibilityReason[]; verdict: Verdict; review: string[] } {
  const reasons: CredibilityReason[] = [];
  const add = (label: string, delta: number) => reasons.push({ label, delta });
  let s = 50;
  add("نقطة البداية لأي نداء غير موثّق", 0);

  if (i.verifiedAssociation) add("مصدر من جمعية معتمدة على المنصة", 15);
  else if (i.channel === "moderator_paste") add("أدخله مشرف بعد الاطلاع على المصدر", 5);
  else if (i.channel === "web_form") add("مُرسل عبر الاستمارة العامة (غير موثّق بعد)", 0);
  else add(`مُستقبل عبر قناة ${i.channel}`, 0);

  if (i.analysis.phone_numbers.length) add("يحتوي رقم اتصال جزائري صالح", 10);
  else add("لا يوجد رقم اتصال للتحقق", -10);
  if (i.wilayaMatched) add("الولاية محددة", 10);
  else add("الولاية غير محددة", -10);
  if (i.analysis.institution) add(`يذكر مؤسسة: ${i.analysis.institution}`, 5);
  if (i.analysis.deadline_text) add("يذكر موعداً أو توقيتاً محدداً", 5);
  if (i.analysis.money_request) add("يطلب تحويلاً مالياً — نمط شائع في الاحتيال", -30);
  if (!i.analysis.is_help_request) add("لا يبدو طلب مساعدة إنسانية", -20);

  const old = staleYears(i.analysis.mentioned_dates, i.now);
  if (old.length) add(`يذكر تاريخاً قديماً (${old.join("، ")})`, -20);

  if (i.recycled) {
    const pct = Math.round(Math.max(i.recycled.text_similarity, i.recycled.vector_similarity ?? 0) * 100);
    add(`${i.recycled.exact ? "نص مطابق تماماً" : `تشابه ${pct}%`} مع محتوى رُصد أول مرة ${i.recycled.first_seen_at.slice(0, 10)}`, -35);
    if (i.recycled.phone_match) add("نفس رقم الهاتف في المحتوى القديم", -5);
    if (i.recycled.resolved_at) add(`الحالة القديمة أُغلقت في ${i.recycled.resolved_at.slice(0, 10)}`, -5);
  }
  if (i.duplicate) add(`مكرر محتمل لنداء نشط: «${i.duplicate.title}»`, 0);

  const confDelta = Math.round((i.analysis.confidence - 0.5) * 10);
  if (confDelta !== 0) add(`ثقة التحليل (${modeLabel(i.mode)}) ${Math.round(i.analysis.confidence * 100)}%`, confDelta);

  for (const r of reasons) s += r.delta;
  const score = Math.max(0, Math.min(100, s));

  const verdict: Verdict = i.recycled ? "recycled" : i.duplicate ? "duplicate" : score < 50 || !i.analysis.is_help_request ? "low-confidence" : "fresh";
  const review = [...i.analysis.attention];
  if (i.recycled) review.push("مطابقة مع محتوى قديم — تحقّق قبل الاعتماد (لا يعني بالضرورة احتيالاً).");
  if (i.duplicate) review.push("قد يكون مكرراً لنداء نشط — راجع الدمج.");
  if (i.analysis.money_request) review.push("طلب تحويل مالي.");
  if (old.length) review.push("يذكر سنوات سابقة.");
  return { score, reasons, verdict, review: [...new Set(review)] };
}
