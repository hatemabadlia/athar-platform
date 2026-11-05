"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * Re-renders the current server page when rows change in the given tables.
 * Realtime respects RLS, so each viewer only receives events for rows they can read.
 */
export function RealtimeRefresh({ tables, channel }: { tables: string[]; channel: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = tables.join(",");
  useEffect(() => {
    const supabase = supabaseBrowser();
    const ch = supabase.channel(channel);
    for (const table of key.split(",")) {
      ch.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => router.refresh(), 600);
      });
    }
    ch.subscribe();
    return () => { if (timer.current) clearTimeout(timer.current); supabase.removeChannel(ch); };
  }, [key, channel, router]);
  return null;
}
