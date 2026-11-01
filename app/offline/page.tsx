export const metadata = { title: "لا يوجد اتصال" };

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="text-5xl" aria-hidden>📶</div>
      <h1 className="mt-3 text-2xl font-black">لا يوجد اتصال بالإنترنت</h1>
      <p className="mt-2 text-sm text-slate-600">الصفحات العامة التي زرتها سابقاً متاحة. النداءات التي تكتبها الآن تُحفظ على جهازك وتُرسل تلقائياً عند عودة الاتصال — ولا تُعتبر مُرسلة قبل ذلك.</p>
      <p className="mt-2 text-xs text-slate-500">في حالة طوارئ اتصل بالحماية المدنية (14) أو الإسعاف.</p>
    </div>
  );
}
