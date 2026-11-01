import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getViewer } from "@/lib/server/guards";
import { formatDate } from "@/lib/utils";
import { MarkRead } from "./mark-read";

export const dynamic = "force-dynamic";
export const metadata = { title: "الإشعارات" };

export default async function NotificationsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/notifications");
  const supabase = await supabaseServer();
  const { data } = await supabase.from("notifications").select("id, kind, title, body, link, read_at, created_at").order("created_at", { ascending: false }).limit(100);
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-black">الإشعارات</h1>{(data ?? []).some((n) => !n.read_at) && <MarkRead />}</div>
      {(data ?? []).length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">لا إشعارات.</p> : (
        <ul className="space-y-2">{data!.map((n) => (
          <li key={n.id} className={`rounded-2xl border p-3 text-sm ${n.read_at ? "border-slate-200 bg-white" : "border-brand-200 bg-brand-50"}`}>
            <div className="font-bold">{n.title}</div>{n.body && <p className="text-slate-700">{n.body}</p>}
            <div className="mt-1 flex justify-between text-[11px] text-slate-500"><span>{formatDate(n.created_at)}</span>{n.link?.startsWith("/") && <Link href={n.link} className="font-bold underline">فتح</Link>}</div>
          </li>
        ))}</ul>
      )}
    </div>
  );
}
