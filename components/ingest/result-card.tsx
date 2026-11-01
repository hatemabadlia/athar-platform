"use client";

import Link from "next/link";
import { ShieldCheck, Recycle, GitMerge, AlertTriangle, MapPin, Tag, History, CalendarClock, ExternalLink, Info } from "lucide-react";
import type { PipelineOutcome } from "@/lib/pipeline/run";
import { CATEGORY_META, URGENCY_META } from "@/lib/reference/meta";
import { ScoreRing } from "@/components/ui/score-ring";
import { findWilaya } from "@/lib/wilayas";
import { formatDate, cn } from "@/lib/utils";

const VERDICT = {
  fresh: { label: "NEW", labelAr: "نداء جديد — بانتظار المراجعة", icon: ShieldCheck, ring: "from-emerald-500 to-brand-700" },
  recycled: { label: "POSSIBLY RECYCLED", labelAr: "محتوى قديم محتمل", icon: Recycle, ring: "from-fuchsia-500 to-purple-800" },
  duplicate: { label: "POSSIBLE DUPLICATE", labelAr: "مكرر محتمل لنداء نشط", icon: GitMerge, ring: "from-indigo-500 to-blue-800" },
  "low-confidence": { label: "LOW CONFIDENCE", labelAr: "مصداقية منخفضة — تحقّق يدوياً", icon: AlertTriangle, ring: "from-amber-500 to-orange-700" },
} as const;

export function ResultCard({ result }: { result: PipelineOutcome }) {
  const v = VERDICT[result.verdict];
  const Icon = v.icon;
  const a = result.analysis;
  const cat = a.category ? CATEGORY_META[a.category] : null;
  const urg = URGENCY_META[a.urgency];
  const w = a.wilaya_code ? findWilaya(a.wilaya_code) : null;

  return (
    <div className="animate-fade-up space-y-4">
      <div className={cn("relative overflow-hidden rounded-3xl bg-gradient-to-l p-5 text-white", v.ring)}>
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20"><Icon className="h-7 w-7" aria-hidden /></div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-black tracking-[0.2em] opacity-80">{v.label} · {result.mode === "claude" ? "Claude" : "وضع القواعد"}</div>
            <div className="text-xl font-black">{v.labelAr}</div>
            <div className="text-sm opacity-90 mt-0.5">{a.summary}</div>
          </div>
          <div className="rounded-2xl bg-white p-1.5"><ScoreRing score={result.score} size={64} /></div>
        </div>
      </div>

      {result.recycled && (
        <div className="rounded-3xl border-2 border-fuchsia-300 bg-fuchsia-50 p-5">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-600 px-3 py-1 text-xs font-black text-white"><History className="h-3.5 w-3.5" aria-hidden /> رُصد أول مرة {formatDate(result.recycled.first_seen_at)}</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-fuchsia-800 ring-1 ring-fuchsia-300">شوهد {result.recycled.times_seen} مرة</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-fuchsia-800 ring-1 ring-fuchsia-300">{result.recycled.exact ? "نص مطابق" : `تشابه ${Math.round(result.recycled.text_similarity * 100)}%`}{result.recycled.phone_match ? " · نفس الهاتف" : ""}</span>
          </div>
          <div className="rounded-2xl bg-white p-3 ring-2 ring-fuchsia-200">
            <div className="text-[10px] font-bold text-fuchsia-500 mb-1">المحتوى المؤرشف المطابق</div>
            <p className="text-xs leading-relaxed text-slate-700 line-clamp-5">{result.recycled.normalized_text}</p>
            {result.recycled.resolved_at && <div className="mt-2 text-[10px] font-semibold text-fuchsia-700 flex items-center gap-1"><CalendarClock className="h-3 w-3" aria-hidden /> أُغلق في {formatDate(result.recycled.resolved_at)}</div>}
          </div>
          <p className="mt-3 text-xs text-fuchsia-900">التشابه لا يعني احتيالاً بالضرورة (قد تتكرر حالة حقيقية). القرار للمشرف.</p>
        </div>
      )}

      {result.duplicate && (
        <div className="rounded-3xl border-2 border-indigo-200 bg-indigo-50 p-5">
          <div className="text-xs font-black text-indigo-600 mb-2">{result.linkedTo ? "رُبط تلقائياً كمصدر إضافي للنداء النشط" : "يُقترح الدمج مع النداء النشط"}</div>
          <div className="rounded-2xl bg-white p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-slate-900">{result.duplicate.title}</div>
              <div className="text-xs text-slate-500 mt-1">تشابه {Math.round(result.duplicate.text_similarity * 100)}%{result.duplicate.phone_match ? " · نفس الهاتف" : ""} · {formatDate(result.duplicate.created_at)}</div>
            </div>
            <Link href={`/admin?alert=${result.duplicate.id}`} className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white">فتح <ExternalLink className="h-3 w-3" aria-hidden /></Link>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-black text-slate-400 mb-3 flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" aria-hidden /> الحقول المستخرجة</div>
          <dl className="space-y-2 text-sm">
            <Row k="الفئة" v={cat ? <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${cat.bg} ${cat.color}`}>{cat.emoji} {cat.labelAr}</span> : "غير محددة"} />
            <Row k="الاستعجال" v={<span className={`rounded-full px-2 py-0.5 text-xs font-bold ${urg.bg} ${urg.color}`}>{urg.labelAr}</span>} />
            <Row k="الولاية" v={<span className="flex items-center gap-1 font-semibold"><MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden /> {w?.nameAr ?? "غير محددة"}</span>} />
            <Row k="البلدية" v={a.baladiya ?? "—"} />
            <Row k="الفصيلة" v={a.blood_type ?? "—"} />
            <Row k="العدد" v={a.quantity ?? "—"} />
            <Row k="الموعد" v={a.deadline_text ?? "—"} />
            <Row k="المؤسسة" v={a.institution ?? "—"} />
            <Row k="الثقة" v={<span className="font-mono font-bold">{Math.round(a.confidence * 100)}%</span>} />
          </dl>
          {a.darija_terms.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">{a.darija_terms.map((t, i) => <span key={i} className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800">{t.from} ← {t.to}</span>)}</div>
          )}
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-black text-slate-400 mb-3">لماذا هذه الدرجة؟</div>
          <ul className="space-y-1.5">
            {result.reasons.filter((r) => r.delta !== 0 || r.label.startsWith("نقطة")).map((r, i) => (
              <li key={i} className="flex justify-between gap-2 text-xs text-slate-700">
                <span>{r.label}</span>
                <span className={cn("font-mono font-bold", r.delta > 0 ? "text-emerald-700" : r.delta < 0 ? "text-red-700" : "text-slate-400")}>{r.delta > 0 ? `+${r.delta}` : r.delta}</span>
              </li>
            ))}
          </ul>
          {result.review.length > 0 && (
            <div className="mt-3 rounded-xl bg-amber-50 p-2.5 text-[11px] text-amber-900 space-y-1">
              {result.review.map((r, i) => <div key={i} className="flex gap-1"><Info className="h-3 w-3 shrink-0 mt-0.5" aria-hidden />{r}</div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="text-left">{v}</dd></div>;
}
