import { describe, expect, it } from "vitest";
import { canDonateTo, compatibleDonors, matchAlerts } from "@/lib/matching";
import { earnedBadges } from "@/lib/badges";
import { computeForecasts } from "@/lib/forecast";
import { parseCsv, toCsv } from "@/lib/csv";
import { haversineKm } from "@/lib/geo";
import type { PublicAlert } from "@/lib/types";

describe("blood compatibility (red cells)", () => {
  it("O- is universal donor, AB+ universal recipient", () => {
    expect(compatibleDonors("AB+")).toHaveLength(8);
    expect(["O+", "A-", "AB+"].every((r) => canDonateTo("O-", r as never))).toBe(true);
  });
  it("rejects incompatible pairs", () => {
    expect(canDonateTo("A+", "O+")).toBe(false);
    expect(canDonateTo("AB+", "A+")).toBe(false);
    expect(compatibleDonors("O-")).toEqual(["O-"]);
  });
});

const alert = (o: Partial<PublicAlert>): PublicAlert => ({ id: Math.random().toString(), title: "t", summary: "", category: "blood", urgency: "medium", status: "approved",
  wilayaCode: 16, wilaya: "", baladiya: null, institution: null, lat: null, lng: null, locationPrecision: "wilaya", credibilityScore: 70, credibilityReasons: [],
  aiMode: "heuristic", volunteersNeeded: 5, volunteersJoined: 0, bloodType: "A+", deadline: null, createdAt: "2026-10-31T00:00:00Z", sourceCount: 1, ...o });

describe("volunteer matching", () => {
  const v = { wilayaCode: 16, bloodType: "O-" as const, skills: ["إسعافات أولية"], availability: "anytime" as const };
  it("matches compatible blood with a reason", () => {
    const m = matchAlerts(v, [alert({ bloodType: "A+" })]);
    expect(m).toHaveLength(1);
    expect(m[0].reasons.join()).toMatch(/متوافقة/);
  });
  it("never suggests incompatible blood requests", () => {
    expect(matchAlerts({ ...v, bloodType: "A+" }, [alert({ bloodType: "O-" })])).toHaveLength(0);
  });
  it("skips full, joined and expired alerts", () => {
    const now = new Date("2026-11-01T00:00:00Z");
    expect(matchAlerts(v, [alert({ volunteersJoined: 5 }), alert({ joinedByMe: true }), alert({ deadline: "2026-10-01T00:00:00Z" })], 6, now)).toHaveLength(0);
  });
});

describe("badges from confirmed actions only", () => {
  it("nothing without confirmations", () => expect(earnedBadges({ confirmedParticipations: [], attendanceCount: 0, treesApproved: 0, clubCount: 3 })).toEqual([]));
  it("derives from facts", () => {
    const b = earnedBadges({ confirmedParticipations: [{ category: "blood", urgency: "critical" }], attendanceCount: 2, treesApproved: 5, clubCount: 1 });
    expect(b).toEqual(expect.arrayContaining(["first_step", "blood_hero", "responder", "committed", "club_member", "planter", "forester"]));
  });
});

describe("forecasts", () => {
  it("refuses with too little history", () => {
    const r = computeForecasts([{ category: "blood", wilayaCode: 16, createdAt: "2026-10-01T00:00:00Z" }], new Date("2026-11-01T00:00:00Z"));
    expect(r.enough).toBe(false);
    expect(r.reason).toMatch(/غير كافية/);
  });
  it("seasonal naive with enough history", () => {
    const pts = [];
    for (let i = 0; i < 40; i++) pts.push({ category: "relief", wilayaCode: 26, createdAt: `2025-12-${String((i % 28) + 1).padStart(2, "0")}T00:00:00Z` });
    for (let i = 0; i < 5; i++) pts.push({ category: "relief", wilayaCode: 26, createdAt: `2025-06-0${i + 1}T00:00:00Z` });
    const r = computeForecasts(pts, new Date("2026-11-15T00:00:00Z"));
    expect(r.enough).toBe(true);
    expect(r.forecasts[0]).toMatchObject({ category: "relief", month: "2026-12", expected: 40, basedOnYears: 1 });
  });
});

describe("csv", () => {
  it("parses quotes, commas and CRLF", () => {
    const rows = parseCsv('﻿name_ar,Wilaya_Code\r\n"دار الشباب, المركز",16\r\n"قال ""نعم""",9\r\n');
    expect(rows).toEqual([{ name_ar: "دار الشباب, المركز", wilaya_code: "16" }, { name_ar: 'قال "نعم"', wilaya_code: "9" }]);
  });
  it("round-trips", () => expect(parseCsv(toCsv([{ a: 'x,"y"', b: 2 }]))).toEqual([{ a: 'x,"y"', b: "2" }]));
});

describe("geo", () => it("Algiers–Oran ≈ 350 km", () => expect(Math.round(haversineKm(36.75, 3.06, 35.7, -0.64) / 10)).toBe(35)));

describe("beneficiary identifiers", async () => {
  const { normalizeBeneficiaryId } = await import("@/lib/beneficiary");
  it("normalises NIN and phones (incl. Arabic digits)", () => {
    expect(normalizeBeneficiaryId("1234 5678 9012 3456 78")).toBe("nin:123456789012345678");
    expect(normalizeBeneficiaryId("٠٥٥٥ ١٢ ٣٤ ٥٦")).toBe("tel:0555123456");
    expect(normalizeBeneficiaryId("+213 555 12 34 56")).toBe("tel:0555123456");
    expect(normalizeBeneficiaryId("abc")).toBeNull();
  });
});

describe("in-kind matching", async () => {
  const { suggestMatches } = await import("@/lib/inkind");
  const base = { status: "open", category: "clothes" } as const;
  it("same category, prefers same wilaya, excludes own items", () => {
    const need = { ...base, id: "n", kind: "need" as const, quantity: 10, wilayaCode: 31, ownerId: "u1" };
    const pool = [
      { ...base, id: "o1", kind: "offer" as const, quantity: 10, wilayaCode: 16, ownerId: "u2" },
      { ...base, id: "o2", kind: "offer" as const, quantity: 5, wilayaCode: 31, ownerId: "u3" },
      { ...base, id: "o3", kind: "offer" as const, quantity: 5, wilayaCode: 31, ownerId: "u1" },
      { ...base, id: "o4", kind: "offer" as const, category: "food" as never, quantity: 5, wilayaCode: 31, ownerId: "u4" },
    ];
    expect(suggestMatches(need, pool).map((m) => m.item.id)).toEqual(["o2", "o1"]);
  });
});

describe("chat language detection", async () => {
  const { isFrench } = await import("@/lib/chat/lang");
  it("detects French vs Arabic/Darija", () => {
    expect(isFrench("Où donner mon sang à Oran ?")).toBe(true);
    expect(isFrench("وين نتبرع بالدم في وهران؟")).toBe(false);
    expect(isFrench("O+")).toBe(false);
  });
});
