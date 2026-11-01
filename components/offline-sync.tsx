"use client";

import { useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { flushOutbox, outboxCount } from "@/lib/outbox";
import { useT } from "@/lib/i18n/client";

/** Registers the service worker and syncs the offline outbox when the connection returns. */
export function OfflineSync() {
  const t = useT();
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const refresh = () => setPending(outboxCount());
    const sync = async () => {
      if (!navigator.onLine || outboxCount() === 0) return;
      const r = await flushOutbox();
      refresh();
      if (r.sent || r.rejected) setNote(t.offline.sent(r.sent, r.rejected));
    };
    const on = () => { setOnline(true); sync(); };
    const off = () => setOnline(false);
    setOnline(navigator.onLine); refresh(); sync();
    window.addEventListener("online", on); window.addEventListener("offline", off); window.addEventListener("athar:outbox", refresh);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); window.removeEventListener("athar:outbox", refresh); };
  }, [t]);
  if (online && pending === 0 && !note) return null;
  return (
    <div role="status" className="bg-amber-100 text-amber-900">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-1.5 text-xs font-semibold">
        {!online && <><CloudOff className="h-4 w-4" aria-hidden /> {t.offline.banner}</>}
        {pending > 0 && <><RefreshCw className="h-3.5 w-3.5" aria-hidden /> {t.offline.pending(pending)}</>}
        {note && <span>{note}</span>}
      </div>
    </div>
  );
}
