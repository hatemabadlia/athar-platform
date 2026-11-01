export type Category =
  | "blood"
  | "relief"
  | "cleanup"
  | "orphans"
  | "medical"
  | "education";

export type Urgency = "critical" | "medium" | "normal";

export type AlertStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "resolved"
  | "recycled"
  | "merged";

export type Platform = "facebook" | "twitter" | "instagram" | "tiktok" | "whatsapp";

export interface Wilaya {
  code: number;
  name: string;
  nameAr: string;
  lat: number;
  lng: number;
}

export interface Alert {
  id: string;
  title: string;
  originalText: string;
  category: Category;
  urgency: Urgency;
  status: AlertStatus;
  wilayaCode: number;
  wilaya: string;
  baladiya: string;
  lat: number;
  lng: number;
  credibilityScore: number; // 0-100
  volunteersNeeded: number;
  volunteersJoined: number;
  contactPhone: string;
  contactName: string;
  source: Platform;
  sourceUrl: string;
  postedAt: string; // ISO
  firstSeenAt?: string; // ISO — for recycled posts
  duplicateCount: number;
  aiTags: string[];
  aiSummary: string;
  mergedInto?: string;
  hub?: string; // مؤسسة الشباب: نقطة التجمع
  report?: AfterActionReport; // إغلاق الحلقة بعد الحل
}

export interface HistoricalRecord {
  id: string;
  text: string;
  firstSeenAt: string;
  resolvedAt?: string;
  wilaya: string;
  category: Category;
  timesRecycled: number;
  fingerprint: string[]; // key phrases used for similarity
}

export interface Volunteer {
  id: string;
  name: string;
  phone: string;
  wilaya: string;
  skills: string[];
  bloodType?: string;
}

export interface PipelineStep {
  id: string;
  label: string;
  labelAr: string;
  status: "idle" | "running" | "done" | "warning" | "error";
  detail?: string;
  durationMs: number;
}

export type Verdict = "fresh" | "recycled" | "duplicate" | "low-confidence";

export interface ClassificationResult {
  verdict: Verdict;
  category: Category;
  urgency: Urgency;
  wilaya: Wilaya | null;
  baladiya: string;
  credibilityScore: number;
  confidence: number;
  extractedEntities: { label: string; value: string }[];
  matchedHistorical?: HistoricalRecord;
  similarity?: number;
  mergedIntoAlert?: Alert;
  reasoning: string[];
  aiSummary: string;
  title: string;
  darijaTerms: { from: string; to: string }[];
}

export interface VolunteerProfile {
  name: string;
  phone: string;
  wilayaCode: number;
  bloodType?: string;
  skills: string[];
  availability: "weekends" | "evenings" | "anytime";
  points: number;
  badges: string[];
  joinedClubs: string[];
  createdAt: string;
  confirmedPoints?: number;
  smsAlerts?: boolean;
}

export interface YouthClub {
  id: string;
  name: string;
  institution: string; // دار الشباب / مركز الشباب
  wilayaCode: number;
  wilaya: string;
  baladiya: string;
  members: number;
  points: number;
  activitiesThisMonth: number;
  focus: Category[];
  lead: string;
  nextActivity: { title: string; date: string };
}

export type Channel = "facebook" | "instagram" | "twitter" | "whatsapp";

export interface BrandedPost {
  headline: string;
  caption: string;
  hashtags: string[];
  cta: string;
  shortLink: string;
  category: Category;
  urgency: Urgency;
  wilaya: string;
  score: number;
  details: { icon: string; text: string }[];
}

export interface PublishedPost extends BrandedPost {
  id: string;
  publishedAt: string;
  channels: Partial<Record<Channel, string>>; // channel → post URL
  sourceText: string;
  reach: number;
}

export type CrisisType = "flood" | "earthquake" | "fire" | "cold";

export interface Crisis {
  type: CrisisType;
  wilayaCode: number;
  wilaya: string;
  startedAt: string;
  smsSent: number;
  volunteersNotified: number;
}

export interface Shelter {
  id: string;
  name: string;
  wilayaCode: number;
  lat: number;
  lng: number;
  capacity: number;
  occupied: number;
  needs: string[];
  phone: string;
}

export interface AfterActionReport {
  attended: number;
  outcome: string;
  hours: number;
  club?: string;
}

export interface TreePost {
  id: string;
  userName: string;
  wilayaCode: number;
  wilaya: string;
  place: string; // دار الشباب / مدرسة / حي…
  species: string;
  note: string;
  lat: number;
  lng: number;
  photo: string | null; // data URL (user upload) or null → placeholder
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt?: string;
  likes: number;
  likedByMe: boolean;
  comments: number;
  points: number;
  club?: string;
  mine?: boolean;
}
