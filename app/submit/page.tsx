import { SubmitForm } from "./submit-form";
import { publicEnv } from "@/lib/env";
import { getViewer } from "@/lib/server/guards";

export const metadata = { title: "أرسل نداءً", description: "أرسل نداء تطوع أو تبرع أو إغاثة ليراجعه مشرف قبل نشره على إيثار." };

export default async function SubmitPage() {
  const viewer = await getViewer();
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">أرسل نداءً</h1>
        <p className="mt-1 text-sm text-slate-600">
          اكتب النداء كما هو (بالدارجة أو العربية أو الفرنسية). يحلله إيثار ثم يراجعه مشرف ولايتك قبل ظهوره على الخريطة.
          لا تنشر معلومات صحية أو عنواناً دقيقاً لشخص دون موافقته.
        </p>
      </div>
      <SubmitForm turnstileSiteKey={publicEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null} signedIn={!!viewer} />
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 space-y-1">
        <div className="font-bold text-slate-800">قنوات أخرى</div>
        <div>• تيليغرام وواتساب للأعمال: تُفعَّل عند ربط حسابات المنظمة (انظر لوحة الإشراف ← التكاملات).</div>
        <div>• الجمعيات المعتمدة تحصل على مصداقية أولية أعلى بعد التحقق من رقم الاعتماد.</div>
      </div>
    </div>
  );
}
