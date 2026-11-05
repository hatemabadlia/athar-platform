import { describe, expect, it } from "vitest";
import { heuristicAnalyze, normalizeDarija, classifyCategory } from "@/lib/pipeline/heuristic";
import { sanitizeAnalysis } from "@/lib/pipeline/sanitize";
import { bestDuplicate, bestRecycled, scoreCredibility, staleYears } from "@/lib/pipeline/scoring";
import type { ActiveCandidate, Analysis, HistoricalCandidate } from "@/lib/pipeline/types";

const DARIJA = "السلام عليكم خاوتي، راهم يحتاجو دم فصيلة B+ فسبيطار باتنة، اللي يقدر يجي اليوم قبل 17:00 يتصل على 0661 23 45 67";

describe("Darija normalisation", () => {
  it("rewrites dialect terms and keeps the list", () => {
    const r = normalizeDarija(DARIJA);
    expect(r.terms.map((t) => t.from)).toEqual(expect.arrayContaining(["خاوتي", "يحتاجو", "فسبيطار"]));
    expect(r.text).toContain("بمستشفى");
  });
  it("does not replace inside other words", () => {
    expect(normalizeDarija("داري").text).toBe("داري");
  });
});

describe("rule-based analysis", () => {
  it("extracts the blood call fields", () => {
    const a = heuristicAnalyze(DARIJA);
    expect(a.category).toBe("blood");
    expect(a.blood_type).toBe("B+");
    expect(a.wilaya_code).toBe(5);
    expect(a.phone_numbers).toEqual(["0661234567"]);
    expect(a.urgency).not.toBe("normal");
    expect(a.attention[0]).toMatch(/بالقواعد/);
  });
  it("returns null category for unrelated text instead of guessing", () => {
    expect(classifyCategory("مباراة كرة القدم اليوم").category).toBeNull();
  });
  it("flags money transfer requests", () => {
    expect(heuristicAnalyze("ساعدونا بالتحويل إلى الحساب البريدي CCP 000123 لبناء مسجد بغرداية").money_request).toBe(true);
  });
});

const base: Analysis = heuristicAnalyze(DARIJA);

describe("sanitiser", () => {
  it("drops values not present in the source", () => {
    const fake: Analysis = { ...base, phone_numbers: ["0555999999", "0661 23 45 67"], wilaya_code: 99, blood_type: "AB-" };
    const { analysis, dropped } = sanitizeAnalysis(fake, "نداء عاجل في باتنة للتواصل 0661 23 45 67");
    expect(analysis.phone_numbers).toEqual(["0661234567"]);
    expect(analysis.wilaya_code).toBe(5); // invalid 99 dropped, re-detected from text
    expect(analysis.blood_type).toBeNull();
    expect(dropped.length).toBe(3);
  });
});

const hist = (o: Partial<HistoricalCandidate>): HistoricalCandidate => ({ id: "h", normalized_text: "", first_seen_at: "2021-03-14T00:00:00Z", resolved_at: null,
  times_seen: 3, exact: false, text_similarity: 0, vector_similarity: null, phone_match: false, ...o });
const act = (o: Partial<ActiveCandidate>): ActiveCandidate => ({ id: "a", title: "t", status: "approved", wilaya_code: 5, category: "blood",
  created_at: "2026-10-30T00:00:00Z", text_similarity: 0, vector_similarity: null, phone_match: false, same_place: true, same_category: true, ...o });

describe("recycled / duplicate detection", () => {
  it("exact hash is recycled", () => expect(bestRecycled([hist({ exact: true })])).not.toBeNull());
  it("phone match needs some text similarity", () => {
    expect(bestRecycled([hist({ phone_match: true, text_similarity: 0.1 })])).toBeNull();
    expect(bestRecycled([hist({ phone_match: true, text_similarity: 0.35 })])).not.toBeNull();
  });
  it("duplicates must share place and category", () => {
    expect(bestDuplicate([act({ text_similarity: 0.9, same_place: false })])).toBeNull();
    expect(bestDuplicate([act({ text_similarity: 0.9 })])?.autoLink).toBe(true);
    expect(bestDuplicate([act({ text_similarity: 0.6 })])?.autoLink).toBe(false);
  });
});

describe("credibility scoring", () => {
  const now = new Date("2026-11-01T00:00:00Z");
  it("is explainable and bounded", () => {
    const r = scoreCredibility({ analysis: base, mode: "heuristic", channel: "web_form", verifiedAssociation: false, wilayaMatched: true, recycled: null, duplicate: null, now });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.reasons.length).toBeGreaterThan(2);
    expect(r.score).toBe(50 + r.reasons.reduce((s, x) => s + x.delta, 0));
  });
  it("recycled content is flagged for review, not rejected", () => {
    const r = scoreCredibility({ analysis: base, mode: "heuristic", channel: "web_form", verifiedAssociation: false, wilayaMatched: true, recycled: hist({ exact: true }), duplicate: null, now });
    expect(r.verdict).toBe("recycled");
    expect(r.review.join(" ")).toMatch(/لا يعني بالضرورة احتيالاً/);
  });
  it("money requests lower the score", () => {
    const money = { ...base, money_request: true };
    const a = scoreCredibility({ analysis: base, mode: "heuristic", channel: "web_form", verifiedAssociation: false, wilayaMatched: true, recycled: null, duplicate: null, now });
    const b = scoreCredibility({ analysis: money, mode: "heuristic", channel: "web_form", verifiedAssociation: false, wilayaMatched: true, recycled: null, duplicate: null, now });
    expect(b.score).toBeLessThan(a.score);
  });
  it("verified associations get a higher base", () => {
    const a = scoreCredibility({ analysis: base, mode: "claude", channel: "web_form", verifiedAssociation: true, wilayaMatched: true, recycled: null, duplicate: null, now });
    const b = scoreCredibility({ analysis: base, mode: "claude", channel: "web_form", verifiedAssociation: false, wilayaMatched: true, recycled: null, duplicate: null, now });
    expect(a.score - b.score).toBe(15);
  });
  it("stale years", () => {
    expect(staleYears(["2021", "2026"], now)).toEqual([2021]);
    expect(staleYears(["2025"], new Date("2026-01-15T00:00:00Z"))).toEqual([]);
    expect(staleYears(["2025"], now)).toEqual([2025]);
  });
});

describe("keyword matching", () => {
  it("matches inflected forms but not substrings of other words", async () => {
    const { hasKeyword } = await import("@/lib/pipeline/heuristic");
    const { normalizeArabic } = await import("@/lib/pipeline/text");
    expect(hasKeyword(normalizeArabic("فيضانات برج منايل"), "فيضان")).toBe(true);
    expect(hasKeyword(normalizeArabic("للتبرع بالدم"), "دم")).toBe(true);
    expect(hasKeyword(normalizeArabic("مباراة القدم"), "دم")).toBe(false);
  });
});
