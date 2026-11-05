import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-black text-slate-900">{t.errors.notFound}</h1>
      <p className="mt-2 text-sm text-slate-600">{t.errors.notFoundText}</p>
      <Link href="/" className="mt-4 inline-block rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white">{t.errors.backHome}</Link>
    </div>
  );
}
