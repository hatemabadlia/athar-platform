import { describe, expect, it } from "vitest";
import { CIVIC_PUBLIC_STATUSES, CIVIC_STATUS, CIVIC_TRANSITIONS, RECYCLED_HASH_DISTANCE, hashDistance, type CivicStatus } from "@/lib/civic";

describe("صوّر وبلّغ — image fingerprints", () => {
  it("identical hashes have distance 0, one flipped bit = 1, inverted = 64", () => {
    expect(hashDistance("1234567890123", "1234567890123")).toBe(0);
    expect(hashDistance("8", "9")).toBe(1);
    expect(hashDistance("0", "-1")).toBe(64);
  });
  it("re-uploaded photo threshold is strict (≤ 6 bits of 64)", () => {
    expect(RECYCLED_HASH_DISTANCE).toBe(6);
    expect(hashDistance("-9223372036854775808", "9223372036854775807")).toBe(64);
  });
});

describe("صوّر وبلّغ — status workflow (mirrors public.civic_set_status)", () => {
  it("nothing becomes public without a moderator", () => {
    expect(CIVIC_PUBLIC_STATUSES).not.toContain("pending_review");
    expect(CIVIC_PUBLIC_STATUSES).not.toContain("submitted");
    expect(CIVIC_PUBLIC_STATUSES).not.toContain("needs_info");
  });
  it("a report cannot jump from review straight to resolved or forwarded", () => {
    expect(CIVIC_TRANSITIONS.pending_review).not.toContain("resolved");
    expect(CIVIC_TRANSITIONS.pending_review).not.toContain("forwarded");
  });
  it("closed is final; rejected and duplicate can be reopened for review", () => {
    expect(CIVIC_TRANSITIONS.closed).toEqual([]);
    expect(CIVIC_TRANSITIONS.rejected).toEqual(["pending_review"]);
    expect(CIVIC_TRANSITIONS.duplicate).toEqual(["pending_review"]);
  });
  it("every transition target is a known status with a label", () => {
    for (const [from, tos] of Object.entries(CIVIC_TRANSITIONS)) {
      expect(CIVIC_STATUS[from as CivicStatus]).toBeDefined();
      for (const t of tos) expect(CIVIC_STATUS[t].ar.length).toBeGreaterThan(1);
    }
  });
});
