"use client";

import { useState } from "react";
import { Siren, Smartphone, Building2, Send, CheckCircle2, XCircle, Radio } from "lucide-react";
import { useAthar } from "@/lib/store";
import { CRISIS_META, SHELTERS } from "@/lib/mock-data";
import { WILAYAS } from "@/lib/wilayas";
import type { CrisisType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn, sleep } from "@/lib/utils";

type Sms = { to: string; text: string; status: "sending" | "sent" | "confirmed" };

export function CrisisPanel() {
  const { crisis, activateCrisis, deactivateCrisis, clubs } = useAthar();
  const [type, setType] = useState<CrisisType>("flood");
  const [wilayaCode, setWilayaCode] = useState(35);
  const [sms, setSms] = useState<Sms[]>([]);
  const [stage, setStage] = useState<"idle" | "activating" | "broadcasting" | "done">("idle");
  const [stats, setStats] = useState({ shelters: 0, volunteers: 0, confirmed: 0 });

  const activate = async () => {
    setStage("activating");
    const c = activateCrisis(type, wilayaCode);
    const shelters = SHELTERS.filter((s) => s.wilayaCode === wilayaCode);
    const hub = shelters[0]?.name ?? "دار الشباب المركزية";
    const members = clubs.filter((x) => x.wilayaCode === wilayaCode).reduce((s, x) => s + x.members, 0) || 120;
    setStats({ shelters: shelters.length, volunteers: members, confirmed: 0 });
    await sleep(900);
    setStage("broadcasting");
    const text = CRISIS_META[type].sms.replace("{w}", c.wilaya).replace("{hub}", hub);
    const numbers = ["0551 22 33 44", "0661 55 66 77", "0770 88 99 00", "0555 12 98 76", "0698 44 21 07", "0779 63 18 52"];
    for (const n of numbers) {
      setSms((l) => [{ to: n, text, status: "sending" as const }, ...l].slice(0, 6));
      await sleep(420);
      setSms((l) => l.map((m) => (m.to === n ? { ...m, status: "sent" as const } : m)));
      setStats((s) => ({ ...s, volunteers: s.volunteers }));
    }
    await sleep(600);
    // confirmations trickle in
    for (let i = 0; i < 4; i++) {
      await sleep(500);
      setSms((l) => l.map((m, idx) => (idx === l.length - 1 - i ? { ...m, status: "confirmed" as const } : m)));
      setStats((s) => ({ ...s, confirmed: Math.round(members * (0.12 + i * 0.09)) }));
    }
    setStage("done");
  };

  const stop = () => { deactivateCrisis(); setSms([]); setStage("idle"); };
  const meta = CRISIS_META[type];

  return (
    <div className={cn("rounded-3xl border-2 p-5 shadow-sm transition-colors", crisis ? "border-red-500 bg-red-50" : "border-slate-200 bg-white")}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", crisis ? "bg-red-600 text-white animate-pulse" : "bg-slate-100 text-slate-600")}><Siren className="h-5 w-5" /></div>
          <div>
            <h3 className="font-black text-slate-900">وضع الطوارئ — تفعيل شبكة دور الشباب</h3>
            <p className="text-xs text-slate-500">عند كارثة، المديرية تحوّل دور الشباب إلى مراكز إيواء وتجمع، وتُبلّغ المتطوعين عبر SMS حتى بدون إنترنت.</p>
          </div>
        </div>
        {crisis && <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white"><Radio className="h-3.5 w-3.5 animate-pulse" /> مفعّل: {CRISIS_META[crisis.type].emoji} {CRISIS_META[crisis.type].label} — {crisis.wilaya}</span>}
      </div>

      <div className="grid lg:grid-cols-[1fr_260px] gap-5">
        <div className="space-y-3">
          {!crisis ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(CRISIS_META) as CrisisType[]).map((k) => (
                  <button key={k} onClick={() => setType(k)} className={cn("rounded-2xl border p-3 text-center text-sm font-bold transition-all", type === k ? "border-red-500 bg-red-50 text-red-800" : "border-slate-200 text-slate-700 hover:border-slate-400")}>
                    <div className="text-2xl">{CRISIS_META[k].emoji}</div>{CRISIS_META[k].label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select value={wilayaCode} onChange={(e) => setWilayaCode(+e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold">
                  {WILAYAS.map((w) => <option key={w.code} value={w.code}>{w.code} - {w.nameAr}</option>)}
                </select>
                <span className="text-xs text-slate-500 flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {SHELTERS.filter((s) => s.wilayaCode === wilayaCode).length || "—"} مؤسسة شباب جاهزة · احتياجات: {meta.needs.join("، ")}</span>
                <Button variant="danger" onClick={activate} disabled={stage !== "idle"} className="mr-auto"><Siren className="h-4 w-4" /> تفعيل وضع الطوارئ</Button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Kpi v={stats.shelters} l="مركز إيواء مفعّل" c="text-red-700" />
                <Kpi v={stats.volunteers} l="متطوع أُبلغ عبر SMS" c="text-slate-900" />
                <Kpi v={stats.confirmed} l="أكّدوا الحضور (رد 1)" c="text-emerald-700" />
              </div>
              <div className="rounded-2xl bg-white border border-red-200 p-3 text-xs text-slate-700 space-y-1">
                {SHELTERS.filter((s) => s.wilayaCode === crisis.wilayaCode).map((s) => (
                  <div key={s.id} className="flex items-center justify-between"><span className="font-bold flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-red-600" /> {s.name}</span><span className="text-slate-500">{s.occupied}/{s.capacity} · {s.needs.join("، ") || "لا احتياجات"}</span></div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={stop}><XCircle className="h-4 w-4" /> إنهاء حالة الطوارئ</Button>
                <span className="text-[11px] text-slate-500 self-center">الخريطة العامة تعرض الآن مراكز الإيواء والبانر الأحمر على كل الصفحات.</span>
              </div>
            </>
          )}
        </div>

        {/* phone mockup */}
        <div className="mx-auto w-[240px] rounded-[2rem] border-[6px] border-slate-900 bg-slate-900 p-1 shadow-2xl">
          <div className="rounded-[1.5rem] bg-slate-100 h-[330px] overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white text-[10px] flex items-center justify-between px-4 py-1"><span>Mobilis</span><span>📶 SMS · بدون إنترنت</span></div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 border-b border-slate-200"><Smartphone className="h-4 w-4 text-slate-500" /><span className="text-xs font-bold">إيثار (رسائل قصيرة)</span></div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2" dir="rtl">
              {sms.length === 0 && <div className="text-center text-[11px] text-slate-400 pt-16">{stage === "activating" ? "⏳ تفعيل الشبكة…" : "لا رسائل بعد — فعّل وضع الطوارئ"}</div>}
              {[...sms].reverse().map((m, i) => (
                <div key={i} className="animate-slide-in">
                  <div className="text-[9px] text-slate-400 mb-0.5" dir="ltr">→ {m.to}</div>
                  <div className={cn("rounded-2xl rounded-tr-sm px-2.5 py-1.5 text-[10.5px] leading-snug shadow-sm", m.status === "sending" ? "bg-slate-200 text-slate-500" : "bg-emerald-600 text-white")}>{m.text}</div>
                  <div className="text-[9px] mt-0.5 flex items-center gap-1 text-slate-500">
                    {m.status === "sending" && <><Send className="h-2.5 w-2.5 animate-pulse" /> إرسال…</>}
                    {m.status === "sent" && <><CheckCircle2 className="h-2.5 w-2.5" /> تم التسليم</>}
                    {m.status === "confirmed" && <span className="text-emerald-700 font-bold">✓✓ رد المتطوع: 1 (مؤكد)</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ v, l, c }: { v: number; l: string; c: string }) {
  return <div className="rounded-2xl bg-white border border-red-100 p-3 text-center"><div className={cn("text-2xl font-black tabular-nums", c)}>{v}</div><div className="text-[10px] text-slate-500">{l}</div></div>;
}
