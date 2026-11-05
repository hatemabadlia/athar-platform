import Link from "next/link";
import { Camera, Sparkles, MapPin, Users, ShieldCheck, Wrench, Map, ListChecks, Phone } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
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
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-amber-600 via-orange-700 to-slate-900 p-6 sm:p-10 text-white">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/20"><Wrench className="h-3.5 w-3.5" aria-hidden /> صوّر وبلّغ · خدمة مدنية من إيثار</div>
        <h1 className="mt-4 text-3xl sm:text-5xl font-black leading-tight">شفت مشكل؟ صوّرو، بلّغ عليه،<br className="hidden sm:block" /> وساهم في إصلاح منطقتك.</h1>
        <p className="mt-3 max-w-2xl text-sm sm:text-lg text-white/85">حفرة في الطريق، إنارة معطلة، نفايات، تسرب مياه… وثّقها في أقل من دقيقة. يتحقق منها مشرف ولايتك، ويدعمها جيرانك، وتتابع حلّها.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/civic/new" className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-slate-900 shadow-lg"><Camera className="h-5 w-5" aria-hidden /> بلّغ الآن</Link>
          <Link href="/civic/map" className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-5 py-3 font-bold ring-1 ring-white/25"><Map className="h-5 w-5" aria-hidden /> خريطة البلاغات</Link>
          <Link href="/civic/mine" className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-5 py-3 font-bold ring-1 ring-white/25"><ListChecks className="h-5 w-5" aria-hidden /> بلاغاتي</Link>
        </div>
        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["بلاغ مسجّل", s.total], ["تحقق منه مشرف", (s.verified ?? 0) + (s.in_progress ?? 0) + (s.resolved ?? 0)], ["حُلّ", s.resolved], ["دعم من المواطنين", s.supporters]].map(([l, v]) => (
            <div key={String(l)} className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15"><dd className="text-2xl font-black tabular-nums">{Number(v ?? 0)}</dd><dt className="text-[11px] text-white/75">{l}</dt></div>
          ))}
        </dl>
      </section>

      <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
        <Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span><b>ليست خدمة طوارئ.</b> لخطر فوري اتصل بالحماية المدنية <b dir="ltr">14</b> أو الشرطة <b dir="ltr">17</b>. إيثار ليست جهة رسمية: البلاغ يُنشر على المنصة، ولا نقول إنه وصل للبلدية إلا إذا سجّل مشرف إحالته فعلاً.</span>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-black text-slate-900">كيف تعمل؟</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, t, d }, i) => (
            <li key={t} className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-700"><Icon className="h-5 w-5" aria-hidden /></span><span className="text-xs font-black text-slate-400">{i + 1}</span></div>
              <h3 className="mt-3 font-black text-slate-900">{t}</h3><p className="mt-1 text-sm text-slate-600">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-black text-slate-900">آخر البلاغات الموثّقة</h2><Link href="/civic/map" className="text-sm font-bold text-orange-700 underline">كل البلاغات</Link></div>
        {latest.length === 0 ? <p className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">لا توجد بلاغات موثّقة بعد. كن أول من يبلّغ في حيّك.</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((r) => {
              const c = CIVIC_CATEGORIES[r.category]; const st = CIVIC_STATUS[r.status];
              return (
                <Link key={r.id} href={`/civic/r/${r.ref}`} className="rounded-3xl border border-slate-200 bg-white p-4 hover:shadow-md">
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
