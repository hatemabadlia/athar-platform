import { describe, expect, it } from "vitest";
import { matchAlerts, usableSkills } from "@/lib/matching";
import { extractSkills, heuristicAnalyze } from "@/lib/pipeline/heuristic";
import { sanitizeAnalysis } from "@/lib/pipeline/sanitize";
import type { PublicAlert } from "@/lib/types";

const alert = (o: Partial<PublicAlert>): PublicAlert => ({ id: Math.random().toString(), title: "t", summary: "", category: "skills", urgency: "normal", status: "approved",
  wilayaCode: 31, wilaya: "", baladiya: null, institution: null, lat: null, lng: null, locationPrecision: "wilaya", credibilityScore: 70, credibilityReasons: [],
  aiMode: "gemini", volunteersNeeded: 1, volunteersJoined: 0, bloodType: null, requiredSkills: ["تصميم وإعلام"], remoteOk: false,
  deadline: null, createdAt: "2026-11-01T00:00:00Z", sourceCount: 1, ...o });
const designerAlgiers = { wilayaCode: 16, bloodType: null, skills: ["تصميم وإعلام"], availability: "evenings" as const, remoteOk: true, verifiedSkills: [] };

describe("skills-based matching (not all help is material)", () => {
  it("a designer in Algiers is matched to a remote design request in Oran, with reasons", () => {
    const [m] = matchAlerts(designerAlgiers, [alert({ remoteOk: true })]);
    expect(m?.reasons).toEqual(expect.arrayContaining(["مهارتك مطلوبة: تصميم وإعلام", "يمكن المساعدة عن بُعد"]));
  });
  it("…but not when the request must be done on site in another wilaya", () => {
    expect(matchAlerts(designerAlgiers, [alert({ remoteOk: false })])).toHaveLength(0);
  });
  it("…nor when the volunteer does not accept remote work", () => {
    expect(matchAlerts({ ...designerAlgiers, remoteOk: false }, [alert({ remoteOk: true })])).toHaveLength(0);
  });
  it("a skills request is never suggested to someone without the skill", () => {
    expect(matchAlerts({ ...designerAlgiers, wilayaCode: 31, skills: ["طبخ"] }, [alert({})])).toHaveLength(0);
  });
  it("regulated professions count only once verified by a moderator", () => {
    const doctor = { wilayaCode: 16, bloodType: null, skills: ["استشارة طبية"], availability: "anytime" as const, remoteOk: false, verifiedSkills: [] as string[] };
    const a = alert({ wilayaCode: 16, requiredSkills: ["استشارة طبية"] });
    expect(usableSkills(doctor, a.requiredSkills)).toEqual([]);
    expect(matchAlerts(doctor, [a])).toHaveLength(0);
    expect(matchAlerts({ ...doctor, verifiedSkills: ["استشارة طبية"] }, [a])[0]?.reasons).toContain("مهارتك مطلوبة: استشارة طبية");
  });
});

describe("skill extraction (rule-based fallback)", () => {
  it("finds a designer and remote work in Darija", () => {
    const r = extractSkills("جمعية في وهران تحتاج مصمم يصمملها منشورات حملة الشتاء، يقدر يخدم عن بعد");
    expect(r.skills).toContain("تصميم وإعلام");
    expect(r.remote).toBe(true);
  });
  it("finds a driver for donations and a translator", () => {
    expect(extractSkills("نحتاجو سائق يوصل التبرعات للبليدة").skills).toContain("نقل وتوزيع");
    expect(extractSkills("عائلة تحتاج مترجم في الاجراءات").skills).toEqual(expect.arrayContaining(["ترجمة", "مرافقة إدارية"]));
  });
  it("a pure blood request needs no skill", () => {
    expect(heuristicAnalyze("نحتاجو دم فصيلة O+ فسبيطار باتنة 0555 00 00 01").required_skills).toEqual([]);
  });
  it("the sanitiser drops skills outside the canonical list and remote without skills", () => {
    const a = heuristicAnalyze("نحتاجو دم فصيلة O+ فسبيطار باتنة");
    const out = sanitizeAnalysis({ ...a, required_skills: ["جراحة القلب", "ترجمة", "ترجمة"], remote_possible: true }, "x").analysis;
    expect(out.required_skills).toEqual(["ترجمة"]);
    expect(sanitizeAnalysis({ ...a, required_skills: [], remote_possible: true }, "x").analysis.remote_possible).toBe(false);
  });
});
