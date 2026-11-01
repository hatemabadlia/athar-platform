"use client";

import { Check, Loader2, AlertTriangle, Circle, XCircle, MinusCircle } from "lucide-react";
import type { StageResult } from "@/lib/pipeline/types";
import { STAGE_LABELS } from "@/lib/pipeline/types";
import { cn } from "@/lib/utils";

export type StepView = { id: StageResult["id"]; labelAr: string; status: StageResult["status"] | "idle" | "running"; detail?: string; durationMs?: number; mode?: string };

export const idleSteps = (status: "idle" | "running" = "idle"): StepView[] =>
  (Object.keys(STAGE_LABELS) as StageResult["id"][]).map((id) => ({ id, labelAr: STAGE_LABELS[id], status }));

const MODE_LABEL: Record<string, string> = { claude: "Claude", heuristic: "قواعد", sql: "SQL", embedding: "تضمين" };

export function PipelineSteps({ steps }: { steps: StepView[] }) {
  return (
    <ol className="relative space-y-1">
      {steps.map((s, i) => (
        <li key={s.id} className="relative flex gap-3">
          {i < steps.length - 1 && <span aria-hidden className={cn("absolute right-[13px] top-7 h-[calc(100%-6px)] w-0.5", s.status === "done" || s.status === "warning" ? "bg-brand-500" : "bg-slate-200")} />}
          <div className={cn("relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-white",
            s.status === "done" && "border-brand-500 bg-brand-500 text-white",
            s.status === "running" && "border-brand-500 text-brand-600",
            s.status === "warning" && "border-fuchsia-500 bg-fuchsia-500 text-white",
            s.status === "error" && "border-red-500 bg-red-500 text-white",
            (s.status === "idle" || s.status === "skipped") && "border-slate-200 text-slate-300")}>
            {s.status === "done" && <Check className="h-4 w-4" aria-label="تم" />}
            {s.status === "running" && <Loader2 className="h-4 w-4 animate-spin" aria-label="جارٍ" />}
            {s.status === "warning" && <AlertTriangle className="h-3.5 w-3.5" aria-label="تنبيه" />}
            {s.status === "error" && <XCircle className="h-3.5 w-3.5" aria-label="خطأ" />}
            {s.status === "skipped" && <MinusCircle className="h-3.5 w-3.5" aria-label="تخطي" />}
            {s.status === "idle" && <Circle className="h-2 w-2 fill-current" aria-hidden />}
          </div>
          <div className={cn("pb-4 min-w-0 flex-1", s.status === "idle" && "opacity-40")}>
            <div className="flex items-center justify-between gap-2">
              <div className="font-bold text-sm text-slate-900">{i + 1}. {s.labelAr}</div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                {s.mode && <span className="rounded bg-slate-100 px-1.5 py-0.5">{MODE_LABEL[s.mode] ?? s.mode}</span>}
                {s.durationMs ? <span>{s.durationMs} ms</span> : null}
              </div>
            </div>
            {s.detail && <div className={cn("mt-1 rounded-lg px-2.5 py-1.5 text-xs font-medium animate-fade-up", s.status === "warning" ? "bg-fuchsia-50 text-fuchsia-800" : s.status === "error" ? "bg-red-50 text-red-800" : "bg-slate-50 text-slate-600")}>{s.detail}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
