"use client";

import { useCallback, useRef, useState } from "react";
import { Sparkles, Play, Trash2, Database, CheckCheck, Facebook, Megaphone } from "lucide-react";
import { useAthar } from "@/lib/store";
import { SAMPLE_POSTS, HISTORICAL_RECORDS } from "@/lib/mock-data";
import { PIPELINE_TEMPLATE, classifyPost, extractPhones, normalizeArabic } from "@/lib/ai-pipeline";
import type { ClassificationResult, PipelineStep } from "@/lib/types";
import { PipelineSteps } from "@/components/ingest/pipeline-steps";
import { ResultCard } from "@/components/ingest/result-card";
import { LiveMonitor } from "@/components/ingest/live-monitor";
import { PublishModal } from "@/components/ingest/publish-modal";
import { PublishedStrip } from "@/components/ingest/published-strip";
import { VoiceNote } from "@/components/ingest/voice-note";
import { Button } from "@/components/ui/button";
import { sleep, cn } from "@/lib/utils";

const idleSteps = (): PipelineStep[] => PIPELINE_TEMPLATE.map((s) => ({ ...s, status: "idle" }));

export default function IngestPage() {
  const { alerts, addFromClassification } = useAthar();
  const [text, setText] = useState("");
  const [steps, setSteps] = useState<PipelineStep[]>(idleSteps);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const runId = useRef(0);

  const update = (id: string, patch: Partial<PipelineStep>) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const run = useCallback(async (input: string) => {
    if (!input.trim()) return;
    const myRun = ++runId.current;
    setRunning(true);
    setResult(null);
    setSaved(false);
    setSteps(idleSteps());

    // Precompute the final result, then reveal step-by-step with delays
    const r = classifyPost(input, alerts);
    const phones = extractPhones(input);
    const words = normalizeArabic(input).split(" ").length;

    const details: Record<string, { detail: string; status: PipelineStep["status"] }> = {
      ingest: { detail: `تم استقبال منشور من فيسبوك · ${input.length} حرف · ${words} كلمة`, status: "done" },
      normalize: { detail: r.darijaTerms.length ? `فُهمت ${r.darijaTerms.length} مصطلحات دارجة (${r.darijaTerms.slice(0, 3).map((t) => `${t.from}→${t.to}`).join("، ")}…) + تطبيع → ${words} رمز` : `إزالة التشكيل، توحيد الهمزات والتاء المربوطة → ${words} رمز (token)`, status: "done" },
      entities: {
        detail: r.extractedEntities.length
          ? r.extractedEntities.map((e) => `${e.label}: ${e.value}`).join(" · ")
          : "لم يتم استخراج كيانات واضحة",
        status: "done",
      },
      classify: { detail: `الفئة: ${r.category} · الاستعجال: ${r.urgency} · ثقة ${Math.round(r.confidence * 100)}%`, status: "done" },
      recycle: r.matchedHistorical
        ? { detail: `⚠️ تطابق ${Math.round((r.similarity ?? 0) * 100)}% مع السجل ${r.matchedHistorical.id} (${r.matchedHistorical.firstSeenAt.slice(0, 4)}) — أُعيد نشره ${r.matchedHistorical.timesRecycled} مرة`, status: "warning" }
        : { detail: `مقارنة مع ${HISTORICAL_RECORDS.length * 1_000 + 412} بصمة أرشيفية — لا تطابق ✓`, status: "done" },
      dedupe: r.mergedIntoAlert
        ? { detail: `🔁 تطابق ${Math.round((r.similarity ?? 0) * 100)}% مع "${r.mergedIntoAlert.title}" — دمج تلقائي`, status: "warning" }
        : r.verdict === "recycled"
        ? { detail: "تم التخطي (المنشور قديم)", status: "done" }
        : { detail: `مقارنة مع ${alerts.length} حدث نشط — حدث جديد ✓`, status: "done" },
      score: { detail: `درجة المصداقية النهائية: ${r.credibilityScore}% · ${phones.length ? "رقم اتصال موثق" : "بدون رقم"}`, status: "done" },
    };

    for (const s of PIPELINE_TEMPLATE) {
      if (runId.current !== myRun) return;
      update(s.id, { status: "running" });
      await sleep(s.durationMs);
      if (runId.current !== myRun) return;
      update(s.id, details[s.id]);
    }
    await sleep(300);
    if (runId.current !== myRun) return;
    setResult(r);
    setRunning(false);
  }, [alerts]);

  const loadSample = (t: string) => {
    setText(t);
    run(t);
  };

  const inspectFromMonitor = (t: string) => {
    setText(t);
    run(t);
    setTimeout(() => document.getElementById("pipeline")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const save = () => {
    if (!result) return;
    addFromClassification(text, result);
    setSaved(true);
  };

  const reset = () => {
    runId.current++;
    setText("");
    setSteps(idleSteps());
    setResult(null);
    setRunning(false);
    setSaved(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-800">
            <Sparkles className="h-3.5 w-3.5" /> Athar Intelligence Engine v0.9 · Demo
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">محرك معالجة المنشورات بالذكاء الاصطناعي</h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            الصق أي منشور من وسائل التواصل وشاهد كيف يحوّله إيثار إلى نداء مهيكل — أو يكتشف أنه منشور قديم
            يعود لسنوات ويصفّيه قبل أن يضيّع وقت المتطوعين.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Database className="h-4 w-4" /> أرشيف: 3,412 بصمة · {alerts.length} حدث نشط
        </div>
      </div>

      <LiveMonitor onInspect={inspectFromMonitor} />
      <PublishedStrip />

      <div id="pipeline" className="grid lg:grid-cols-[420px_1fr] gap-6 scroll-mt-20">
        {/* Left: input */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2">
              <Facebook className="h-4 w-4 text-blue-600" /> تحليل مفصّل لمنشور واحد (أو اختر من الرصد المباشر أعلاه)
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder="الصق نص المنشور هنا…"
              className="w-full resize-none rounded-2xl border border-slate-300 bg-slate-50 p-3 text-sm leading-relaxed focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            <div className="mt-3 flex gap-2">
              <Button className="flex-1" onClick={() => run(text)} disabled={running || !text.trim()}>
                <Play className="h-4 w-4" /> {running ? "جارٍ المعالجة…" : "تشغيل المعالجة"}
              </Button>
              <Button variant="outline" onClick={reset}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>

          <VoiceNote disabled={running} onTranscript={(t) => { setText(t); run(t); }} />

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold text-slate-500 mb-3">سيناريوهات جاهزة للعرض</div>
            <div className="space-y-2">
              {SAMPLE_POSTS.map((s) => (
                <button
                  key={s.id}
                  disabled={running}
                  onClick={() => loadSample(s.text)}
                  className={cn(
                    "w-full rounded-2xl border p-3 text-right transition-all hover:shadow-md disabled:opacity-50",
                    s.id === "sample-recycled"
                      ? "border-fuchsia-300 bg-gradient-to-l from-fuchsia-50 to-white"
                      : "border-slate-200 hover:border-slate-400"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{s.icon}</span>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{s.label}</div>
                        <div className="text-[10px] text-slate-500">{s.labelEn}</div>
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white whitespace-nowrap">
                      {s.expected}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: pipeline + result */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-slate-900">خط المعالجة (Pipeline)</h2>
              {running && (
                <span className="flex items-center gap-2 text-xs font-bold text-brand-700">
                  <span className="h-2 w-2 rounded-full bg-brand-500 animate-ping" /> LIVE
                </span>
              )}
            </div>
            <PipelineSteps steps={steps} />
          </div>

          {result && (
            <>
              <ResultCard result={result} />
              <div className="flex flex-col sm:flex-row gap-3 rounded-3xl border border-slate-200 bg-white p-4">
                <div className="flex-1 text-sm text-slate-600">
                  {result.verdict === "recycled"
                    ? "سيتم أرشفة هذا المنشور كـ«منشور قديم» ولن يظهر على الخريطة العامة."
                    : result.verdict === "duplicate"
                    ? "سيتم ربط هذا المنشور بالحدث الأصلي وزيادة عداد المصادر."
                    : "سيتم إرسال النداء إلى لوحة الوزارة للمراجعة والموافقة قبل نشره على الخريطة."}
                </div>
                <div className="flex gap-2">
                  {result.verdict === "fresh" && (
                    <Button onClick={() => setPublishOpen(true)}>
                      <Megaphone className="h-4 w-4" /> نشر بهوية إيثار
                    </Button>
                  )}
                  <Button onClick={save} disabled={saved} variant={saved ? "success" : "secondary"}>
                    <CheckCheck className="h-4 w-4" /> {saved ? "تم الحفظ" : "حفظ في قاعدة البيانات"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <PublishModal open={publishOpen} onClose={() => setPublishOpen(false)} text={text} result={result} />
    </div>
  );
}
