"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error.digest ?? error.message); }, [error]);
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center" role="alert">
      <h1 className="text-2xl font-black text-slate-900">حدث خطأ غير متوقع</h1>
      <p className="mt-2 text-sm text-slate-600">لم تُفقد أي بيانات أرسلتها سابقاً. أعد المحاولة، وإن تكرر الخطأ أخبر المشرفين{error.digest ? ` (الرمز: ${error.digest})` : ""}.</p>
      <button onClick={reset} className="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white">إعادة المحاولة</button>
    </div>
  );
}
