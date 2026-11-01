"use client";

import { useMemo, useState } from "react";
import { Check, X, CheckCircle2, Search, Eye, Facebook, Instagram, MessageCircle, Twitter, Music2, History, ArrowUpDown } from "lucide-react";
import { useAthar } from "@/lib/store";
import type { Alert, AlertStatus, Category, Urgency } from "@/lib/types";
import { CATEGORY_META, URGENCY_META, STATUS_META } from "@/lib/mock-data";
import { ScoreRing } from "@/components/ui/score-ring";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { timeAgo, formatDate, cn } from "@/lib/utils";

const SOURCE_ICON = { facebook: Facebook, instagram: Instagram, whatsapp: MessageCircle, twitter: Twitter, tiktok: Music2 };

type SortKey = "postedAt" | "credibilityScore" | "urgency";

export function AlertsTable({ statusPreset }: { statusPreset: string }) {
  const { alerts, setStatus } = useAthar();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [urgency, setUrgency] = useState<Urgency | "all">("all");
  const [status, setStatusFilter] = useState<AlertStatus | "all">("all");
  const [sort, setSort] = useState<SortKey>("postedAt");
  const [detail, setDetail] = useState<Alert | null>(null);

  const effectiveStatus: AlertStatus | "all" | "recycledMerged" =
    statusPreset === "approved" ? "approved" : statusPreset === "recycled" ? "recycledMerged" : status;

  const rows = useMemo(() => {
    const order: Record<Urgency, number> = { critical: 0, medium: 1, normal: 2 };
    return alerts
      .filter((a) => {
        if (effectiveStatus === "recycledMerged") return a.status === "recycled" || a.status === "merged";
        if (effectiveStatus !== "all") return a.status === effectiveStatus;
        return true;
      })
      .filter((a) => category === "all" || a.category === category)
      .filter((a) => urgency === "all" || a.urgency === urgency)
      .filter((a) => !q || [a.title, a.originalText, a.wilaya, a.baladiya, a.contactPhone].some((f) => f.includes(q)))
      .sort((a, b) => {
        if (sort === "credibilityScore") return b.credibilityScore - a.credibilityScore;
        if (sort === "urgency") return order[a.urgency] - order[b.urgency];
        return +new Date(b.postedAt) - +new Date(a.postedAt);
      });
  }, [alerts, effectiveStatus, category, urgency, q, sort]);

  const select = "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-200";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث بالنص، الولاية، أو رقم الهاتف…"
            className="w-full rounded-xl border border-slate-300 py-2 pr-9 pl-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value as Category | "all")} className={select}>
          <option value="all">كل الفئات</option>
          {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
            <option key={c} value={c}>{CATEGORY_META[c].emoji} {CATEGORY_META[c].labelAr}</option>
          ))}
        </select>
        <select value={urgency} onChange={(e) => setUrgency(e.target.value as Urgency | "all")} className={select}>
          <option value="all">كل المستويات</option>
          {(Object.keys(URGENCY_META) as Urgency[]).map((u) => (
            <option key={u} value={u}>{URGENCY_META[u].labelAr}</option>
          ))}
        </select>
        <select
          value={effectiveStatus === "recycledMerged" ? "all" : effectiveStatus}
          onChange={(e) => setStatusFilter(e.target.value as AlertStatus | "all")}
          disabled={statusPreset !== "all" && statusPreset !== "wilayas"}
          className={cn(select, "disabled:opacity-60")}
        >
          <option value="all">كل الحالات</option>
          {(Object.keys(STATUS_META) as AlertStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_META[s].labelAr}</option>
          ))}
        </select>
        <button
          onClick={() => setSort((s) => (s === "postedAt" ? "credibilityScore" : s === "credibilityScore" ? "urgency" : "postedAt"))}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowUpDown className="h-4 w-4" />
          {sort === "postedAt" ? "الأحدث" : sort === "credibilityScore" ? "المصداقية" : "الاستعجال"}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 text-right">المنشور</th>
              <th className="px-3 py-3 text-right">الولاية / البلدية</th>
              <th className="px-3 py-3 text-right">الفئة</th>
              <th className="px-3 py-3 text-right">الاستعجال</th>
              <th className="px-3 py-3 text-center">مصداقية AI</th>
              <th className="px-3 py-3 text-right">الحالة</th>
              <th className="px-3 py-3 text-left">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">لا توجد نتائج مطابقة.</td></tr>
            )}
            {rows.map((a) => {
              const cat = CATEGORY_META[a.category];
              const urg = URGENCY_META[a.urgency];
              const st = STATUS_META[a.status];
              const Src = SOURCE_ICON[a.source];
              return (
                <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 max-w-[340px]">
                    <div className="flex items-start gap-2">
                      <Src className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{a.title}</div>
                        <div className="text-xs text-slate-500 line-clamp-1">{a.originalText}</div>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                          <span>{timeAgo(a.postedAt)}</span>
                          {a.duplicateCount > 0 && <span className="rounded bg-slate-100 px-1.5 font-semibold">{a.duplicateCount} مصدر</span>}
                          {a.firstSeenAt && (
                            <span className="inline-flex items-center gap-1 rounded bg-fuchsia-100 px-1.5 font-bold text-fuchsia-700">
                              <History className="h-3 w-3" /> شوهد أولاً {a.firstSeenAt.slice(0, 4)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-slate-800">{a.wilaya}</div>
                    <div className="text-xs text-slate-500">{a.baladiya}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${cat.bg} ${cat.color} whitespace-nowrap`}>{cat.emoji} {cat.labelAr}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${urg.bg} ${urg.color}`}>{urg.labelAr}</span>
                  </td>
                  <td className="px-3 py-3 text-center"><ScoreRing score={a.credibilityScore} size={44} /></td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${st.bg} ${st.color} whitespace-nowrap`}>{st.labelAr}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <IconBtn title="عرض التفاصيل" onClick={() => setDetail(a)} className="text-slate-600 hover:bg-slate-100"><Eye className="h-4 w-4" /></IconBtn>
                      {a.status !== "approved" && a.status !== "resolved" && (
                        <IconBtn title="موافقة" onClick={() => setStatus(a.id, "approved")} className="text-emerald-700 hover:bg-emerald-100"><Check className="h-4 w-4" /></IconBtn>
                      )}
                      {a.status !== "rejected" && a.status !== "resolved" && (
                        <IconBtn title="رفض" onClick={() => setStatus(a.id, "rejected")} className="text-red-700 hover:bg-red-100"><X className="h-4 w-4" /></IconBtn>
                      )}
                      {a.status === "approved" && (
                        <IconBtn title="تم الحل" onClick={() => setStatus(a.id, "resolved")} className="text-sky-700 hover:bg-sky-100"><CheckCircle2 className="h-4 w-4" /></IconBtn>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">{rows.length} نتيجة</div>

      {/* Detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="تفاصيل المنشور" className="sm:max-w-2xl">
        {detail && <DetailView a={detail} onStatus={(s) => { setStatus(detail.id, s); setDetail({ ...detail, status: s }); }} />}
      </Modal>
    </div>
  );
}

function IconBtn({ children, className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn("rounded-lg p-1.5 transition-colors", className)} {...p}>{children}</button>;
}

function DetailView({ a, onStatus }: { a: Alert; onStatus: (s: AlertStatus) => void }) {
  const cat = CATEGORY_META[a.category];
  const urg = URGENCY_META[a.urgency];
  const st = STATUS_META[a.status];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cat.bg} ${cat.color}`}>{cat.emoji} {cat.labelAr}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${urg.bg} ${urg.color}`}>{urg.labelAr}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.bg} ${st.color}`}>{st.labelAr}</span>
        {a.firstSeenAt && (
          <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-600 px-2.5 py-0.5 text-xs font-bold text-white">
            <History className="h-3 w-3" /> شوهد لأول مرة في {formatDate(a.firstSeenAt)}
          </span>
        )}
      </div>
      <h4 className="text-lg font-black text-slate-900">{a.title}</h4>
      <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 border border-slate-200">{a.originalText}</div>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <Info k="الولاية" v={`${a.wilaya} · ${a.baladiya}`} />
        <Info k="جهة الاتصال" v={`${a.contactName} · ${a.contactPhone}`} />
        <Info k="المصدر" v={a.source} />
        <Info k="نُشر" v={`${timeAgo(a.postedAt)} · ${formatDate(a.postedAt)}`} />
        <Info k="المتطوعون" v={`${a.volunteersJoined} / ${a.volunteersNeeded}`} />
        <Info k="منشورات مدمجة" v={String(a.duplicateCount)} />
      </div>
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-black text-brand-800 uppercase tracking-wider">ملخص الذكاء الاصطناعي</div>
          <ScoreRing score={a.credibilityScore} size={44} />
        </div>
        <p className="text-sm text-slate-700">{a.aiSummary}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {a.aiTags.map((t) => <span key={t} className="rounded-lg bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-brand-200">{t}</span>)}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
        <Button variant="success" size="sm" onClick={() => onStatus("approved")} disabled={a.status === "approved"}><Check className="h-4 w-4" /> موافقة ونشر</Button>
        <Button variant="danger" size="sm" onClick={() => onStatus("rejected")} disabled={a.status === "rejected"}><X className="h-4 w-4" /> رفض</Button>
        <Button variant="outline" size="sm" onClick={() => onStatus("resolved")} disabled={a.status === "resolved"}><CheckCircle2 className="h-4 w-4" /> تم الحل</Button>
      </div>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 px-3 py-2">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{k}</div>
      <div className="font-semibold text-slate-800" dir="auto">{v}</div>
    </div>
  );
}
