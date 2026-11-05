import { redirect } from "next/navigation";
import { getViewer } from "@/lib/server/guards";
import { getMyProfile } from "@/lib/data/profile";
import { findWilaya } from "@/lib/wilayas";
import { ReportWizard } from "@/components/civic/report-wizard";

export const dynamic = "force-dynamic";
export const metadata = { title: "بلاغ جديد — صوّر وبلّغ" };

/** Sign-in is required: it lets us notify you of progress and limits spam. Your identity is never public. */
export default async function NewCivicReport() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/civic/new");
  const profile = await getMyProfile();
  const w = profile?.wilayaCode ? findWilaya(profile.wilayaCode) : null;
  return (
    <div className="px-4 sm:px-6 py-6">
      <header className="mx-auto mb-4 max-w-3xl">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">صوّر وبلّغ</h1>
        <p className="text-sm text-slate-600">أقل من دقيقة: صورة، فئة، مكان. هويتك تبقى خاصة.</p>
      </header>
      <ReportWizard defaultCenter={w ? { lat: w.lat, lng: w.lng } : { lat: 36.75, lng: 3.06 }} />
    </div>
  );
}
