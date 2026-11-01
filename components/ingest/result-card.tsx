"use client";

import { ShieldCheck, Recycle, GitMerge, AlertTriangle, MapPin, Tag, History, CalendarClock, Share2, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ClassificationResult } from "@/lib/types";
import { CATEGORY_META, URGENCY_META } from "@/lib/mock-data";
import { ScoreRing } from "@/components/ui/score-ring";
import { formatDate, cn } from "@/lib/utils";

const VERDICT = {
  fresh: { label: "VERIFIED FRESH", labelAr: "نداء جديد موثّق", icon: ShieldCheck, ring: "from-emerald-500 to-brand-700", chip: "bg-emerald-100 text-emerald-800" },
  recycled: { label: "STALE / VIRAL RECYCLED", labelAr: "منشور قديم معاد تدويره", icon: Recycle, ring: "from-fuchsia-500 to-purple-800", chip: "bg-fuchsia-100 text-fuchsia-800" },
  duplicate: { label: "DUPLICATE → MERGED", labelAr: "مكرر — تم الدمج", icon: GitMerge, ring: "from-indigo-500 to-blue-800", chip: "bg-indigo-100 text-indigo-800" },
  "low-confidence": { label: "LOW CONFIDENCE", labelAr: "مصداقية منخفضة", icon: AlertTriangle, ring: "from-amber-500 to-orange-700", chip: "bg-amber-100 text-amber-800" },
};

export function ResultCard({ result }: { result: ClassificationResult }) {
  const v = VERDICT[result.verdict];
  const Icon = v.icon;
  const cat = CATEGORY_META[result.category];
  const urg = URGENCY_META[result.urgency];
  const yearsOld = result.matchedHistorical
    ? new Date().getFullYear() - new Date(result.matchedHistorical.firstSeenAt).getFullYear()
    : 0;

  return (
    <div className="animate-fade-up space-y-4">
      {/* Verdict banner */}
      <div className={cn("relative overflow-hidden rounded-3xl bg-gradient-to-l p-5 text-white", v.ring)}>
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <Icon className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-black tracking-[0.2em] opacity-80">{v.label}</div>
            <div className="text-xl font-black">{v.labelAr}</div>
            <div className="text-sm opacity-90 mt-0.5">{result.aiSummary}</div>
          </div>
          <div className="rounded-2xl bg-white p-1.5">
            <ScoreRing score={result.credibilityScore} size={64} />
          </div>
        </div>
      </div>

      {/* Recycled evidence — the winning feature */}
      {result.verdict === "recycled" && result.matchedHistorical && (
        <div className="rounded-3xl border-2 border-fuchsia-300 bg-fuchsia-50 p-5">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-600 px-3 py-1 text-xs font-black text-white shadow">
              <History className="h-3.5 w-3.5" /> شوهد لأول مرة في {result.matchedHistorical.firstSeenAt.slice(0, 4)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-fuchsia-800 ring-1 ring-fuchsia-300">
              <Share2 className="h-3.5 w-3.5" /> أُعيد نشره {result.matchedHistorical.timesRecycled} مرة
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-fuchsia-800 ring-1 ring-fuchsia-300">
              تطابق {Math.round((result.similarity ?? 0) * 100)}%
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">المنشور الحالي</div>
              <p className="text-xs leading-relaxed text-slate-700 line-clamp-4">{"…" + result.aiSummary}</p>
              <div className="mt-2 text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                <CalendarClock className="h-3 w-3" /> اليوم
              </div>
            </div>
            <div className="rounded-2xl bg-white p-3 ring-2 ring-fuchsia-200">
              <div className="text-[10px] font-bold text-fuchsia-500 uppercase tracking-wider mb-1">السجل الأرشيفي المطابق</div>
              <p className="text-xs leading-relaxed text-slate-700 line-clamp-4">{result.matchedHistorical.text}</p>
              <div className="mt-2 text-[10px] font-semibold text-fuchsia-700 flex items-center gap-1">
                <CalendarClock className="h-3 w-3" /> {formatDate(result.matchedHistorical.firstSeenAt)}
                {result.matchedHistorical.resolvedAt && ` · تم الحل ${formatDate(result.matchedHistorical.resolvedAt)}`}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold text-fuchsia-900">
            ⏱️ هذا المنشور عمره {yearsOld} سنوات. لن يُعرض على المتطوعين — وُفّر ما يقارب {result.matchedHistorical.timesRecycled * 6} ساعة تطوعية من الضياع.
          </p>
        </div>
      )}

      {/* Duplicate merge */}
      {result.verdict === "duplicate" && result.mergedIntoAlert && (
        <div className="rounded-3xl border-2 border-indigo-200 bg-indigo-50 p-5">
          <div className="text-xs font-black text-indigo-600 tracking-wider mb-2">تم الدمج في الحدث النشط</div>
          <div className="rounded-2xl bg-white p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-slate-900">{result.mergedIntoAlert.title}</div>
              <div className="text-xs text-slate-500 mt-1">
                {result.mergedIntoAlert.wilaya} · {result.mergedIntoAlert.volunteersJoined}/{result.mergedIntoAlert.volunteersNeeded} متطوع · {result.mergedIntoAlert.duplicateCount + 1} منشور مدمج
              </div>
            </div>
            <Link href="/" className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700">
              عرض على الخريطة <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Extracted structure */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" /> التصنيف المهيكل
          </div>
          <dl className="space-y-2 text-sm">
            <Row k="الفئة" v={<span className={`rounded-full px-2 py-0.5 text-xs font-bold ${cat.bg} ${cat.color}`}>{cat.emoji} {cat.labelAr}</span>} />
            <Row k="الاستعجال" v={<span className={`rounded-full px-2 py-0.5 text-xs font-bold ${urg.bg} ${urg.color}`}>{urg.labelAr}</span>} />
            <Row k="الولاية" v={<span className="flex items-center gap-1 font-semibold"><MapPin className="h-3.5 w-3.5 text-slate-400" /> {result.wilaya?.nameAr ?? "غير محدد"}</span>} />
            <Row k="الثقة في التصنيف" v={<span className="font-mono font-bold">{Math.round(result.confidence * 100)}%</span>} />
          </dl>
          {result.extractedEntities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.extractedEntities.map((e, i) => (
                <span key={i} className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                  <span className="text-slate-400">{e.label}:</span> <span dir="auto">{e.value}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">سلسلة الاستدلال (AI Reasoning)</div>
          <ul className="space-y-2">
            {result.reasoning.map((r, i) => (
              <li key={i} className="flex gap-2 text-xs text-slate-700 leading-relaxed animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500 mt-1.5" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
