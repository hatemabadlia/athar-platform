import { describe, expect, it } from "vitest";
import { heuristicAnalyze } from "@/lib/pipeline/heuristic";
import { verifyVerdict } from "@/lib/pipeline/verify";
import type { ActiveCandidate, Analysis, HistoricalCandidate } from "@/lib/pipeline/types";

const NOW = new Date("2026-11-03T12:00:00Z");
const blood: Analysis = heuristicAnalyze("خاوتي نحتاجو دم فصيلة B+ فسبيطار باتنة اليوم قبل 17:00 يتصل على 0555 00 00 01");
const hist = (o: Partial<HistoricalCandidate> = {}): HistoricalCandidate => ({
  id: "h1", normalized_text: "", first_seen_at: "2021-01-14T00:00:00Z", resolved_at: null, times_seen: 47,
  exact: true, text_similarity: 1, vector_similarity: null, phone_match: true, ...o,
});
const active = (o: Partial<ActiveCandidate> = {}): ActiveCandidate => ({
  id: "a1", title: "تبرع بالدم B+ — باتنة", status: "approved", wilaya_code: 5, category: "blood", created_at: "2026-11-02T08:00:00Z",
  text_similarity: 0.9, vector_similarity: null, phone_match: true, same_place: true, same_category: true, ...o,
});
const run = (o: Partial<Parameters<typeof verifyVerdict>[0]>) =>
  verifyVerdict({ analysis: blood, recycled: null, duplicate: null, archiveSize: 4, now: NOW, ...o });

describe("Is this post real? — verdicts", () => {
  it("resolved: an old post whose case was closed is not to be redistributed, without calling it fraud", () => {
    const r = run({ recycled: hist({ resolved_at: "2021-01-20T00:00:00Z" }) });
    expect(r.status).toBe("resolved");
    expect(r.recommendation).toBe("dont_share");
    expect(r.advice).toContain("2021-01-20");
    expect(r.headline + r.advice).not.toMatch(/احتيال|كاذب|مزيف/);
  });

  it("active: matching a moderator-approved request recommends sharing the ATHAR link", () => {
    const r = run({ duplicate: active() });
    expect(r.status).toBe("active");
    expect(r.recommendation).toBe("share");
    expect(r.publicAlertId).toBe("a1");
  });

  it("never exposes a pending (unreviewed) request id or title", () => {
    const r = run({ duplicate: active({ status: "pending", title: "عنوان سري" }) });
    expect(r.status).toBe("recycled");
    expect(r.publicAlertId).toBeNull();
    expect(JSON.stringify(r)).not.toContain("عنوان سري");
  });

  it("recycled: seen before with unknown outcome → review, and says it is not necessarily fraud", () => {
    const r = run({ recycled: hist() });
    expect(r.status).toBe("recycled");
    expect(r.recommendation).toBe("review");
    expect(r.advice).toContain("لا يعني أنه احتيال");
    expect(r.evidence.some((e) => e.kind === "match" && e.text.includes("47"))).toBe(true);
  });

  it("an old archive match wins over an approved duplicate (content predates the current request)", () => {
    expect(run({ recycled: hist(), duplicate: active() }).status).toBe("recycled");
  });

  it("suspicious: money transfer request with no history → do not share, with the reason listed", () => {
    const r = run({ analysis: { ...blood, money_request: true } });
    expect(r.status).toBe("suspicious");
    expect(r.recommendation).toBe("dont_share");
    expect(r.evidence.some((e) => e.kind === "warning" && e.text.includes("تحويل"))).toBe(true);
  });

  it("suspicious: stale years alone → review, not block", () => {
    const r = run({ analysis: { ...blood, mentioned_dates: ["2019"] } });
    expect(r.status).toBe("suspicious");
    expect(r.recommendation).toBe("review");
  });

  it("insufficient: a new, complete request is still 'not enough evidence' until a moderator checks it", () => {
    const r = run({});
    expect(r.status).toBe("insufficient");
    expect(r.recommendation).toBe("review");
    expect(r.evidence.some((e) => e.kind === "missing" && e.text.includes("لا يطابق"))).toBe(true);
  });

  it("insufficient: missing wilaya and phone are listed as missing evidence", () => {
    const r = run({ analysis: { ...blood, wilaya_code: null, phone_numbers: [] } });
    expect(r.status).toBe("insufficient");
    expect(r.evidence.filter((e) => e.kind === "missing").length).toBeGreaterThanOrEqual(3);
  });

  it("every verdict carries at least one piece of evidence", () => {
    for (const r of [run({}), run({ recycled: hist() }), run({ duplicate: active() }), run({ analysis: { ...blood, money_request: true } })])
      expect(r.evidence.length).toBeGreaterThan(0);
  });
});
