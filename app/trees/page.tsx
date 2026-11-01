import { getViewer } from "@/lib/server/guards";
import { getMyProfile } from "@/lib/data/profile";
import { listTrees } from "@/lib/data/trees";
import { TreesClient } from "@/components/trees/trees-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "غابة إيثار" };

export default async function TreesPage() {
  const viewer = await getViewer();
  const [trees, profile] = await Promise.all([listTrees(viewer?.id ?? null), viewer ? getMyProfile() : Promise.resolve(null)]);
  return <TreesClient trees={trees} viewerId={viewer?.id ?? null} defaultWilaya={profile?.wilayaCode ?? 16} />;
}
