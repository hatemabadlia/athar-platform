"use client";

import { usePathname } from "next/navigation";
import { useLocale, useT } from "@/lib/i18n/client";

/** Pages fully translated into French. Others stay Arabic/RTL in French mode, with a notice. */
const TRANSLATED = [/^\/$/, /^\/submit$/, /^\/login$/, /^\/offline$/, /^\/privacy$/];

export function LocaleScope({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const t = useT();
  const path = usePathname();
  if (locale === "ar" || TRANSLATED.some((r) => r.test(path))) return <>{children}</>;
  return (
    <>
      <p className="mx-auto mt-3 max-w-7xl px-4 text-xs text-slate-500" lang="fr" dir="ltr">Cette page n&apos;est pas encore traduite en français. {t.adminOnlyArabic}</p>
      <div lang="ar" dir="rtl">{children}</div>
    </>
  );
}
