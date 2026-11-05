"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Droplets, Bell, X, Wrench } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Note = { id: string; kind: string; title: string; body: string | null; link: string | null };

/**
 * Shows a toast the moment a notification row is created for the signed-in user (Realtime + RLS:
 * only the user's own rows arrive). Also broadcasts the unread delta for the navbar badge.
 */
export function LiveNotifications({ userId }: { userId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  useEffect(() => {
    const supabase = supabaseBrowser();
    let ch: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    (async () => {
      // Realtime must carry the user's JWT, otherwise RLS ("own notifications") filters every event out.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      ch = supabase.channel(`notes-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (p) => {
        const n = p.new as Note;
        setNotes((prev) => [n, ...prev].slice(0, 3));
        window.dispatchEvent(new CustomEvent("athar:unread", { detail: 1 }));
        try { navigator.vibrate?.([200, 100, 200]); } catch { /* not supported */ }
      })
      .subscribe((status) => { document.documentElement.dataset.liveNotes = status; });
    })();
    return () => { cancelled = true; if (ch) supabase.removeChannel(ch); };
  }, [userId]);

  if (!notes.length) return null;
  return (
    <div className="fixed inset-x-3 top-20 z-[1000] mx-auto flex max-w-md flex-col gap-2" aria-live="assertive">
      {notes.map((n) => {
        const blood = n.kind === "blood_request";
        const skill = n.kind === "skill_request";
        const Icon = blood ? Droplets : skill ? Wrench : Bell;
        return (
          <div key={n.id} role="alert" className={cn("animate-fade-up rounded-2xl border p-4 shadow-2xl", blood ? "border-rose-300 bg-rose-600 text-white" : skill ? "border-teal-300 bg-teal-600 text-white" : "border-slate-200 bg-white text-slate-900")}>
            <div className="flex items-start gap-3">
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", blood || skill ? "bg-white/20" : "bg-emerald-50 text-emerald-700")}><Icon className="h-5 w-5" aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <div className="font-black">{n.title}</div>
                {n.body && <p className={cn("mt-0.5 text-sm", blood || skill ? "text-white/90" : "text-slate-600")}>{n.body}</p>}
                {n.link?.startsWith("/") && <Link href={n.link} onClick={() => setNotes((p) => p.filter((x) => x.id !== n.id))} className={cn("mt-2 inline-block rounded-xl px-3 py-1.5 text-xs font-black", blood ? "bg-white text-rose-700" : skill ? "bg-white text-teal-700" : "bg-slate-900 text-white")}>فتح النداء</Link>}
              </div>
              <button onClick={() => setNotes((p) => p.filter((x) => x.id !== n.id))} aria-label="إغلاق" className="opacity-70 hover:opacity-100"><X className="h-4 w-4" /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
