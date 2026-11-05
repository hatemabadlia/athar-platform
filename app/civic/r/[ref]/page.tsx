import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/server/guards";
import { supabaseServer } from "@/lib/supabase/server";
import { mapCivic, signedCivicUrls, type CivicPublic } from "@/lib/data/civic";
import { CivicReportView } from "@/components/civic/report-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return { title: `البلاغ ${ref} — صوّر وبلّغ` };
}

export default async function CivicReportPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref: raw } = await params;
  const ref = decodeURIComponent(raw).toUpperCase();
  if (!/^SWB-\d{4}-[0-9A-F]{5}$/.test(ref)) notFound();
  const [viewer, supabase] = await Promise.all([getViewer(), supabaseServer()]);

  const { data: pub } = await supabase.from("civic_public_reports").select("*").eq("ref", ref).maybeSingle();
  let report: CivicPublic | null = pub ? mapCivic(pub as never) : null;
  let mine = false;
  const isPublic = !!pub;
  // Not public yet: only the reporter and the wilaya's moderators can open it (RLS on civic_reports).
  const { data: own } = viewer ? await supabase.from("civic_reports").select("*").eq("ref", ref).maybeSingle() : { data: null };
  if (own) {
    mine = own.reporter_id === viewer?.id;
    // the reporter and the wilaya's moderators may see the photos even before they are made public
    if (!report) report = mapCivic({ ...own, supporters: 0, confirmations: 0 } as never);
    report = { ...report, photoPaths: own.photo_paths };
  }
  if (!report) notFound();

  const events = isPublic
    ? (await supabase.from("civic_public_events").select("id, kind, to_status, body, photo_path, actor_role, created_at").eq("report_id", report.id).order("created_at")).data ?? []
    : (await supabase.from("civic_report_events").select("id, kind, to_status, body, photo_path, actor_role, created_at").eq("report_id", report.id).eq("is_internal", false).order("created_at")).data ?? [];
  const evidence = events.map((e) => e.photo_path).filter(Boolean) as string[];
  const urls = await signedCivicUrls([...report.photoPaths, ...evidence]);
  const { data: myVotes } = viewer ? await supabase.from("civic_supports").select("kind").eq("report_id", report.id).eq("user_id", viewer.id) : { data: [] };
  const { data: dup } = report.duplicateOf ? await supabase.from("civic_public_reports").select("ref").eq("id", report.duplicateOf).maybeSingle() : { data: null };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
      <nav className="mb-3 text-xs text-slate-500"><Link href="/civic" className="underline">صوّر وبلّغ</Link> / <span dir="ltr" className="font-mono">{report.ref}</span></nav>
      <CivicReportView report={report} isPublic={isPublic} mine={mine} signedIn={!!viewer}
        photos={report.photoPaths.map((p) => urls[p]).filter(Boolean)}
        events={events.map((e) => ({ ...e, photoUrl: e.photo_path ? urls[e.photo_path] ?? null : null }))}
        myVotes={(myVotes ?? []).map((v) => v.kind)} duplicateRef={dup?.ref ?? null} />
    </div>
  );
}
