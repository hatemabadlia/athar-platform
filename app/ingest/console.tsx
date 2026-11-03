"use client";

import { useEffect, useState, useTransition } from "react";
import { Sparkles, Play, Trash2, Radar, Database, Link2, RotateCcw, FlaskConical } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { PipelineOutcome } from "@/lib/pipeline/run";
import { PipelineSteps, idleSteps, type StepView } from "@/components/ingest/pipeline-steps";
import { ResultCard } from "@/components/ingest/result-card";
import { Button } from "@/components/ui/button";
import { retryIntake } from "@/app/actions/alerts";
import { cn, timeAgo } from "@/lib/utils";
import { VoiceInput } from "@/components/voice-input";
import { modeLabel } from "@/lib/pipeline/types";

export interface IntakeRow {
  id: string; channel: string; sourceLabel: string | null; preview: string; status: string; error: string | null;
  receivedAt: string; alertId: string | null; verdict: string | null; score: number | null; mode: string | null; title: string | null;
}

const CHANNEL: Record<string, string> = { web_form: "الاستمارة", telegram: "تيليغرام", whatsapp: "واتساب", rss: "RSS", moderator_paste: "مشرف", api: "API" };
const VERDICT: Record<string, { label: string; cls: string }> = {
  fresh: { label: "جديد", cls: "bg-emerald-600" }, recycled: { label: "قديم محتمل", cls: "bg-fuchsia-600" },
  duplicate: { label: "مكرر محتمل", cls: "bg-indigo-600" }, "low-confidence": { label: "مصداقية منخفضة", cls: "bg-amber-600" },
};

// Sample inputs for live demos (fictional people and 0555 00 0x xx numbers). They go through the real pipeline.
const SAMPLES = [
  { label: "نداء دم جديد", text: "خاوتي عاجل نحتاجو 4 متبرعين بالدم فصيلة O- فسبيطار مصطفى باشا بالعاصمة، عملية جراحية غدوة الصباح. اللي يقدر يجي يتصل 0555 00 02 01" },
  { label: "نداء مكرر", text: "حملة تنظيف غابة كانستال وهران نهار السبت الصباح، جيبو معاكم القفازات. نحتاجو 40 متطوع. 0555 00 01 04" },
  { label: "منشور قديم معاد", text: "عاجل ونداء لكل الخاوة: عائلة في بوفاريك ولاية البليدة دارهم طاحت وما عندهمش وين يباتو، يحتاجو أفرشة وأغطية وماكلة. شاركو المنشور ربي يجازيكم. للتواصل 0555 00 09 01" },
];

type Integrations = { claude: boolean; ai: "claude" | "gemini" | null; embeddings: boolean; turnstile: boolean; telegram: boolean; whatsapp: boolean; sms: boolean; smsProvider: string; model: string };

export function IngestConsole({ initial, integrations, archiveSize }: { initial: IntakeRow[]; integrations: Integrations; archiveSize: number }) {
  const [rows, setRows] = useState(initial);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [steps, setSteps] = useState<StepView[]>(idleSteps());
  const [result, setResult] = useState<PipelineOutcome | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [, start] = useTransition();

  useEffect(() => {
    const supabase = supabaseBrowser();
    const ch = supabase.channel("intake-monitor")
      .on("postgres_changes", { event: "*", schema: "public", table: "intake_items" }, (payload) => {
        const i = payload.new as Record<string, unknown>;
        if (!i?.id) return;
        const p = (i.pipeline ?? {}) as { verdict?: string; score?: number; mode?: string; analysis?: { title?: string } };
        const row: IntakeRow = { id: i.id as string, channel: i.channel as string, sourceLabel: (i.source_label as string) ?? null,
          preview: String(i.raw_text ?? "").slice(0, 160), status: i.status as string, error: (i.error as string) ?? null,
          receivedAt: i.received_at as string, alertId: (i.alert_id as string) ?? null, verdict: p.verdict ?? null,
          score: p.score ?? null, mode: p.mode ?? null, title: p.analysis?.title ?? null };
        setRows((prev) => [row, ...prev.filter((r) => r.id !== row.id)].slice(0, 50));
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => { supabase.removeChannel(ch); };
  }, []);

  const run = async () => {
    if (text.trim().length < 20) return;
    setRunning(true); setResult(null); setError(null); setSteps(idleSteps("running"));
    try {
      const res = await fetch("/api/intake", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, channel: "moderator_paste", sourceUrl: url || undefined, consent: true }) });
      const json = await res.json();
      if (!res.ok || !json.outcome) {
        setError(json.error ?? json.issues?.[0] ?? "فشلت المعالجة");
        setSteps(idleSteps());
      } else {
        const o = json.outcome as PipelineOutcome;
        setSteps(o.stages.map((s) => ({ ...s })));
        setResult(o);
      }
    } catch { setError("لا يوجد اتصال بالخادم"); setSteps(idleSteps()); }
    setRunning(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-800">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> {integrations.ai ? `${integrations.ai === "claude" ? "Claude" : "Gemini"} · ${integrations.model}` : "وضع القواعد — لا يوجد مزوّد ذكاء اصطناعي"}
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">محرك معالجة النداءات</h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">كل ما يصل عبر القنوات المسموح بها يمر بالمراحل السبع ثم ينتظر قرار مشرف. لا نجمع من فيسبوك/إنستغرام/تيك توك آلياً.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500"><Database className="h-4 w-4" aria-hidden /> الأرشيف: {archiveSize} سجل حقيقي</div>
      </div>

      <section className="rounded-3xl border border-slate-800 bg-slate-950 text-white shadow-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600/20"><Radar className={cn("h-5 w-5 text-brand-400", live && "animate-pulse")} aria-hidden /></div>
            <div>
              <div className="font-black">طابور الاستقبال المباشر</div>
              <div className="text-[11px] text-slate-400">{live ? "متصل (Realtime)" : "جارٍ الاتصال…"} · الاستمارة {integrations.telegram ? "· تيليغرام ✓" : "· تيليغرام ✗"} {integrations.whatsapp ? "· واتساب ✓" : "· واتساب ✗"}</div>
            </div>
          </div>
        </div>
        <ul className="divide-y divide-slate-800 max-h-96 overflow-y-auto" aria-live="polite">
          {rows.length === 0 && <li className="px-5 py-10 text-center text-sm text-slate-400">لم يصل أي نداء بعد. جرّب الاستمارة العامة <a className="underline" href="/submit">/submit</a> أو الصق نصاً أدناه.</li>}
          {rows.map((r) => {
            const v = r.verdict ? VERDICT[r.verdict] : null;
            return (
              <li key={r.id} className="px-5 py-3 text-sm flex items-start gap-3">
                <span className="mt-0.5 shrink-0 rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">{CHANNEL[r.channel] ?? r.channel}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-100 truncate">{r.title ?? r.preview}</div>
                  <div className="text-[11px] text-slate-500 truncate">{r.sourceLabel ? `${r.sourceLabel} · ` : ""}{timeAgo(r.receivedAt)}{r.mode ? ` · ${modeLabel(r.mode)}` : ""}{r.error ? ` · ${r.error}` : ""}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {r.status === "failed" && (
                    <button onClick={() => start(async () => { const x = await retryIntake(r.id); if (!x.ok) setError(x.error); })} className="flex items-center gap-1 rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-bold"><RotateCcw className="h-3 w-3" aria-hidden /> إعادة</button>
                  )}
                  {r.status !== "processed" && r.status !== "failed" && <span className="rounded-md bg-slate-700 px-2 py-0.5 text-[10px]">{r.status}</span>}
                  {v && <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold", v.cls)}>{v.label}{r.score != null ? ` · ${r.score}` : ""}</span>}
                  {r.alertId && <a href={`/admin?alert=${r.alertId}`} className="text-slate-400 hover:text-white" aria-label="فتح النداء"><Link2 className="h-4 w-4" /></a>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div id="pipeline" className="grid lg:grid-cols-[420px_1fr] gap-6">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <label htmlFor="paste" className="text-xs font-bold text-slate-500 mb-2 block">لصق منشور اطّلعت عليه (مع رابطه إن وجد)</label>
            <textarea id="paste" value={text} onChange={(e) => setText(e.target.value)} rows={8} maxLength={5000} placeholder="الصق نص المنشور هنا…"
              className="w-full resize-none rounded-2xl border border-slate-300 bg-slate-50 p-3 text-sm leading-relaxed focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200" />
            <VoiceInput className="mt-2" onText={(c) => setText((p) => (p ? `${p} ${c}` : c).slice(0, 5000))} />
            <input value={url} onChange={(e) => setUrl(e.target.value)} dir="ltr" placeholder="https://… (رابط المصدر، اختياري)" aria-label="رابط المصدر"
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none" />
            <div className="mt-3 flex gap-2">
              <Button className="flex-1" onClick={run} disabled={running || text.trim().length < 20}><Play className="h-4 w-4" aria-hidden /> {running ? "جارٍ المعالجة…" : "تشغيل المعالجة"}</Button>
              <Button variant="outline" onClick={() => { setText(""); setUrl(""); setResult(null); setSteps(idleSteps()); }} aria-label="مسح"><Trash2 className="h-4 w-4" /></Button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">يُنشئ نداءً «قيد المراجعة» في لوحة الإشراف. لا شيء يُنشر قبل موافقة مشرف.</p>
          </div>
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-4 text-xs text-slate-500">
            <div className="flex items-center gap-2 font-bold text-slate-700"><FlaskConical className="h-4 w-4" aria-hidden /> أمثلة للتجربة</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <button key={s.label} type="button" onClick={() => { setText(s.text); setResult(null); setSteps(idleSteps()); }}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-bold text-slate-700 hover:border-brand-500 hover:text-brand-700">{s.label}</button>
              ))}
            </div>
            <p className="mt-2">أسماء وأرقام وهمية (0555 00 0x xx). تمر عبر المعالجة الحقيقية نفسها.</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-900 mb-4">المراحل السبع</h2>
            <PipelineSteps steps={steps} />
            {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
          </div>
          {result && <ResultCard result={result} />}
        </div>
      </div>
    </div>
  );
}
