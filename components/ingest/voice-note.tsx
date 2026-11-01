"use client";

import { useEffect, useState } from "react";
import { Mic, Play, Languages, AudioLines } from "lucide-react";
import { VOICE_SAMPLE } from "@/lib/mock-data";
import { normalizeDarija } from "@/lib/ai-pipeline";
import { cn, sleep } from "@/lib/utils";

const BARS = Array.from({ length: 42 }, (_, i) => 6 + Math.abs(Math.sin(i * 1.7) * 22 + Math.cos(i * 0.6) * 8));

export function VoiceNote({ onTranscript, disabled }: { onTranscript: (t: string) => void; disabled?: boolean }) {
  const [stage, setStage] = useState<"idle" | "playing" | "transcribing" | "normalizing" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [terms, setTerms] = useState<{ from: string; to: string }[]>([]);

  const run = async () => {
    setStage("playing"); setTranscript(""); setTerms([]); setProgress(0);
    for (let i = 0; i <= 100; i += 4) { setProgress(i); await sleep(45); }
    setStage("transcribing");
    const full = VOICE_SAMPLE.transcript;
    for (let i = 0; i <= full.length; i += 3) { setTranscript(full.slice(0, i)); await sleep(22); }
    setTranscript(full);
    setStage("normalizing");
    await sleep(500);
    setTerms(normalizeDarija(full).terms);
    await sleep(900);
    setStage("done");
    onTranscript(full);
  };

  useEffect(() => { if (disabled) setStage("idle"); }, [disabled]);

  return (
    <div className="rounded-3xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800"><Mic className="h-4 w-4" /> رسالة صوتية بالدارجة (واتساب)</div>
        <span className="text-[10px] text-slate-500">{VOICE_SAMPLE.from}</span>
      </div>
      {/* player */}
      <div className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200 p-3">
        <button onClick={run} disabled={disabled || (stage !== "idle" && stage !== "done")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white disabled:opacity-50">
          {stage === "playing" ? <AudioLines className="h-5 w-5 animate-pulse" /> : <Play className="h-5 w-5" />}
        </button>
        <div className="flex-1 flex items-end gap-[2px] h-8" dir="ltr">
          {BARS.map((h, i) => (
            <span key={i} className={cn("w-1 rounded-full transition-colors", (i / BARS.length) * 100 <= progress ? "bg-emerald-600" : "bg-slate-200")} style={{ height: `${h}px` }} />
          ))}
        </div>
        <span className="text-[11px] font-mono text-slate-500">{VOICE_SAMPLE.duration}</span>
      </div>

      {stage !== "idle" && (
        <div className="mt-3 space-y-2 animate-fade-up">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
            <span className={cn("h-1.5 w-1.5 rounded-full", stage === "transcribing" ? "bg-emerald-500 animate-ping" : "bg-emerald-500")} />
            تفريغ صوتي (Darija ASR) {stage === "transcribing" && "…"}
          </div>
          {transcript && <p className="rounded-xl bg-white border border-slate-200 p-2.5 text-sm leading-relaxed text-slate-800">{transcript}{stage === "transcribing" && <span className="animate-blink">▌</span>}</p>}
          {(stage === "normalizing" || stage === "done") && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 mb-1"><Languages className="h-3.5 w-3.5" /> تطبيع الدارجة → العربية الفصحى {stage === "normalizing" && <span className="animate-blink">…</span>}</div>
              <div className="flex flex-wrap gap-1">
                {terms.map((t) => <span key={t.from} className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 animate-fade-up">{t.from} ← <b className="text-emerald-700">{t.to}</b></span>)}
              </div>
              {stage === "done" && <div className="mt-1.5 text-[11px] font-bold text-emerald-800">✓ {terms.length} مصطلحات دارجة فُهمت — تم تمرير النص إلى خط المعالجة ↓</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
