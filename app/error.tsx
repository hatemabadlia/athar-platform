"use client";

import { useEffect } from "react";
import { useT } from "@/lib/i18n/client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => { console.error(error.digest ?? error.message); }, [error]);
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center" role="alert">
      <h1 className="text-2xl font-black text-slate-900">{t.errors.title}</h1>
      <p className="mt-2 text-sm text-slate-600">{t.errors.text}{error.digest ? ` (${error.digest})` : ""}.</p>
      <button onClick={reset} className="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white">{t.errors.retry}</button>
    </div>
  );
}
