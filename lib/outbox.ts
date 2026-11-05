"use client";
/**
 * Offline outbox for public submissions. Items stay on this device until the server accepts them.
 * A queued item is NOT a submitted alert — the UI says "pending synchronisation" until flushed.
 */
const KEY = "athar:outbox:v1";
export interface OutboxItem { id: string; body: Record<string, unknown>; createdAt: string; attempts: number }

function read(): OutboxItem[] { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } }
function write(items: OutboxItem[]) { try { localStorage.setItem(KEY, JSON.stringify(items)); window.dispatchEvent(new Event("athar:outbox")); } catch { /* storage unavailable */ } }

export const outboxCount = () => read().length;
export function enqueue(body: Record<string, unknown>) { write([...read(), { id: crypto.randomUUID(), body, createdAt: new Date().toISOString(), attempts: 0 }]); }

/** Sends queued items; keeps the ones that fail with network errors, drops ones the server rejects (4xx). */
export async function flushOutbox(): Promise<{ sent: number; rejected: number; remaining: number }> {
  const items = read();
  let sent = 0, rejected = 0;
  const keep: OutboxItem[] = [];
  for (const it of items) {
    try {
      const res = await fetch("/api/intake", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(it.body) });
      if (res.ok) sent++;
      else if (res.status >= 400 && res.status < 500 && res.status !== 429) rejected++;
      else keep.push({ ...it, attempts: it.attempts + 1 });
    } catch { keep.push({ ...it, attempts: it.attempts + 1 }); }
  }
  write(keep);
  return { sent, rejected, remaining: keep.length };
}
