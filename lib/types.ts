/**
 * UI-facing domain types. Database row types are generated in lib/supabase/database.types.ts;
 * these are the shapes server code maps rows into before handing them to components.
 */
import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];
export type Category = Enums["alert_category"];
export type Urgency = Enums["urgency"];
export type AlertStatus = Enums["alert_status"];
export type CrisisType = Enums["crisis_type"];
export type BloodType = Enums["blood_type"];
export type AppRole = Enums["app_role"];
export type Availability = Enums["availability"];

export interface Wilaya {
  code: number;
  name: string;
  nameAr: string;
  lat: number;
  lng: number;
}

export interface CredibilityReason { label: string; delta: number }

/** An alert as shown publicly (no phone number, no owner). */
export interface PublicAlert {
  id: string;
  title: string;
  summary: string;
  category: Category;
  urgency: Urgency;
  status: AlertStatus;
  wilayaCode: number | null;
  wilaya: string;
  baladiya: string | null;
  institution: string | null;
  lat: number | null;
  lng: number | null;
  locationPrecision: "wilaya" | "baladiya" | "institution";
  credibilityScore: number | null;
  credibilityReasons: CredibilityReason[];
  aiMode: "claude" | "gemini" | "heuristic" | "manual";
  volunteersNeeded: number;
  volunteersJoined: number;
  bloodType: BloodType | null;
  /** Volunteer skills the request needs (skills-based help, not only money or goods). */
  requiredSkills: string[];
  /** The needed help can be given remotely. */
  remoteOk: boolean;
  deadline: string | null;
  createdAt: string;
  sourceCount: number;
  joinedByMe?: boolean;
}

/** Moderator view: adds review fields. */
export interface ModerationAlert extends PublicAlert {
  originalText: string;
  normalizedText: string | null;
  verdict: "fresh" | "recycled" | "duplicate" | "low-confidence" | null;
  needsReview: string[];
  firstSeenAt: string | null;
  contactName: string | null;
  darijaTerms: { from: string; to: string }[];
  aiConfidence: number | null;
  reviewedAt: string | null;
  mergedInto: string | null;
}

export interface ShelterView {
  id: string;
  name: string;
  wilayaCode: number;
  lat: number | null;
  lng: number | null;
  capacity: number;
  occupied: number;
  needs: string[];
  phone: string | null;
  isOpen: boolean;
  updatedAt: string;
}

export interface CrisisView {
  id: string;
  type: CrisisType;
  wilayaCode: number;
  wilaya: string;
  title: string;
  startedAt: string;
}

export interface ProfileView {
  id: string;
  displayName: string;
  wilayaCode: number | null;
  skills: string[];
  availability: Availability;
  /** Accepts to help remotely (design, translation, consultation…). */
  remoteOk: boolean;
  /** Regulated professional skills verified by a moderator. */
  verifiedSkills: string[];
  phone: string | null;
  bloodType: BloodType | null;
  smsOptIn: boolean;
  points: number;
  hours: number;
  events: number;
  byKind: Record<string, number>;
  roles: AppRole[];
}

export interface ClubView {
  id: string;
  name: string;
  description: string;
  institutionName: string | null;
  wilayaCode: number;
  wilaya: string;
  focus: Category[];
  members: number;
  points: number;
  activities30d: number;
  myRole: "member" | "lead" | null;
}

export interface ActivityView {
  id: string;
  clubId: string | null;
  alertId: string | null;
  title: string;
  location: string | null;
  wilayaCode: number;
  startsAt: string;
  endsAt: string | null;
  status: string;
}

export interface TreeView {
  id: string;
  userName: string;
  wilayaCode: number;
  wilaya: string;
  place: string;
  species: string;
  note: string;
  lat: number | null;
  lng: number | null;
  photoUrl: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  likes: number;
  likedByMe: boolean;
  mine: boolean;
  locationCheck: Record<string, unknown>;
}
