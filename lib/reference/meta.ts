/**
 * Product reference definitions (labels, colours, badge rules, SMS templates). Not data.
 * Facts that are data (wilayas, blood compatibility) live in the database.
 */
import type { Category, Urgency, AlertStatus, CrisisType } from "@/lib/types";

export const CATEGORY_META: Record<
  Category,
  { label: string; labelAr: string; color: string; bg: string; emoji: string }
> = {
  blood: { label: "Blood Donation", labelAr: "تبرع بالدم", color: "text-rose-700", bg: "bg-rose-100", emoji: "🩸" },
  relief: { label: "Relief", labelAr: "إغاثة", color: "text-amber-700", bg: "bg-amber-100", emoji: "🏠" },
  cleanup: { label: "Cleanup", labelAr: "تنظيف", color: "text-emerald-700", bg: "bg-emerald-100", emoji: "🌊" },
  orphans: { label: "Orphans", labelAr: "أيتام", color: "text-violet-700", bg: "bg-violet-100", emoji: "🧒" },
  medical: { label: "Medical", labelAr: "طبي", color: "text-sky-700", bg: "bg-sky-100", emoji: "🏥" },
  education: { label: "Education", labelAr: "تعليم", color: "text-indigo-700", bg: "bg-indigo-100", emoji: "📚" },
};

export const URGENCY_META: Record<
  Urgency,
  { label: string; labelAr: string; color: string; bg: string; hex: string; ring: string }
> = {
  critical: { label: "Critical", labelAr: "حرج", color: "text-red-700", bg: "bg-red-100", hex: "#dc2626", ring: "ring-red-500" },
  medium: { label: "Medium", labelAr: "متوسط", color: "text-orange-700", bg: "bg-orange-100", hex: "#ea580c", ring: "ring-orange-500" },
  normal: { label: "Normal", labelAr: "عادي", color: "text-green-700", bg: "bg-green-100", hex: "#16a34a", ring: "ring-green-500" },
};

export const STATUS_META: Record<
  AlertStatus,
  { labelAr: string; color: string; bg: string }
> = {
  pending: { labelAr: "قيد المراجعة", color: "text-slate-700", bg: "bg-slate-100" },
  approved: { labelAr: "موافق عليه", color: "text-emerald-700", bg: "bg-emerald-100" },
  rejected: { labelAr: "مرفوض", color: "text-red-700", bg: "bg-red-100" },
  resolved: { labelAr: "تم الحل", color: "text-sky-700", bg: "bg-sky-100" },
  recycled: { labelAr: "منشور قديم", color: "text-fuchsia-700", bg: "bg-fuchsia-100" },
  merged: { labelAr: "مدمج", color: "text-indigo-700", bg: "bg-indigo-100" },
  expired: { labelAr: "منتهي", color: "text-slate-500", bg: "bg-slate-100" },
};

export const SKILLS = [
  "إسعافات أولية", "نقل وتوزيع", "طبخ", "تعليم ودعم مدرسي", "تصميم وإعلام",
  "برمجة", "تنظيم فعاليات", "ترجمة", "دعم نفسي", "صيانة وبناء",
];

export const BLOOD_TYPES = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"] as const;

export const BADGES: Record<string, { label: string; emoji: string; desc: string }> = {
  first_step: { label: "الخطوة الأولى", emoji: "🌱", desc: "أول مشاركة مؤكدة" },
  blood_hero: { label: "بطل الدم", emoji: "🩸", desc: "الاستجابة لنداء تبرع بالدم" },
  club_member: { label: "عضو نادٍ فاعل", emoji: "🏛️", desc: "حضور مؤكد في نشاط نادٍ" },
  responder: { label: "مستجيب سريع", emoji: "⚡", desc: "الاستجابة لنداء حرج" },
  committed: { label: "ملتزم", emoji: "🔥", desc: "3 مشاركات تطوعية" },
  eco: { label: "صديق البيئة", emoji: "🌊", desc: "المشاركة في حملة تنظيف" },
  planter: { label: "غارس", emoji: "🌳", desc: "أول شجرة موثّقة في غابة إيثار" },
  forester: { label: "حارس الغابة", emoji: "🌲", desc: "5 أشجار موثّقة" },
};

// SMS templates (≤ 160 chars ideally). {w} = wilaya, {hub} = assembly point chosen by the admin.
// Templates never claim shelters are open — the admin picks a real, opened shelter as {hub}.
export const CRISIS_META: Record<Exclude<CrisisType, "other">, { label: string; emoji: string; needs: string[]; sms: string }> = {
  flood: { label: "فيضانات", emoji: "🌊", needs: ["أغطية", "مواد غذائية جافة", "ماء"], sms: "إيثار: فيضانات في {w}. نقطة التجمع: {hub}. رد بـ 1 إذا كنت متاحاً للتطوع." },
  earthquake: { label: "زلزال", emoji: "🏚️", needs: ["إسعافات أولية", "ماء", "أغطية"], sms: "إيثار: زلزال في {w}. نقطة التجمع: {hub}. اتبع تعليمات الحماية المدنية. رد بـ 1 إذا كنت متاحاً." },
  fire: { label: "حرائق غابات", emoji: "🔥", needs: ["ماء", "تموين", "نقل"], sms: "إيثار: حرائق في {w}. لا تقترب من الجبهة. نقطة التجمع: {hub}. رد بـ 1 إذا كنت متاحاً." },
  cold: { label: "موجة برد وثلوج", emoji: "❄️", needs: ["أغطية", "وجبات ساخنة"], sms: "إيثار: موجة برد في {w}. نقطة التجمع: {hub}. رد بـ 1 إذا كنت متاحاً للتوزيع." },
};

export const TREE_SPECIES = [
  { name: "زيتون", emoji: "🫒", color: "from-lime-600 to-emerald-900" },
  { name: "صنوبر حلبي", emoji: "🌲", color: "from-emerald-600 to-teal-900" },
  { name: "أرز أطلسي", emoji: "🌲", color: "from-teal-600 to-slate-900" },
  { name: "خروب", emoji: "🌳", color: "from-green-600 to-emerald-900" },
  { name: "بلوط الفلين", emoji: "🌳", color: "from-amber-700 to-emerald-900" },
  { name: "نخيل", emoji: "🌴", color: "from-yellow-600 to-orange-900" },
  { name: "أكاسيا", emoji: "🌿", color: "from-lime-500 to-green-900" },
  { name: "كاليتوس", emoji: "🌱", color: "from-emerald-500 to-cyan-900" },
];

export const TREE_PLACES = ["دار الشباب", "مدرسة ابتدائية", "حديقة الحي", "حافة الطريق", "غابة بلدية", "مستشفى", "جامعة", "ساحة عمومية"];
