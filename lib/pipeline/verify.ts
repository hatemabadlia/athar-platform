/**
 * "Is this post real?" — verdict logic (pure, unit-tested).
 *
 * ATHAR never calls a post fraudulent because it is old or repeated. Each verdict is one of five
 * evidence-based states, and every state carries the evidence that produced it:
 *   active       — matches a request a moderator already verified and is still open
 *   resolved     — the same request was seen before and was closed (need already met)
 *   recycled     — content seen before (archive or a request still under review); status unknown
 *   suspicious   — specific warning signs (money transfer, stale dates, not a help request)
 *   insufficient — nothing to compare with and/or key details missing: not enough evidence either way
 */
import type { ActiveCandidate, Analysis, HistoricalCandidate } from "./types";
import { staleYears } from "./scoring";

export type VerifyStatus = "active" | "resolved" | "recycled" | "suspicious" | "insufficient";
export type Recommendation = "share" | "review" | "dont_share";
export type EvidenceKind = "match" | "positive" | "warning" | "missing";

export interface Evidence { kind: EvidenceKind; text: string }

export interface VerifyInput {
  analysis: Analysis;
  recycled: HistoricalCandidate | null;
  duplicate: ActiveCandidate | null;
  archiveSize: number;
  now?: Date;
}

export interface VerifyResult {
  status: VerifyStatus;
  recommendation: Recommendation;
  headline: string;
  advice: string;
  evidence: Evidence[];
  /** Only for requests already approved by a moderator (public). Never set for pending ones. */
  publicAlertId: string | null;
}

const d = (iso: string) => iso.slice(0, 10);

export function verifyVerdict(i: VerifyInput): VerifyResult {
  const { analysis: a, recycled, duplicate } = i;
  const ev: Evidence[] = [];
  const add = (kind: EvidenceKind, text: string) => ev.push({ kind, text });

  // What the text itself says
  if (a.category) add("positive", `نوع الطلب واضح: ${a.title || a.category}`);
  if (a.wilaya_code) add("positive", "الولاية مذكورة بوضوح");
  else add("missing", "لا تُذكر الولاية — يصعب التحقق محلياً");
  if (a.phone_numbers.length) add("positive", "يحتوي رقم اتصال جزائري يمكن التحقق منه");
  else add("missing", "لا يوجد رقم اتصال");
  if (a.institution) add("positive", `يذكر مؤسسة يمكن الاتصال بها: ${a.institution}`);
  if (a.deadline_text) add("positive", `يذكر موعداً: ${a.deadline_text}`);

  const stale = staleYears(a.mentioned_dates, i.now);
  const warnings: string[] = [];
  if (a.money_request) warnings.push("يطلب تحويل أموال (CCP / حساب / بريدي موب) — تحقّق من الجهة قبل أي تحويل");
  if (stale.length) warnings.push(`يذكر سنوات سابقة (${stale.join("، ")})`);
  if (!a.is_help_request) warnings.push("لا يبدو طلب مساعدة إنسانية");
  for (const w of warnings) add("warning", w);

  // What ATHAR already knows
  if (recycled) {
    const how = recycled.exact ? "نص مطابق تماماً" : `تشابه ${Math.round(Math.max(recycled.text_similarity, recycled.vector_similarity ?? 0) * 100)}%`;
    add("match", `${how} مع منشور رُصد أول مرة في ${d(recycled.first_seen_at)}، وتكرّر ${recycled.times_seen} مرة`);
    if (recycled.phone_match) add("match", "نفس رقم الهاتف ظهر في المنشور القديم");
    if (recycled.resolved_at) add("match", `الحالة القديمة أُغلقت في ${d(recycled.resolved_at)}`);
  }
  if (duplicate) {
    add("match", duplicate.status === "approved"
      ? `يطابق نداءً تحقّق منه مشرف الولاية بتاريخ ${d(duplicate.created_at)}: «${duplicate.title}»`
      : "يطابق نداءً وصل إيثار وهو الآن قيد المراجعة لدى مشرف الولاية");
  }
  if (!recycled && !duplicate) add("missing", `لا يطابق أي منشور في سجل إيثار (${i.archiveSize} منشور سابق + النداءات النشطة)`);

  // Decision — most specific evidence first
  if (recycled?.resolved_at) {
    return { status: "resolved", recommendation: "dont_share", publicAlertId: null, evidence: ev,
      headline: "هذا الطلب سبق حلّه",
      advice: `نفس المنشور ظهر في ${d(recycled.first_seen_at)} وأُغلقت الحالة في ${d(recycled.resolved_at)}. إعادة نشره اليوم قد تُرسل متطوعين إلى حاجة لم تعد قائمة. إن كنت تعرف أن الحاجة تجدّدت، أرسله ليراجعه مشرف.` };
  }
  if (duplicate?.status === "approved" && !recycled) {
    return { status: "active", recommendation: "share", publicAlertId: duplicate.id, evidence: ev,
      headline: "طلب موثّق ونشط على إيثار",
      advice: "راجعه مشرف الولاية وهو مفتوح الآن. شارك رابط إيثار بدل المنشور الأصلي: هكذا يصل المتطوعون إلى آخر المستجدات ولا يُكرَّر الطلب." };
  }
  if (recycled || duplicate) {
    const since = recycled ? `منذ ${d(recycled.first_seen_at)}` : "";
    return { status: "recycled", recommendation: "review", publicAlertId: null, evidence: ev,
      headline: recycled ? "منشور قديم يُعاد تداوله" : "طلب مكرر قيد المراجعة",
      advice: recycled
        ? `هذا المحتوى متداول ${since} ولا نعرف إن كانت الحاجة ما زالت قائمة. هذا لا يعني أنه احتيال — اتصل بصاحب الطلب أو أرسله للمراجعة قبل مشاركته.`
        : "وصل هذا الطلب إلى إيثار من قبل ويراجعه مشرف الولاية الآن. لا حاجة لنشره مرة أخرى؛ سيظهر على الخريطة بعد التحقق." };
  }
  if (warnings.length) {
    return { status: "suspicious", recommendation: a.money_request ? "dont_share" : "review", publicAlertId: null, evidence: ev,
      headline: "مؤشرات تستدعي الحذر",
      advice: "لم نجده في سجلاتنا، لكن فيه علامات تستوجب التحقق قبل المشاركة. هذا لا يُثبت أنه كاذب — تحقّق من الجهة مباشرة أو أرسله ليراجعه مشرف." };
  }
  const missing = ev.filter((e) => e.kind === "missing").length;
  return { status: "insufficient", recommendation: "review", publicAlertId: null, evidence: ev,
    headline: "لا توجد أدلة كافية للحكم",
    advice: missing > 1
      ? "المنشور جديد على إيثار وتنقصه معلومات أساسية للتحقق. اطلب من صاحبه الولاية ورقم الاتصال، أو أرسله ليراجعه مشرف."
      : "المنشور جديد على إيثار ولا يحمل علامات قِدم أو تكرار، لكن لم يتحقق منه أحد بعد. أرسله ليراجعه مشرف الولاية؛ بعد الموافقة يصبح له رابط موثّق." };
}
