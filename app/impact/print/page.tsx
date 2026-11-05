import { supabaseServer } from "@/lib/supabase/server";
import { findWilaya } from "@/lib/wilayas";
import { PrintButton } from "@/app/certificates/[id]/print-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "تقرير الأثر", robots: { index: false } };

export default async function ImpactPrint({ searchParams }: { searchParams: Promise<{ w?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const w = sp.w && findWilaya(+sp.w) ? +sp.w : null;
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc("impact_stats", { p_wilaya: w ?? undefined, p_from: sp.from || undefined, p_to: sp.to || undefined });
  const s = (data ?? {}) as Record<string, unknown> & { by_wilaya?: { wilaya_code: number; alerts: number; resolved: number }[] };
  const rows: [string, unknown][] = [["نداءات معتمدة", s.alerts_approved], ["نداءات محلولة", s.alerts_resolved], ["منشورات مصفّاة", s.alerts_filtered],
    ["ساعات تطوع مؤكدة", s.volunteer_hours], ["مشاركات مؤكدة", s.confirmed_participations], ["حضور QR", s.attendance_checkins], ["أشجار موثّقة", s.trees_verified], ["نوادٍ", s.clubs], ["تقارير معتمدة", s.reports_approved]];
  return (
    <div className="mx-auto max-w-3xl p-8 text-sm">
      <div className="mb-4 print:hidden"><PrintButton /></div>
      <h1 className="text-2xl font-black">تقرير الأثر — منصة إيثار</h1>
      <p className="text-slate-600">النطاق: {w ? findWilaya(w)?.nameAr : "وطني"} · الفترة: {sp.from || "البداية"} → {sp.to || "الآن"} · أُنشئ: {new Date(String(s.generated_at ?? Date.now())).toLocaleString("ar-DZ")}</p>
      <table className="mt-4 w-full border border-slate-300"><tbody>{rows.map(([l, v]) => <tr key={l} className="border-t border-slate-300"><td className="p-2 font-bold">{l}</td><td className="p-2 tabular-nums">{String(v ?? 0)}</td></tr>)}</tbody></table>
      {(s.by_wilaya ?? []).length > 0 && (
        <table className="mt-4 w-full border border-slate-300"><thead><tr><th className="p-2 text-right">الولاية</th><th className="p-2 text-right">نداءات</th><th className="p-2 text-right">محلولة</th></tr></thead>
          <tbody>{s.by_wilaya!.map((r) => <tr key={r.wilaya_code} className="border-t border-slate-300"><td className="p-2">{findWilaya(r.wilaya_code)?.nameAr}</td><td className="p-2">{r.alerts}</td><td className="p-2">{r.resolved}</td></tr>)}</tbody></table>
      )}
      <p className="mt-4 text-xs text-slate-500">الأرقام محسوبة من سجلات المنصة فقط وتشمل ما سُجّل عليها.</p>
    </div>
  );
}
