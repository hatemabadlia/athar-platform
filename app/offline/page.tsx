import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Offline · إيثار" };

export default async function OfflinePage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="text-5xl" aria-hidden>📶</div>
      <h1 className="mt-3 text-2xl font-black">{t.offline.title}</h1>
      <p className="mt-2 text-sm text-slate-600">{t.offline.text}</p>
      <p className="mt-2 text-xs text-slate-500">{t.offline.emergency}</p>
    </div>
  );
}
