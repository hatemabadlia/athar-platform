/**
 * Volunteer ⇄ alert matching (pure, unit-tested). Every match carries human-readable reasons.
 * Blood compatibility mirrors the `blood_compatibility` reference table (red-cell ABO/RhD).
 * It is a matching aid; transfusion decisions belong to medical staff.
 */
import type { Availability, BloodType, Category, PublicAlert } from "@/lib/types";

export const RED_CELL_COMPATIBILITY: Record<BloodType, BloodType[]> = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"],
};

export function canDonateTo(donor: BloodType, recipient: BloodType): boolean {
  return RED_CELL_COMPATIBILITY[donor]?.includes(recipient) ?? false;
}

/** Donor groups that can give to a recipient group. */
export function compatibleDonors(recipient: BloodType): BloodType[] {
  return (Object.keys(RED_CELL_COMPATIBILITY) as BloodType[]).filter((d) => canDonateTo(d, recipient));
}

const SKILL_FOR_CATEGORY: Record<Category, string[]> = {
  medical: ["إسعافات أولية"],
  relief: ["نقل وتوزيع", "طبخ", "صيانة وبناء"],
  education: ["تعليم ودعم مدرسي", "ترجمة"],
  cleanup: ["تنظيم فعاليات"],
  orphans: ["دعم نفسي", "تعليم ودعم مدرسي"],
  blood: [],
};

export interface VolunteerForMatching {
  wilayaCode: number | null;
  bloodType: BloodType | null;
  skills: string[];
  availability: Availability;
}

export interface Match { alert: PublicAlert; score: number; reasons: string[] }

export function matchAlerts(v: VolunteerForMatching, alerts: PublicAlert[], limit = 6, now = new Date()): Match[] {
  const out: Match[] = [];
  for (const a of alerts) {
    if (a.status !== "approved" || a.joinedByMe) continue;
    if (a.volunteersNeeded > 0 && a.volunteersJoined >= a.volunteersNeeded) continue;
    if (a.deadline && new Date(a.deadline) < now) continue;
    let score = 0;
    const reasons: string[] = [];
    if (v.wilayaCode && a.wilayaCode === v.wilayaCode) { score += 3; reasons.push("في ولايتك"); }
    if (a.category === "blood") {
      if (v.bloodType && a.bloodType) {
        if (canDonateTo(v.bloodType, a.bloodType)) {
          score += v.bloodType === a.bloodType ? 5 : 4;
          reasons.push(v.bloodType === a.bloodType ? `نفس فصيلتك (${a.bloodType})` : `فصيلتك ${v.bloodType} متوافقة مع ${a.bloodType}`);
        } else {
          continue; // incompatible blood request — do not suggest
        }
      } else if (v.bloodType) { score += 1; reasons.push("نداء دم بدون فصيلة محددة"); }
    }
    const skills = SKILL_FOR_CATEGORY[a.category].filter((s) => v.skills.includes(s));
    if (skills.length) { score += 2; reasons.push(`مهارة مطلوبة: ${skills.join("، ")}`); }
    if (a.urgency === "critical") { score += 1; reasons.push("حالة حرجة"); }
    if (v.availability === "anytime" && a.urgency === "critical") score += 1;
    if (score >= 3) out.push({ alert: a, score, reasons });
  }
  return out.sort((x, y) => y.score - x.score).slice(0, limit);
}
