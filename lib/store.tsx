"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Alert, AlertStatus, ClassificationResult, VolunteerProfile, YouthClub, PublishedPost, BrandedPost, Channel, Crisis, CrisisType, TreePost } from "./types";
import { WILAYAS } from "./wilayas";
import { INITIAL_ALERTS, YOUTH_CLUBS, INITIAL_TREES } from "./mock-data";
import { extractPhones } from "./ai-pipeline";
import { uid } from "./utils";

const STORAGE_KEY = "athar:alerts:v1";
const JOINED_KEY = "athar:joined:v1";
const PROFILE_KEY = "athar:profile:v1";
const CLUBS_KEY = "athar:clubs:v1";
const PUBLISHED_KEY = "athar:published:v1";
const CRISIS_KEY = "athar:crisis:v1";
const TREES_KEY = "athar:trees:v1";

interface Stats {
  totalIngested: number;
  verifiedActive: number;
  recycledFiltered: number;
  activeWilayas: number;
  volunteerHoursSaved: number;
  pending: number;
}

interface AtharContextValue {
  alerts: Alert[];
  joinedIds: string[];
  profile: VolunteerProfile | null;
  clubs: YouthClub[];
  saveProfile: (p: Omit<VolunteerProfile, "points" | "badges" | "joinedClubs" | "createdAt">) => void;
  joinClub: (id: string) => void;
  createClub: (c: Omit<YouthClub, "id" | "members" | "points" | "activitiesThisMonth">) => void;
  matchedAlerts: Alert[];
  publishedPosts: PublishedPost[];
  publishPost: (post: BrandedPost, sourceText: string, channels: Channel[]) => PublishedPost;
  crisis: Crisis | null;
  activateCrisis: (type: CrisisType, wilayaCode: number) => Crisis;
  deactivateCrisis: () => void;
  confirmAttendance: (points: number) => void;
  setSmsAlerts: (on: boolean) => void;
  trees: TreePost[];
  addTree: (t: Pick<TreePost, "wilayaCode" | "wilaya" | "place" | "species" | "note" | "photo" | "lat" | "lng">) => TreePost;
  reviewTree: (id: string, approved: boolean) => void;
  likeTree: (id: string) => void;
  stats: Stats;
  hydrated: boolean;
  setStatus: (id: string, status: AlertStatus) => void;
  volunteer: (id: string, name: string, phone: string) => void;
  addFromClassification: (text: string, result: ClassificationResult) => Alert;
  resetDemo: () => void;
}

const AtharContext = createContext<AtharContextValue | null>(null);

export function AtharProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [joinedIds, setJoinedIds] = useState<string[]>([]);
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [clubs, setClubs] = useState<YouthClub[]>(YOUTH_CLUBS);
  const [publishedPosts, setPublishedPosts] = useState<PublishedPost[]>([]);
  const [crisis, setCrisis] = useState<Crisis | null>(null);
  const [trees, setTrees] = useState<TreePost[]>(INITIAL_TREES);
  const [hydrated, setHydrated] = useState(false);

  // hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setAlerts(JSON.parse(raw));
      const j = localStorage.getItem(JOINED_KEY);
      if (j) setJoinedIds(JSON.parse(j));
      const p = localStorage.getItem(PROFILE_KEY);
      if (p) setProfile(JSON.parse(p));
      const c = localStorage.getItem(CLUBS_KEY);
      if (c) setClubs(JSON.parse(c));
      const pub = localStorage.getItem(PUBLISHED_KEY);
      if (pub) setPublishedPosts(JSON.parse(pub));
      const cr = localStorage.getItem(CRISIS_KEY);
      if (cr) setCrisis(JSON.parse(cr));
      const tr = localStorage.getItem(TREES_KEY);
      if (tr) {
        // backfill coordinates for trees saved before the map existed
        const parsed: TreePost[] = JSON.parse(tr);
        setTrees(parsed.map((t) => {
          if (typeof t.lat === "number" && typeof t.lng === "number") return t;
          const w = WILAYAS.find((x) => x.code === t.wilayaCode);
          return { ...t, lat: (w?.lat ?? 36.75) + (Math.random() - 0.5) * 0.05, lng: (w?.lng ?? 3.06) + (Math.random() - 0.5) * 0.05 };
        }));
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
      localStorage.setItem(JOINED_KEY, JSON.stringify(joinedIds));
      localStorage.setItem(CLUBS_KEY, JSON.stringify(clubs));
      localStorage.setItem(PUBLISHED_KEY, JSON.stringify(publishedPosts));
      if (crisis) localStorage.setItem(CRISIS_KEY, JSON.stringify(crisis)); else localStorage.removeItem(CRISIS_KEY);
      try { localStorage.setItem(TREES_KEY, JSON.stringify(trees)); } catch { /* photo quota */ }
      if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      else localStorage.removeItem(PROFILE_KEY);
    } catch {}
  }, [alerts, joinedIds, clubs, profile, publishedPosts, crisis, trees, hydrated]);

  const setStatus = useCallback((id: string, status: AlertStatus) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }, []);

  const volunteer = useCallback((id: string, name: string, phone: string) => {
    const target = alerts.find((a) => a.id === id);
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, volunteersJoined: Math.min(a.volunteersNeeded, a.volunteersJoined + 1) } : a
      )
    );
    const already = joinedIds.includes(id);
    setJoinedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    if (already || !target) return;
    // gamification: points + badges (auto-create a light profile if none)
    const totalJoined = joinedIds.length + 1;
    const pts = target.urgency === "critical" ? 100 : target.urgency === "medium" ? 60 : 40;
    setProfile((p) => {
      const base: VolunteerProfile = p ?? {
        name, phone, wilayaCode: target.wilayaCode, skills: [], availability: "anytime",
        points: 0, badges: [], joinedClubs: [], createdAt: new Date().toISOString(),
      };
      const badges = new Set(base.badges);
      badges.add("first_step");
      if (target.category === "blood") badges.add("blood_hero");
      if (target.category === "cleanup") badges.add("eco");
      if (target.urgency === "critical") badges.add("responder");
      if (totalJoined >= 3) badges.add("committed");
      return { ...base, points: base.points + pts, badges: [...badges] };
    });
  }, [alerts, joinedIds]);

  const saveProfile = useCallback((p: Omit<VolunteerProfile, "points" | "badges" | "joinedClubs" | "createdAt">) => {
    setProfile((prev) => ({
      ...p,
      points: prev?.points ?? 20,
      badges: prev?.badges ?? [],
      joinedClubs: prev?.joinedClubs ?? [],
      createdAt: prev?.createdAt ?? new Date().toISOString(),
    }));
  }, []);

  const joinClub = useCallback((id: string) => {
    setProfile((p) => {
      if (!p || p.joinedClubs.includes(id)) return p;
      const badges = p.badges.includes("club_member") ? p.badges : [...p.badges, "club_member"];
      return { ...p, joinedClubs: [...p.joinedClubs, id], points: p.points + 30, badges };
    });
    setClubs((prev) => prev.map((c) => (c.id === id ? { ...c, members: c.members + 1, points: c.points + 30 } : c)));
  }, []);

  const createClub = useCallback((c: Omit<YouthClub, "id" | "members" | "points" | "activitiesThisMonth">) => {
    const club: YouthClub = { ...c, id: uid("club"), members: 1, points: 50, activitiesThisMonth: 0 };
    setClubs((prev) => [club, ...prev]);
    setProfile((p) => (p ? { ...p, joinedClubs: [...p.joinedClubs, club.id], points: p.points + 50, badges: p.badges.includes("club_member") ? p.badges : [...p.badges, "club_member"] } : p));
  }, []);

  const matchedAlerts = useMemo(() => {
    if (!profile) return [];
    return alerts
      .filter((a) => a.status === "approved" && a.volunteersJoined < a.volunteersNeeded)
      .map((a) => {
        let score = 0;
        if (a.wilayaCode === profile.wilayaCode) score += 3;
        if (a.category === "blood" && profile.bloodType && a.aiTags.some((t) => t.includes(profile.bloodType!))) score += 4;
        if (a.category === "medical" && profile.skills.includes("إسعافات أولية")) score += 2;
        if (a.category === "relief" && profile.skills.some((s) => ["نقل وتوزيع", "طبخ"].includes(s))) score += 2;
        if (a.category === "education" && profile.skills.includes("تعليم ودعم مدرسي")) score += 3;
        if (a.category === "cleanup" && profile.skills.includes("تنظيم فعاليات")) score += 1;
        if (a.urgency === "critical") score += 1;
        return { a, score };
      })
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score)
      .map((x) => x.a)
      .slice(0, 6);
  }, [alerts, profile]);

  const addFromClassification = useCallback((text: string, r: ClassificationResult): Alert => {
    const phones = extractPhones(text);
    const w = r.wilaya;
    const jitter = () => (Math.random() - 0.5) * 0.08;
    const alert: Alert = {
      id: uid("alr"),
      title: r.title,
      originalText: text,
      category: r.category,
      urgency: r.urgency,
      status: r.verdict === "recycled" ? "recycled" : r.verdict === "duplicate" ? "merged" : "pending",
      wilayaCode: w?.code ?? 16,
      wilaya: w?.nameAr ?? "غير محدد",
      baladiya: r.baladiya,
      lat: (w?.lat ?? 36.75) + jitter(),
      lng: (w?.lng ?? 3.06) + jitter(),
      credibilityScore: r.credibilityScore,
      volunteersNeeded: r.verdict === "fresh" ? (r.category === "blood" ? 10 : 25) : 0,
      volunteersJoined: 0,
      contactPhone: phones[0] ?? "غير متوفر",
      contactName: "مصدر المنشور",
      source: "facebook",
      sourceUrl: "https://facebook.com/ingested/" + Date.now(),
      postedAt: new Date().toISOString(),
      firstSeenAt: r.matchedHistorical?.firstSeenAt,
      duplicateCount: r.matchedHistorical?.timesRecycled ?? 0,
      aiTags: r.extractedEntities.map((e) => e.value),
      aiSummary: r.aiSummary,
      mergedInto: r.mergedIntoAlert?.id,
    };
    setAlerts((prev) => {
      const next = [alert, ...prev];
      if (r.verdict === "duplicate" && r.mergedIntoAlert) {
        return next.map((a) =>
          a.id === r.mergedIntoAlert!.id ? { ...a, duplicateCount: a.duplicateCount + 1 } : a
        );
      }
      return next;
    });
    return alert;
  }, []);

  const publishPost = useCallback((post: BrandedPost, sourceText: string, channels: Channel[]): PublishedPost => {
    const id = uid("pub");
    const urls: Partial<Record<Channel, string>> = {};
    channels.forEach((c) => {
      urls[c] =
        c === "facebook" ? `https://facebook.com/athar.dz/posts/${Date.now().toString().slice(-8)}`
        : c === "instagram" ? `https://instagram.com/p/athar_${id.slice(-6)}`
        : c === "twitter" ? `https://x.com/athar_dz/status/${Date.now()}`
        : `https://whatsapp.com/channel/athar-dz`;
    });
    const p: PublishedPost = { ...post, id, publishedAt: new Date().toISOString(), channels: urls, sourceText, reach: 120 + Math.floor(Math.random() * 900) };
    setPublishedPosts((prev) => [p, ...prev].slice(0, 30));
    return p;
  }, []);

  const activateCrisis = useCallback((type: CrisisType, wilayaCode: number): Crisis => {
    const w = WILAYAS.find((x) => x.code === wilayaCode)!;
    const c: Crisis = { type, wilayaCode, wilaya: w.nameAr, startedAt: new Date().toISOString(), smsSent: 0, volunteersNotified: 0 };
    setCrisis(c);
    return c;
  }, []);
  const deactivateCrisis = useCallback(() => setCrisis(null), []);

  const confirmAttendance = useCallback((points: number) => {
    setProfile((p) => (p ? { ...p, confirmedPoints: (p.confirmedPoints ?? 0) + points, points: p.points + 20 } : p));
  }, []);
  const setSmsAlerts = useCallback((on: boolean) => setProfile((p) => (p ? { ...p, smsAlerts: on } : p)), []);

  const addTree = useCallback((t: Pick<TreePost, "wilayaCode" | "wilaya" | "place" | "species" | "note" | "photo" | "lat" | "lng">): TreePost => {
    const tree: TreePost = {
      ...t, id: uid("tr"), userName: profile?.name ?? "متطوع", status: "pending", createdAt: new Date().toISOString(),
      likes: 0, likedByMe: false, comments: 0, points: 0, mine: true,
      club: profile?.joinedClubs.length ? clubs.find((c) => c.id === profile.joinedClubs[0])?.name : undefined,
    };
    setTrees((prev) => [tree, ...prev]);
    return tree;
  }, [profile, clubs]);

  const reviewTree = useCallback((id: string, approved: boolean) => {
    setTrees((prev) => prev.map((t) => (t.id === id ? { ...t, status: approved ? "approved" : "rejected", reviewedAt: new Date().toISOString(), points: approved ? 50 : 0 } : t)));
    const target = trees.find((t) => t.id === id);
    if (approved && target?.mine) {
      setProfile((p) => {
        if (!p) return p;
        const mineApproved = trees.filter((t) => t.mine && t.status === "approved").length + 1;
        const badges = new Set(p.badges); badges.add("planter"); if (mineApproved >= 5) badges.add("forester");
        return { ...p, points: p.points + 50, badges: [...badges] };
      });
      if (target.club) setClubs((prev) => prev.map((c) => (c.name === target.club ? { ...c, points: c.points + 50 } : c)));
    }
  }, [trees]);

  const likeTree = useCallback((id: string) => {
    setTrees((prev) => prev.map((t) => (t.id === id ? { ...t, likes: t.likes + (t.likedByMe ? -1 : 1), likedByMe: !t.likedByMe } : t)));
  }, []);

  const resetDemo = useCallback(() => {
    setPublishedPosts([]);
    setCrisis(null);
    setTrees(INITIAL_TREES);
    setAlerts(INITIAL_ALERTS);
    setJoinedIds([]);
    setProfile(null);
    setClubs(YOUTH_CLUBS);
  }, []);

  const stats = useMemo<Stats>(() => {
    const recycled = alerts.filter((a) => a.status === "recycled" || a.status === "merged");
    const active = alerts.filter((a) => a.status === "approved");
    return {
      totalIngested: alerts.length + 1_240, // + simulated background ingestion
      verifiedActive: active.length,
      recycledFiltered: recycled.length + 318,
      activeWilayas: new Set(active.map((a) => a.wilayaCode)).size,
      volunteerHoursSaved: (recycled.length + 318) * 6,
      pending: alerts.filter((a) => a.status === "pending").length,
    };
  }, [alerts]);

  const value: AtharContextValue = {
    alerts, joinedIds, stats, hydrated, setStatus, volunteer, addFromClassification, resetDemo,
    profile, clubs, saveProfile, joinClub, createClub, matchedAlerts,
    publishedPosts, publishPost,
    crisis, activateCrisis, deactivateCrisis, confirmAttendance, setSmsAlerts,
    trees, addTree, reviewTree, likeTree,
  };
  return <AtharContext.Provider value={value}>{children}</AtharContext.Provider>;
}

export function useAthar() {
  const ctx = useContext(AtharContext);
  if (!ctx) throw new Error("useAthar must be used within AtharProvider");
  return ctx;
}
