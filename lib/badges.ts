/** Badges derived ONLY from confirmed actions (pure, unit-tested). */
export interface BadgeFacts {
  confirmedParticipations: { category: string; urgency: string }[];
  attendanceCount: number;
  treesApproved: number;
  clubCount: number;
}

export function earnedBadges(f: BadgeFacts): string[] {
  const out: string[] = [];
  const total = f.confirmedParticipations.length + f.attendanceCount;
  if (total >= 1) out.push("first_step");
  if (f.confirmedParticipations.some((p) => p.category === "blood")) out.push("blood_hero");
  if (f.confirmedParticipations.some((p) => p.urgency === "critical")) out.push("responder");
  if (f.confirmedParticipations.some((p) => p.category === "cleanup")) out.push("eco");
  if (total >= 3) out.push("committed");
  if (f.clubCount >= 1 && f.attendanceCount >= 1) out.push("club_member");
  if (f.treesApproved >= 1) out.push("planter");
  if (f.treesApproved >= 5) out.push("forester");
  return out;
}

export const LEVELS = [
  { min: 0, name: "متطوع مبتدئ", color: "text-slate-600" },
  { min: 100, name: "متطوع نشط", color: "text-emerald-700" },
  { min: 300, name: "متطوع متميز", color: "text-indigo-700" },
  { min: 700, name: "سفير إيثار", color: "text-amber-600" },
];
export const levelOf = (p: number) => [...LEVELS].reverse().find((l) => p >= l.min)!;
export const nextLevel = (p: number) => LEVELS.find((l) => l.min > p);
