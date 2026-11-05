import { SubmitForm } from "./submit-form";
import { publicEnv } from "@/lib/env";
import { getViewer } from "@/lib/server/guards";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() { const { t } = await getT(); return { title: t.submit.title, description: t.submit.intro.slice(0, 150) }; }

export default async function SubmitPage() {
  const [viewer, { t }] = await Promise.all([getViewer(), getT()]);
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{t.submit.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {t.submit.intro}
        </p>
      </div>
      <SubmitForm turnstileSiteKey={publicEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null} signedIn={!!viewer} />
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 space-y-1">
        <div className="font-bold text-slate-800">{t.submit.otherChannels}</div>
        <div>• {t.submit.channelsText}</div>
        <div>• {t.submit.assocText}</div>
      </div>
    </div>
  );
}
