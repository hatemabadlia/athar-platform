import { describe, expect, it } from "vitest";
import { extractPhones, extractBloodType, normalizePhone, extractYears, phoneAppearsIn, canonicalText } from "@/lib/pipeline/text";

describe("phone extraction", () => {
  it("finds Algerian mobiles with separators", () => {
    expect(extractPhones("اتصلوا 0555 12 34 56 أو 0661-44-55-66")).toEqual(["0555123456", "0661445566"]);
  });
  it("handles +213 and 00213 prefixes", () => {
    expect(extractPhones("+213 770 88 12 30 / 00213661000000")).toEqual(["0770881230", "0661000000"]);
  });
  it("ignores numbers that are not phones", () => {
    expect(extractPhones("CCP 000123456 clé 12, 2021")).toEqual([]);
  });
  it("normalises", () => {
    expect(normalizePhone("+213 5 55 12 34 56")).toBe("0555123456");
    expect(normalizePhone("12345")).toBeNull();
  });
  it("detects hallucinated phones", () => {
    expect(phoneAppearsIn("0555123456", "رقم 0555 12 34 56")).toBe(true);
    expect(phoneAppearsIn("0555999999", "رقم 0555 12 34 56")).toBe(false);
  });
});

describe("blood type", () => {
  it.each([
    ["فصيلة O+ عاجل", "O+"], ["فصيلة AB- لطفلة", "AB-"], ["groupe A négatif", "A-"], ["B موجب", "B+"], ["لا شيء", null],
  ])("%s → %s", (t, want) => expect(extractBloodType(t)).toBe(want));
});

describe("years and canonical text", () => {
  it("extracts years", () => expect(extractYears("نشر في 14/03/2021 ثم 2023")).toEqual([2021, 2023]));
  it("canonical text ignores harakat and hamza variants", () => {
    expect(canonicalText("إغاثةٌ  عاجلة!")).toBe(canonicalText("اغاثه عاجله"));
  });
});

describe("maskPhones (before sending text to a free AI tier)", () => {
  it("removes every Algerian number and keeps them locally", async () => {
    const { maskPhones } = await import("@/lib/pipeline/text");
    const r = maskPhones("اتصلوا 0555 00 01 01 أو +213 661 23 45 67 قبل الخامسة");
    expect(r.masked).not.toMatch(/\d{2}\s?\d{2}\s?\d{2}/);
    expect(r.masked).toContain("[هاتف-1]");
    expect(r.masked).toContain("[هاتف-2]");
    expect(r.phones).toEqual(["0555000101", "0661234567"]);
  });
  it("leaves text without numbers unchanged", async () => {
    const { maskPhones } = await import("@/lib/pipeline/text");
    expect(maskPhones("نحتاجو دم فصيلة O+").masked).toBe("نحتاجو دم فصيلة O+");
  });
});
