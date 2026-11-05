import { listPublicCivic, signedCivicUrls } from "@/lib/data/civic";
import { CivicExplorer } from "@/components/civic/civic-explorer";

export const dynamic = "force-dynamic";
export const metadata = { title: "خريطة البلاغات — صوّر وبلّغ", description: "بلاغات المواطنين التي تحقق منها مشرفو الولايات: الطرق، الإنارة، النفايات، المياه…" };

export default async function CivicMapPage() {
  const reports = await listPublicCivic();
  // one thumbnail per report (only photos a moderator made public are in photoPaths)
  const urls = await signedCivicUrls(reports.map((r) => r.photoPaths[0]).filter(Boolean));
  return <CivicExplorer reports={reports} thumbs={Object.fromEntries(reports.filter((r) => r.photoPaths[0] && urls[r.photoPaths[0]]).map((r) => [r.id, urls[r.photoPaths[0]]]))} />;
}
