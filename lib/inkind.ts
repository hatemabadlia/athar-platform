/** Offer ⇄ need suggestions (pure, unit-tested): same category, same wilaya first, then quantity fit. */
export interface Item { id: string; kind: "offer" | "need"; category: string; quantity: number; wilayaCode: number; ownerId: string; status: string }

export function suggestMatches(item: Item, pool: Item[], limit = 5): { item: Item; reasons: string[]; score: number }[] {
  const wanted = item.kind === "offer" ? "need" : "offer";
  return pool
    .filter((p) => p.kind === wanted && p.status === "open" && p.category === item.category && p.ownerId !== item.ownerId)
    .map((p) => {
      const reasons = ["نفس الفئة"];
      let score = 1;
      if (p.wilayaCode === item.wilayaCode) { score += 3; reasons.push("نفس الولاية"); }
      const fit = Math.min(p.quantity, item.quantity) / Math.max(p.quantity, item.quantity);
      score += fit;
      reasons.push(fit === 1 ? "الكمية متطابقة" : `يغطي ${Math.round((Math.min(p.quantity, item.quantity) / (item.kind === "need" ? item.quantity : p.quantity)) * 100)}%`);
      return { item: p, reasons, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export const ITEM_CATEGORY_AR: Record<string, string> = {
  clothes: "ملابس وأغطية", food: "مواد غذائية", school: "أدوات مدرسية", medical: "مستلزمات طبية", furniture: "أثاث وتجهيزات",
  transport: "نقل (سيارة/شاحنة)", service: "خدمة (استشارة طبية مجانية…)", other: "أخرى",
};
