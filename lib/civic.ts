/**
 * صوّر وبلّغ — shared definitions (client + server). Mirrors civic_categories and the civic_status enum.
 * Civic severity is NOT the humanitarian credibility score: the two are never mixed.
 */
export const CIVIC_CATEGORIES = {
  road: { ar: "طريق متضرر / حفرة", fr: "Route dégradée / nid-de-poule", emoji: "🕳️", color: "#b45309" },
  lighting: { ar: "إنارة عمومية معطلة", fr: "Éclairage public en panne", emoji: "💡", color: "#ca8a04" },
  waste: { ar: "تراكم النفايات", fr: "Accumulation de déchets", emoji: "🗑️", color: "#65a30d" },
  water: { ar: "تسرب مياه", fr: "Fuite d'eau", emoji: "💧", color: "#0284c7" },
  sidewalk: { ar: "رصيف متضرر", fr: "Trottoir endommagé", emoji: "🚶", color: "#7c3aed" },
  traffic_sign: { ar: "إشارة مرور مكسورة", fr: "Panneau cassé", emoji: "🚸", color: "#dc2626" },
  manhole: { ar: "بالوعة مفتوحة", fr: "Regard ouvert", emoji: "⚠️", color: "#ea580c" },
  electrical: { ar: "أسلاك كهربائية خطيرة", fr: "Câbles électriques dangereux", emoji: "⚡", color: "#e11d48" },
  drainage: { ar: "انسداد قنوات الصرف", fr: "Évacuation bouchée", emoji: "🌊", color: "#0d9488" },
  public_space: { ar: "فضاء عمومي مهمل أو خطير", fr: "Espace public abandonné", emoji: "🏚️", color: "#475569" },
  other: { ar: "مشكل آخر", fr: "Autre problème", emoji: "📍", color: "#64748b" },
} as const;
export type CivicCategory = keyof typeof CIVIC_CATEGORIES;
export const CIVIC_CATEGORY_KEYS = Object.keys(CIVIC_CATEGORIES) as CivicCategory[];

export const CIVIC_SEVERITY = {
  low: { ar: "بسيط", fr: "Faible", cls: "bg-slate-100 text-slate-700" },
  medium: { ar: "متوسط", fr: "Moyen", cls: "bg-amber-100 text-amber-800" },
  high: { ar: "كبير", fr: "Élevé", cls: "bg-orange-100 text-orange-800" },
  danger: { ar: "خطر على السلامة", fr: "Danger", cls: "bg-red-100 text-red-800" },
} as const;
export type CivicSeverity = keyof typeof CIVIC_SEVERITY;

export const CIVIC_STATUS = {
  submitted: { ar: "مُرسل", fr: "Envoyé", color: "#64748b", step: 1 },
  pending_review: { ar: "قيد المراجعة", fr: "En cours d'examen", color: "#64748b", step: 2 },
  needs_info: { ar: "يحتاج معلومات", fr: "Informations requises", color: "#d97706", step: 2 },
  verified: { ar: "تحقّق منه مشرف", fr: "Vérifié", color: "#059669", step: 3 },
  forwarded: { ar: "أُحيل إلى جهة مسؤولة", fr: "Transmis", color: "#0284c7", step: 4 },
  in_progress: { ar: "قيد المعالجة", fr: "En cours", color: "#7c3aed", step: 5 },
  resolved: { ar: "حُلّ", fr: "Résolu", color: "#16a34a", step: 6 },
  closed: { ar: "مُغلق", fr: "Clôturé", color: "#334155", step: 7 },
  rejected: { ar: "مرفوض", fr: "Rejeté", color: "#dc2626", step: 0 },
  duplicate: { ar: "مكرر", fr: "Doublon", color: "#9333ea", step: 0 },
} as const;
export type CivicStatus = keyof typeof CIVIC_STATUS;
export const CIVIC_PUBLIC_STATUSES: CivicStatus[] = ["verified", "forwarded", "in_progress", "resolved", "closed"];
export const CIVIC_TIMELINE: CivicStatus[] = ["pending_review", "verified", "forwarded", "in_progress", "resolved", "closed"];

/** Allowed moderator transitions — same table as public.civic_set_status (the database is authoritative). */
export const CIVIC_TRANSITIONS: Record<CivicStatus, CivicStatus[]> = {
  submitted: ["pending_review", "verified", "rejected", "duplicate", "needs_info"],
  pending_review: ["verified", "rejected", "duplicate", "needs_info"],
  needs_info: ["pending_review", "verified", "rejected", "duplicate"],
  verified: ["forwarded", "in_progress", "resolved", "duplicate", "rejected"],
  forwarded: ["in_progress", "resolved"],
  in_progress: ["resolved"],
  resolved: ["closed", "in_progress"],
  closed: [],
  rejected: ["pending_review"],
  duplicate: ["pending_review"],
};

/** Hamming distance between two 64-bit hashes given as decimal strings (mirror of private.hamming). */
export function hashDistance(a: string, b: string): number {
  let x = BigInt.asUintN(64, BigInt(a) ^ BigInt(b)), n = 0;
  while (x) { n += Number(x & BigInt(1)); x >>= BigInt(1); }
  return n;
}
export const RECYCLED_HASH_DISTANCE = 6;
