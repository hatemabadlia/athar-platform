"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gift, HandHeart, Plus, Loader2, Phone } from "lucide-react";
import { WILAYAS, findWilaya } from "@/lib/wilayas";
import { ITEM_CATEGORY_AR, suggestMatches, type Item } from "@/lib/inkind";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { postItem, cancelItem, proposeMatch, updateMatch } from "@/app/actions/modules";
import { formatPhone } from "@/lib/pipeline/text";
import { cn, timeAgo } from "@/lib/utils";

type ItemV = Item & { title: string; description: string; unit: string; baladiya: string | null; createdAt: string };
type MatchV = { id: string; offer_id: string; need_id: string; quantity: number; status: string; pickup_note: string | null; proposed_by: string; created_at: string };
const M_AR: Record<string, string> = { proposed: "مقترحة", accepted: "مقبولة", picked_up: "استُلمت", delivered: "سُلّمت ✓", cancelled: "ملغاة" };

export function DonationsClient({ items, matches, viewerId, defaultWilaya }: { items: ItemV[]; matches: MatchV[]; viewerId: string | null; defaultWilaya: number }) {
  const router = useRouter();
  const [tab, setTab] = useState<"need" | "offer">("need");
  const [w, setW] = useState<number | "all">("all");
  const [posting, setPosting] = useState<"offer" | "need" | null>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Record<string, { name: string | null; phone: string | null }>>({});
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const mine = items.filter((i) => i.ownerId === viewerId);
  const list = items.filter((i) => i.kind === tab && i.status === "open" && (w === "all" || i.wilayaCode === w));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-5">
      <section className="rounded-3xl bg-gradient-to-l from-amber-600 to-orange-800 p-6 text-white flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black">تبرعات عينية — عروض ⇄ احتياجات</h1>
          <p className="mt-1 text-sm text-white/85">ملابس، غذاء، أدوات مدرسية، نقل، استشارة مجانية… يقترح إيثار المطابقة حسب الفئة والولاية والكمية، ويكشف رقم الطرف الآخر بعد القبول فقط.</p>
        </div>
        {viewerId ? <div className="flex gap-2"><Button className="bg-white text-orange-800 hover:bg-orange-50" onClick={() => setPosting("offer")}><Gift className="h-4 w-4" aria-hidden /> أعرض</Button><Button className="bg-white text-orange-800 hover:bg-orange-50" onClick={() => setPosting("need")}><HandHeart className="h-4 w-4" aria-hidden /> أحتاج</Button></div>
          : <Link href="/login?next=/donations" className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-orange-800">سجّل الدخول للنشر</Link>}
      </section>
      {msg && <p role="status" className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold">{msg}</p>}

      {viewerId && (mine.length > 0 || matches.length > 0) && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="font-black">منشوراتي ومطابقاتي</h2>
          {mine.map((it) => {
            const sugg = it.status === "open" ? suggestMatches(it, items) : [];
            return (
              <div key={it.id} className="rounded-2xl border border-slate-200 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2"><b>{it.kind === "offer" ? "عرض" : "احتياج"}: {it.title} ({it.quantity} {it.unit})</b>
                  <span className="text-xs">{it.status === "open" ? <button className="text-red-700 underline" disabled={pending} onClick={() => start(async () => { const r = await cancelItem(it.id); setMsg(r.ok ? "أُلغي" : r.error); router.refresh(); })}>إلغاء</button> : it.status}</span></div>
                {sugg.length > 0 && (
                  <ul className="mt-2 space-y-1">{sugg.map((s) => (
                    <li key={s.item.id} className="flex flex-wrap items-center gap-2 text-xs"><span className="flex-1">{(s.item as ItemV).title} · {findWilaya(s.item.wilayaCode)?.nameAr} · {s.reasons.join("، ")}</span>
                      <button disabled={pending} className="rounded bg-orange-600 px-2 py-0.5 font-bold text-white" onClick={() => start(async () => {
                        const offer = it.kind === "offer" ? it.id : s.item.id, need = it.kind === "need" ? it.id : s.item.id;
                        const r = await proposeMatch(offer, need, Math.min(it.quantity, s.item.quantity)); setMsg(r.ok ? "أُرسل الاقتراح" : r.error); router.refresh(); })}>اقتراح مطابقة</button></li>
                  ))}</ul>
                )}
              </div>
            );
          })}
          {matches.length > 0 && (
            <ul className="space-y-2">{matches.map((m) => {
              const o = byId.get(m.offer_id), n = byId.get(m.need_id);
              const mineOffer = o?.ownerId === viewerId;
              const act = (s: "accepted" | "picked_up" | "delivered" | "cancelled") => start(async () => { const r = await updateMatch(m.id, s); if (r.ok) { setContacts((c) => ({ ...c, [m.id]: r.data! })); setMsg(`الحالة: ${M_AR[s]}`); router.refresh(); } else setMsg(r.error); });
              return (
                <li key={m.id} className="rounded-2xl bg-orange-50 p-3 text-xs space-y-1">
                  <div className="font-bold">{o?.title ?? "عرض"} ⇄ {n?.title ?? "احتياج"} · {m.quantity} · <span className="rounded bg-white px-1.5">{M_AR[m.status]}</span></div>
                  <div className="flex flex-wrap gap-2">
                    {m.status === "proposed" && m.proposed_by !== viewerId && <button disabled={pending} onClick={() => act("accepted")} className="rounded bg-emerald-600 px-2 py-0.5 font-bold text-white">قبول</button>}
                    {m.status === "accepted" && <button disabled={pending} onClick={() => act("picked_up")} className="rounded bg-sky-600 px-2 py-0.5 font-bold text-white">تم الاستلام</button>}
                    {m.status === "picked_up" && !mineOffer && <button disabled={pending} onClick={() => act("delivered")} className="rounded bg-emerald-700 px-2 py-0.5 font-bold text-white">تأكيد الوصول</button>}
                    {["proposed", "accepted"].includes(m.status) && <button disabled={pending} onClick={() => act("cancelled")} className="rounded bg-slate-200 px-2 py-0.5 font-bold">إلغاء</button>}
                  </div>
                  {contacts[m.id] && <div className="flex items-center gap-1">{contacts[m.id].name}{contacts[m.id].phone ? <a dir="ltr" href={`tel:${contacts[m.id].phone}`} className="flex items-center gap-1 font-bold text-brand-700"><Phone className="h-3 w-3" aria-hidden />{formatPhone(contacts[m.id].phone!)}</a> : " — لم يضف رقماً، نسّقوا عبر المنصة"}</div>}
                </li>
              );
            })}</ul>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-2xl bg-slate-100 p-1" role="tablist">{(["need", "offer"] as const).map((k) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("rounded-xl px-4 py-1.5 text-sm font-bold", tab === k ? "bg-white text-orange-700 shadow-sm" : "text-slate-600")}>{k === "need" ? "احتياجات" : "عروض"}</button>)}</div>
        <label htmlFor="dw" className="sr-only">الولاية</label>
        <select id="dw" value={w} onChange={(e) => setW(e.target.value === "all" ? "all" : +e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"><option value="all">كل الولايات</option>{WILAYAS.map((x) => <option key={x.code} value={x.code}>{x.nameAr}</option>)}</select>
      </div>
      {list.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">لا توجد {tab === "need" ? "احتياجات" : "عروض"} مفتوحة حالياً.</div> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{list.map((i) => (
          <article key={i.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800">{ITEM_CATEGORY_AR[i.category]}</span>
            <h3 className="mt-1 font-bold">{i.title}</h3>
            {i.description && <p className="text-xs text-slate-600 line-clamp-3">{i.description}</p>}
            <div className="mt-1 text-[11px] text-slate-500">{i.quantity} {i.unit} · {findWilaya(i.wilayaCode)?.nameAr}{i.baladiya ? ` · ${i.baladiya}` : ""} · {timeAgo(i.createdAt)}</div>
          </article>
        ))}</div>
      )}
      {posting && <PostModal kind={posting} defaultWilaya={defaultWilaya} onClose={() => setPosting(null)} onDone={(m) => { setMsg(m); router.refresh(); }} />}
    </div>
  );
}

function PostModal({ kind, defaultWilaya, onClose, onDone }: { kind: "offer" | "need"; defaultWilaya: number; onClose: () => void; onDone: (m: string) => void }) {
  const [f, setF] = useState({ category: "clothes", title: "", description: "", quantity: "1", unit: "وحدة", wilayaCode: defaultWilaya, baladiya: "" });
  const [pending, start] = useTransition(); const [err, setErr] = useState<string | null>(null);
  const input = "w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm";
  return (
    <Modal open onClose={onClose} title={kind === "offer" ? "أعرض تبرعاً عينياً" : "أنشر احتياجاً"}>
      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); start(async () => {
        const r = await postItem({ kind, category: f.category as never, title: f.title, description: f.description, quantity: +f.quantity, unit: f.unit, wilayaCode: f.wilayaCode, baladiyaName: f.baladiya || undefined });
        if (r.ok) { onDone("نُشر"); onClose(); } else setErr(r.error); }); }}>
        <div><label htmlFor="pc" className="text-xs font-bold">الفئة</label><select id="pc" className={input} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{Object.entries(ITEM_CATEGORY_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label htmlFor="pt" className="text-xs font-bold">العنوان *</label><input id="pt" required minLength={3} className={input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><label htmlFor="pd" className="text-xs font-bold">التفاصيل (بدون معلومات شخصية حساسة)</label><textarea id="pd" rows={3} maxLength={1000} className={input} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label htmlFor="pq" className="text-xs font-bold">الكمية</label><input id="pq" type="number" min={1} className={input} value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></div>
          <div><label htmlFor="pu" className="text-xs font-bold">الوحدة</label><input id="pu" className={input} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></div>
          <div><label htmlFor="pw" className="text-xs font-bold">الولاية</label><select id="pw" className={input} value={f.wilayaCode} onChange={(e) => setF({ ...f, wilayaCode: +e.target.value })}>{WILAYAS.map((x) => <option key={x.code} value={x.code}>{x.nameAr}</option>)}</select></div>
          <div><label htmlFor="pb" className="text-xs font-bold">البلدية</label><input id="pb" className={input} value={f.baladiya} onChange={(e) => setF({ ...f, baladiya: e.target.value })} /></div>
        </div>
        {err && <p role="alert" className="text-xs text-red-700">{err}</p>}
        <Button className="w-full" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />}<Plus className="h-4 w-4" aria-hidden /> نشر</Button>
      </form>
    </Modal>
  );
}
