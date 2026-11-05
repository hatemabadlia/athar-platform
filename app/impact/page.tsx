import Link from "next/link";
import { BarChart3, Download, Info } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { WILAYAS, findWilaya } from "@/lib/wilayas";
import { CATEGORY_META } from "@/lib/reference/meta";
import type { Category } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "شفافية الأثر", description: "إحصاءات وطنية وولائية محسوبة من سجلات إيثار الفعلية." };

type Impact = { alerts_approved: number; alerts_resolved: number; alerts_filtered: number; confirmed_participations: number; attendance_checkins: number;
  volunteer_hours: number; trees_verified: number; clubs: number; reports_approved: number; by_category: Record<string, number>;
  by_wilaya: { wilaya_code: number; alerts: number; resolved: number }[]; generated_at: string };

export default async function ImpactPage({ searchParams }: { searchParams: Promise<{ w?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const w = sp.w && findWilaya(+sp.w) ? +sp.w : null;
  const from = sp.from && !Number.isNaN(Date.parse(sp.from)) ? sp.from : null;
  const to = sp.to && !Number.isNaN(Date.parse(sp.to)) ? sp.to : null;
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc("impact_stats", { p_wilaya: w ?? undefined, p_from: from ?? undefined, p_to: to ?? undefined });
  const s = (data ?? {}) as Impact;
  const qs = new URLSearchParams({ ...(w ? { w: String(w) } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString();
  const cards: [string, number | undefined, string][] = [
    ["نداءات معتمدة", s.alerts_approved, "راجعها مشرف"],
    ["نداءات أُغلقت بنجاح", s.alerts_resolved, "حالة «تم الحل»"],
    ["منشورات قديمة/مكررة صُفّيت", s.alerts_filtered, "لم تُعرض على المتطوعين"],
    ["ساعات تطوع مؤكدة", Number(s.volunteer_hours ?? 0), "QR أو تأكيد صاحب النداء"],
    ["مشاركات مؤكدة", s.confirmed_participations, "في نداءات"],
    ["حضور مؤكد بـ QR", s.attendance_checkins, "في أنشطة النوادي"],
    ["أشجار موثّقة", s.trees_verified, "بعد مراجعة الصورة"],
    ["نوادٍ تطوعية", s.clubs, "مسجلة"],
  ];
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-black text-slate-900"><BarChart3 className="h-7 w-7 text-brand-600" aria-hidden /> شفافية الأثر</h1>
          <p className="text-sm text-slate-600">كل رقم هنا محسوب مباشرة من سجلات المنصة — لا تقديرات ولا أرقام مضافة.</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/impact/export?${qs}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold"><Download className="h-4 w-4" aria-hidden /> CSV</a>
          <a href={`/impact/print?${qs}`} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white">نسخة للطباعة / PDF</a>
        </div>
      </div>
      <form className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm">
        <div><label htmlFor="iw" className="block text-xs font-bold">الولاية</label><select id="iw" name="w" defaultValue={w ?? ""} className="rounded-lg border border-slate-300 px-2 py-1.5"><option value="">وطني</option>{WILAYAS.map((x) => <option key={x.code} value={x.code}>{x.code} - {x.nameAr}</option>)}</select></div>
        <div><label htmlFor="if" className="block text-xs font-bold">من</label><input id="if" type="date" name="from" defaultValue={from ?? ""} className="rounded-lg border border-slate-300 px-2 py-1.5" /></div>
        <div><label htmlFor="it" className="block text-xs font-bold">إلى</label><input id="it" type="date" name="to" defaultValue={to ?? ""} className="rounded-lg border border-slate-300 px-2 py-1.5" /></div>
        <button className="rounded-lg bg-brand-600 px-3 py-1.5 font-bold text-white">تطبيق</button>
        <span className="text-xs text-slate-500">الفترة: {from ?? "البداية"} → {to ?? "الآن"} · {w ? findWilaya(w)?.nameAr : "كل الولايات"}</span>
      </form>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(([l, v, sub]) => <div key={l} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-2xl font-black tabular-nums text-slate-900">{v ?? 0}</div><div className="text-sm font-bold text-slate-700">{l}</div><div className="text-[11px] text-slate-500">{sub}</div></div>)}
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="font-black mb-3">حسب الفئة</h2>
          {Object.keys(s.by_category ?? {}).length === 0 ? <p className="text-sm text-slate-500">لا بيانات في هذه الفترة.</p> : (
            <ul className="space-y-1 text-sm">{Object.entries(s.by_category).map(([k, n]) => <li key={k} className="flex justify-between"><span>{CATEGORY_META[k as Category]?.emoji} {CATEGORY_META[k as Category]?.labelAr ?? k}</span><b>{n}</b></li>)}</ul>
          )}
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="font-black mb-3">حسب الولاية</h2>
          {(s.by_wilaya ?? []).length === 0 ? <p className="text-sm text-slate-500">لا بيانات في هذه الفترة.</p> : (
            <table className="w-full text-sm"><thead><tr className="text-right text-xs text-slate-500"><th className="p-1">الولاية</th><th className="p-1">نداءات</th><th className="p-1">محلولة</th></tr></thead>
              <tbody>{s.by_wilaya.map((r) => <tr key={r.wilaya_code} className="border-t border-slate-100"><td className="p-1"><Link href={`/impact?w=${r.wilaya_code}`} className="underline">{findWilaya(r.wilaya_code)?.nameAr}</Link></td><td className="p-1 tabular-nums">{r.alerts}</td><td className="p-1 tabular-nums">{r.resolved}</td></tr>)}</tbody></table>
          )}
        </section>
      </div>
      <p className="flex items-start gap-2 text-xs text-slate-500"><Info className="h-4 w-4 shrink-0" aria-hidden /> اكتمال البيانات: تعكس الأرقام ما سُجّل على إيثار فقط، وليس كل النشاط التطوعي في الجزائر. حُسبت في {s.generated_at ? new Date(s.generated_at).toLocaleString("ar-DZ") : "—"}.</p>
    </div>
  );
}
