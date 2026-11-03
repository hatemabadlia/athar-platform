"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageSquareHeart, X, Send } from "lucide-react";
import { CATEGORY_META, URGENCY_META } from "@/lib/reference/meta";
import type { PublicAlert } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { timeAgoIn } from "@/lib/i18n/dict";

type Msg = { role: "bot" | "user"; text: string; alerts?: PublicAlert[]; links?: { href: string; label: string }[]; mode?: "claude" | "rules" };


export function Chatbot({ signedIn }: { signedIn: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "bot", text: t.chat.hello }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" }); }, [msgs, typing, open]);

  const send = async (q: string) => {
    if (!q.trim() || typing) return;
    const next = [...msgs, { role: "user" as const, text: q.trim() }];
    setMsgs(next);
    setInput("");
    setTyping(true);
    try {
      const history = next.slice(1).slice(-10).map((m) => ({ role: m.role === "bot" ? "assistant" : "user", content: m.text }));
      const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: history }) });
      if (res.status === 429) throw new Error("rate");
      if (!res.ok) throw new Error("fail");
      const r = (await res.json()) as { text: string; alerts: PublicAlert[]; links: Msg["links"]; mode: Msg["mode"] };
      setMsgs((m) => [...m, { role: "bot", text: r.text, alerts: r.alerts, links: r.links, mode: r.mode }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "bot", text: e instanceof Error && e.message === "rate" ? t.chat.rate : t.chat.error }]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? t.chat.close : t.chat.open}
        className="fixed bottom-20 md:bottom-5 end-5 z-[950] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-emerald-700 text-white shadow-2xl shadow-brand-600/40 hover:scale-105 transition-transform">
        {open ? <X className="h-6 w-6" /> : <MessageSquareHeart className="h-6 w-6" />}
      </button>
      {open && (
        <div role="dialog" aria-label={t.chat.title} className="fixed bottom-36 md:bottom-24 end-5 z-[950] w-[92vw] max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl animate-fade-up">
          <div className="flex items-center gap-3 bg-gradient-to-l from-brand-600 to-emerald-800 p-4 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-xl font-black" aria-hidden>إ</div>
            <div className="flex-1">
              <div className="font-black">{t.chat.title}</div>
              <div className="text-[11px] text-white/80">{t.chat.subtitle}{signedIn ? "" : t.chat.loginHint}</div>
            </div>
          </div>
          <div ref={ref} className="h-80 overflow-y-auto bg-slate-50 p-3 space-y-3" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-start" : "justify-end")}>
                <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-line", m.role === "user" ? "bg-slate-900 text-white rounded-tl-sm" : "bg-white border border-slate-200 text-slate-800 rounded-tr-sm")}>
                  {m.text}
                  {m.alerts?.map((a) => {
                    const cat = CATEGORY_META[a.category]; const urg = URGENCY_META[a.urgency];
                    return (
                      <Link key={a.id} href="/" className="mt-2 block rounded-xl border border-slate-200 bg-slate-50 p-2 hover:bg-slate-100">
                        <div className="flex gap-1 mb-0.5"><span className={`rounded-full px-1.5 text-[10px] font-bold ${cat.bg} ${cat.color}`}>{cat.emoji} {t.category[a.category]}</span><span className={`rounded-full px-1.5 text-[10px] font-bold ${urg.bg} ${urg.color}`}>{t.urgency[a.urgency]}</span></div>
                        <div className="text-xs font-bold">{a.title}</div>
                        <div className="text-[10px] text-slate-500">{a.wilaya}{a.bloodType ? ` · ${a.bloodType}` : ""} · {timeAgoIn(t.time, a.createdAt)}</div>
                      </Link>
                    );
                  })}
                  {m.links && m.links.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{m.links.map((l) => <Link key={l.href} href={l.href} className="rounded-lg bg-brand-600 px-2 py-1 text-[11px] font-bold text-white">{l.label} ←</Link>)}</div>}
                  {m.mode === "rules" && <div className="mt-1 text-[9px] text-slate-400">{t.chat.rules}</div>}
                </div>
              </div>
            ))}
            {typing && <div className="flex justify-end"><div className="rounded-2xl bg-white border border-slate-200 px-3 py-2 text-slate-400 text-xs">{t.chat.typing}<span className="animate-blink">…</span></div></div>}
          </div>
          <div className="flex gap-1.5 overflow-x-auto border-t border-slate-100 bg-white px-3 py-2">
            {t.chat.quick.map((q) => <button key={q} onClick={() => send(q)} className="shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-brand-500 hover:text-brand-700">{q}</button>)}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 border-t border-slate-100 p-2">
            <label htmlFor="chat-input" className="sr-only">{t.chat.inputLabel}</label>
            <input id="chat-input" value={input} maxLength={2000} onChange={(e) => setInput(e.target.value)} placeholder={t.chat.input} className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            <button className="rounded-xl bg-brand-600 px-3 text-white" aria-label={t.chat.send} disabled={typing}><Send className="h-4 w-4" /></button>
          </form>
        </div>
      )}
    </>
  );
}
