"use client";

import { Check, Loader2, AlertTriangle, Circle } from "lucide-react";
import type { PipelineStep } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PipelineSteps({ steps }: { steps: PipelineStep[] }) {
  return (
    <ol className="relative space-y-1">
      {steps.map((s, i) => {
        const isLast = i === steps.length - 1;
        return (
          <li key={s.id} className="relative flex gap-3">
            {!isLast && (
              <span
                className={cn(
                  "absolute right-[13px] top-7 h-[calc(100%-6px)] w-0.5",
                  s.status === "done" || s.status === "warning" ? "bg-brand-500" : "bg-slate-200"
                )}
              />
            )}
            <div
              className={cn(
                "relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-white transition-all",
                s.status === "done" && "border-brand-500 bg-brand-500 text-white",
                s.status === "running" && "border-brand-500 text-brand-600",
                s.status === "warning" && "border-fuchsia-500 bg-fuchsia-500 text-white",
                s.status === "idle" && "border-slate-200 text-slate-300"
              )}
            >
              {s.status === "done" && <Check className="h-4 w-4" />}
              {s.status === "running" && <Loader2 className="h-4 w-4 animate-spin" />}
              {s.status === "warning" && <AlertTriangle className="h-3.5 w-3.5" />}
              {s.status === "idle" && <Circle className="h-2 w-2 fill-current" />}
            </div>
            <div className={cn("pb-4 min-w-0 flex-1 transition-opacity", s.status === "idle" && "opacity-40")}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-sm text-slate-900">{s.labelAr}</div>
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{s.label}</div>
              </div>
              {s.detail && (
                <div
                  className={cn(
                    "mt-1 rounded-lg px-2.5 py-1.5 text-xs font-medium animate-fade-up",
                    s.status === "warning" ? "bg-fuchsia-50 text-fuchsia-800" : "bg-slate-50 text-slate-600"
                  )}
                >
                  {s.detail}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
