"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageSquareHeart, X, Send, Sparkles } from "lucide-react";
import { useAthar } from "@/lib/store";
import { detectWilaya } from "@/lib/wilayas";
import { extractBloodType, normalizeDarija } from "@/lib/ai-pipeline";
import { CATEGORY_META, URGENCY_META } from "@/lib/mock-data";
import type { Alert } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

type Msg = { role: "bot" | "user"; text: string; alerts?: Alert[]; links?: { href: string; label: string }[] };

const QUICK = ["وين نقدر نتبرع بالدم اليوم؟", "كيفاش نزيد شجرة؟", "كيفاش ننضم لنادي دار الشباب؟", "شحال عندي نقاط؟"];

export function Chatbot() {
  const { alerts, profile, clubs, crisis } = useAthar();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "bot", text: "سلام! أنا إيثار بوت 🤖 نجاوبك بالدارجة أو بالعربية: وين تتبرع بالدم، كيفاش تنضم لنادي، أو واش كاين نداءات قريبة منك." }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" }); }, [msgs, typing, open]);

  const answer = (q: string): Msg => {
    const n = normalizeDarija(q).text;
    const w = detectWilaya(n) ?? (profile ? { code: profile.wilayaCode } : null);
    const blood = extractBloodType(n);
    const active = alerts.filter((a) => a.status === "approved");
    const inW = (list: Alert[]) => (w ? list.filter((a) => a.wilayaCode === w.code) : list);

    if (/طوارئ|كارثة|فيضان|زلزال|حريق/.test(n)) {
      if (crisis) return { role: "bot", text: `⚠️ نعم — وضع الطوارئ مفعّل في ${crisis.wilaya}. دور الشباب مفتوحة كمراكز إيواء وتجمع. شوف الخريطة باش تعرف أقرب مركز.`, links: [{ href: "/", label: "الخريطة والمراكز" }] };
      return { role: "bot", text: "الحمد لله، ما كاين حتى طوارئ مفعّلة دروك. إذا صار شيء، مديرية الشباب تفعّل وضع الطوارئ وتوصلك رسالة SMS حتى بلا إنترنت." };
    }
    if (/شجر|تشجير|غابة|غرس/.test(n)) {
      return { role: "bot", text: "🌳 غابة إيثار: اغرس شجرة، صوّرها وأرسلها — يتحقق المشرف ثم تربح 50 نقطة وشارة «غارس». الولاية الأكثر تشجيراً تُكرَّم في 25 أكتوبر.", links: [{ href: "/trees", label: "أضف شجرتي" }] };
    }
    if (/دم|فصيل|تبرع/.test(n)) {
      let list = inW(active.filter((a) => a.category === "blood"));
      if (blood) list = list.filter((a) => a.aiTags.some((t) => t.includes(blood))).concat(list.filter((a) => !a.aiTags.some((t) => t.includes(blood))));
      if (!list.length) return { role: "bot", text: "ما كاين حتى نداء دم موثّق في هذي الولاية دروك 🙏 نخبرك أول ما يطلع واحد.", links: [{ href: "/", label: "شوف الخريطة" }] };
      return { role: "bot", text: `لقيت ${list.length} نداء${list.length > 1 ? "ات" : ""} تبرع بالدم موثّق${w ? " في ولايتك" : ""}${blood ? ` (فصيلة ${blood} بالأولوية)` : ""}:`, alerts: list.slice(0, 3) };
    }
    if (/نادي|دار الشباب|ننضم|نوادي/.test(n)) {
      const list = w ? clubs.filter((c) => c.wilayaCode === w.code) : clubs.slice(0, 2);
      return { role: "bot", text: list.length ? `كاين ${list.length} نادي في دار الشباب قريب منك: ${list.map((c) => `«${c.name}» (${c.institution}، ${c.members} عضو)`).join("، ")}. تقدر تنضم بنقرة وتربح 30 نقطة.` : "ما لقيتش نادي في ولايتك — تقدر تنشئ واحد في دار شبابك وتولي أنت المسؤول 💪", links: [{ href: "/clubs", label: "نوادي التطوع" }] };
    }
    if (/نقاط|نقطة|شارة|مستوى|شهادة/.test(n)) {
      if (!profile) return { role: "bot", text: "ما عندكش ملف بعد. دير ملفك في دقيقة وتبدا تجمع النقاط والشارات وشهادة التطوع 📜", links: [{ href: "/profile", label: "إنشاء ملف" }] };
      return { role: "bot", text: `عندك ${profile.points} نقطة ⭐ (منها ${profile.confirmedPoints ?? 0} مؤكدة بالحضور) و${profile.badges.length} شارات. كل نداء حرج = 100 نقطة، والانضمام لنادي = 30.`, links: [{ href: "/profile", label: "ملفي" }] };
    }
    if (/كيفاش نعاون|نساعد|نتطوع|واش ندير/.test(n) || /عاجل|حرج/.test(n)) {
      const list = inW(active).sort((a, b) => (a.urgency === "critical" ? -1 : 1) - (b.urgency === "critical" ? -1 : 1)).slice(0, 3);
      return { role: "bot", text: list.length ? `هذي أهم النداءات الموثّقة${w ? " في ولايتك" : ""} دروك — اضغط «أستطيع المساعدة» على اللي يناسبك:` : "ما كاين نداءات نشطة في ولايتك، لكن تقدر تشوف الخريطة الوطنية.", alerts: list };
    }
    if (/كاين|نداء|قريب|ولاية|في /.test(n) && w) {
      const list = inW(active).slice(0, 3);
      return { role: "bot", text: list.length ? `في هذي الولاية كاين ${inW(active).length} نداء موثّق:` : "ما كاين حتى نداء موثّق في هذي الولاية دروك.", alerts: list };
    }
    return { role: "bot", text: "فهمتك تقريباً 😅 جرّب تسقسيني: «وين نتبرع بالدم في وهران؟»، «كيفاش ننضم لنادي؟»، «واش كاين نداءات في البليدة؟» أو «شحال عندي نقاط؟».", links: [{ href: "/", label: "الخريطة" }, { href: "/clubs", label: "النوادي" }] };
  };

  const send = (q: string) => {
    if (!q.trim()) return;
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setTyping(true);
    setTimeout(() => { setMsgs((m) => [...m, answer(q)]); setTyping(false); }, 700 + Math.random() * 500);
  };

  return (
    <>
      <button onClick={() => setOpen((o) => !o)} className="fixed bottom-5 left-5 z-[950] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-emerald-700 text-white shadow-2xl shadow-brand-600/40 hover:scale-105 transition-transform">
        {open ? <X className="h-6 w-6" /> : <MessageSquareHeart className="h-6 w-6" />}
        {!open && <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />}
      </button>
      {open && (
        <div className="fixed bottom-24 left-5 z-[950] w-[92vw] max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl animate-fade-up">
          <div className="flex items-center gap-3 bg-gradient-to-l from-brand-600 to-emerald-800 p-4 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-xl font-black">إ</div>
            <div className="flex-1">
              <div className="font-black">إيثار بوت</div>
              <div className="text-[11px] text-white/80 flex items-center gap-1"><Sparkles className="h-3 w-3" /> مساعد ذكي · يفهم الدارجة · متصل بالبيانات الحيّة</div>
            </div>
          </div>
          <div ref={ref} className="h-80 overflow-y-auto bg-slate-50 p-3 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-start" : "justify-end")} dir="rtl">
                <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed", m.role === "user" ? "bg-slate-900 text-white rounded-tl-sm" : "bg-white border border-slate-200 text-slate-800 rounded-tr-sm")}>
                  {m.text}
                  {m.alerts?.map((a) => {
                    const cat = CATEGORY_META[a.category]; const urg = URGENCY_META[a.urgency];
                    return (
                      <Link key={a.id} href="/" className="mt-2 block rounded-xl border border-slate-200 bg-slate-50 p-2 hover:bg-slate-100">
                        <div className="flex gap-1 mb-0.5"><span className={`rounded-full px-1.5 text-[10px] font-bold ${cat.bg} ${cat.color}`}>{cat.emoji} {cat.labelAr}</span><span className={`rounded-full px-1.5 text-[10px] font-bold ${urg.bg} ${urg.color}`}>{urg.labelAr}</span></div>
                        <div className="text-xs font-bold">{a.title}</div>
                        <div className="text-[10px] text-slate-500">{a.wilaya} · {a.contactPhone} · {timeAgo(a.postedAt)}{a.hub ? ` · 🏛️ ${a.hub}` : ""}</div>
                      </Link>
                    );
                  })}
                  {m.links && <div className="mt-2 flex flex-wrap gap-1">{m.links.map((l) => <Link key={l.href} href={l.href} className="rounded-lg bg-brand-600 px-2 py-1 text-[11px] font-bold text-white">{l.label} ←</Link>)}</div>}
                </div>
              </div>
            ))}
            {typing && <div className="flex justify-end"><div className="rounded-2xl bg-white border border-slate-200 px-3 py-2 text-slate-400 text-xs">يكتب<span className="animate-blink">…</span></div></div>}
          </div>
          <div className="flex gap-1.5 overflow-x-auto border-t border-slate-100 bg-white px-3 py-2">
            {QUICK.map((q) => <button key={q} onClick={() => send(q)} className="shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-brand-500 hover:text-brand-700">{q}</button>)}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 border-t border-slate-100 p-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="اكتب بالدارجة أو بالعربية…" className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            <button className="rounded-xl bg-brand-600 px-3 text-white"><Send className="h-4 w-4" /></button>
          </form>
        </div>
      )}
    </>
  );
}
