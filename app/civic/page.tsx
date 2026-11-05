import Link from "next/link";
import { Camera, Sparkles, MapPin, Users, ShieldCheck, Map, Phone } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { Masthead, btnOnInk, btnGhostInk } from "@/components/ui/masthead";
import { listPublicCivic } from "@/lib/data/civic";
import { CIVIC_CATEGORIES, CIVIC_STATUS } from "@/lib/civic";

export const dynamic = "force-dynamic";
export const metadata = { title: "صوّر وبلّغ", description: "شفت مشكل؟ صوّرو، بلّغ عليه، وساهم في إصلاح منطقتك." };

export default async function CivicLanding() {
  const supabase = await supabaseServer();
  const [{ data: stats }, latest] = await Promise.all([supabase.rpc("civic_stats", {}), listPublicCivic(6)]);
  const s = (stats ?? {}) as { total?: number; resolved?: number; in_progress?: number; supporters?: number; verified?: number };
  const steps = [
    { icon: Camera, t: "صوّر", d: "صورة واحدة تكفي. نحذف بيانات الصورة قبل الرفع." },
    { icon: Sparkles, t: "الذكاء الاصطناعي يقترح", d: "الفئة والخطورة من الصورة — وأنت تعدّل بحرية." },
    { icon: MapPin, t: "حدّد المكان", d: "GPS أو على الخريطة. ونكشف البلاغات المكررة قربك." },
    { icon: ShieldCheck, t: "مشرف يتحقق", d: "لا شيء يُنشر قبل مراجعة بشرية. ثم تتابع الحلّ خطوة بخطوة." },
  ];
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
      <Masthead tone="ink" accent="clay" eyebrow="صوّر وبلّغ · خدمة مدنية من إيثار"
        title={<>شفت مشكل؟ صوّرو، بلّغ عليه،<br className="hidden sm:block" /> وساهم في إصلاح منطقتك.</>}
        lede="حفرة في الطريق، إنارة معطلة، نفايات، تسرب مياه… وثّقها في أقل من دقيقة. يتحقق منها مشرف ولايتك، ويدعمها جيرانك، وتتابع حلّها خطوة بخطوة."
        actions={<>
          <Link href="/civic/new" className={btnOnInk}><Camera className="h-5 w-5" aria-hidden /> بلّغ الآن</Link>
          <Link href="/civic/map" className={btnGhostInk}><Map className="h-5 w-5" aria-hidden /> خريطة البلاغات</Link>
          <Link href="/civic/mine" className="text-sm font-medium text-paper/80 underline decoration-white/30 underline-offset-4 hover:text-paper">بلاغاتي</Link>
        </>}
        aside={
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10">
            {[["بلاغ مسجّل", s.total], ["تحقق منه مشرف", (s.verified ?? 0) + (s.in_progress ?? 0) + (s.resolved ?? 0)], ["حُلّ", s.resolved], ["دعم من المواطنين", s.supporters]].map(([l, v]) => (
              <div key={String(l)} className="bg-ink/80 px-5 py-4"><dd className="font-display text-3xl tabular-nums">{Number(v ?? 0)}</dd><dt className="mt-1 text-xs text-paper/60">{l}</dt></div>
            ))}
          </dl>
        } />

      <div className="flex items-start gap-2 border-s-2 border-clay-500 bg-clay-50 px-4 py-3 text-xs leading-6 text-clay-800">
        <Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span><b>ليست خدمة طوارئ.</b> لخطر فوري اتصل بالحماية المدنية <b dir="ltr">14</b> أو الشرطة <b dir="ltr">17</b>. إيثار ليست جهة رسمية: البلاغ يُنشر على المنصة، ولا نقول إنه وصل للبلدية إلا إذا سجّل مشرف إحالته فعلاً.</span>
      </div>

      <section>
        <p className="eyebrow">كيف تعمل</p>
        <ol className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, t, d }, i) => (
            <li key={t}>
              <div className="flex items-center gap-3"><span className="font-display text-sm tabular-nums text-clay-600">0{i + 1}</span><span className="h-px flex-1 bg-slate-300" aria-hidden /><Icon className="h-4 w-4 text-slate-400" aria-hidden /></div>
              <h3 className="mt-3 text-base font-semibold text-ink">{t}</h3><p className="mt-1 text-sm leading-7 text-slate-600">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-3 border-b border-slate-200 pb-3"><h2 className="font-display text-2xl text-ink">آخر البلاغات الموثّقة</h2><Link href="/civic/map" className="link text-sm font-semibold text-ink">كل البلاغات ←</Link></div>
        {latest.length === 0 ? <p className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">لا توجد بلاغات موثّقة بعد. كن أول من يبلّغ في حيّك.</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((r) => {
              const c = CIVIC_CATEGORIES[r.category]; const st = CIVIC_STATUS[r.status];
              return (
                <Link key={r.id} href={`/civic/r/${r.ref}`} className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-400">
                  <div className="flex items-center justify-between text-xs"><span className="font-bold">{c.emoji} {c.ar}</span><span className="font-bold" style={{ color: st.color }}>{st.ar}</span></div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-700">{r.description}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500"><span>{r.wilaya}</span><span className="flex items-center gap-1"><Users className="h-3 w-3" aria-hidden />{r.supporters}</span></div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
