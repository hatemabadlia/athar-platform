"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { WILAYAS, findWilaya } from "@/lib/wilayas";
import { Button } from "@/components/ui/button";
import { grantRoleByEmail, revokeRole } from "@/app/actions/admin";
import { formatDate } from "@/lib/utils";

type Role = "club_lead" | "association" | "moderator" | "djsl_admin" | "ministry_admin";
const ROLE_AR: Record<string, string> = { club_lead: "مسؤول نادٍ", association: "جمعية معتمدة", moderator: "مشرف", djsl_admin: "مدير ولائي (DJSL)", ministry_admin: "الوزارة" };

export function RolesPanel({ roles, isMinistry, adminWilayas }: { roles: { userId: string; role: string; wilayaCode: number | null; grantedAt: string; name: string }[]; isMinistry: boolean; adminWilayas: number[] }) {
  const router = useRouter();
  const grantable: Role[] = isMinistry ? ["moderator", "club_lead", "association", "djsl_admin", "ministry_admin"] : ["moderator", "club_lead", "association"];
  const wilayas = isMinistry ? WILAYAS : WILAYAS.filter((w) => adminWilayas.includes(w.code));
  const [email, setEmail] = useState(""); const [role, setRole] = useState<Role>("moderator"); const [w, setW] = useState(wilayas[0]?.code ?? 16);
  const [pending, start] = useTransition(); const [msg, setMsg] = useState<string | null>(null);
  if (!isMinistry && !adminWilayas.length) return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">إدارة الأدوار متاحة لمدير المديرية الولائية والوزارة.</div>;
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4">
      <div>
        <h2 className="font-black text-slate-900">منح دور</h2>
        <p className="text-xs text-slate-500">يجب أن يكون الشخص قد سجّل الدخول مرة واحدة على الأقل. كل منح/سحب يُسجَّل في سجل التدقيق.</p>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await grantRoleByEmail(email, role, ["moderator", "djsl_admin", "club_lead", "association"].includes(role) ? w : null); setMsg(r.ok ? "مُنح الدور" : r.error); if (r.ok) { setEmail(""); router.refresh(); } }); }}>
          <label htmlFor="re" className="sr-only">البريد</label>
          <input id="re" type="email" required dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.dz" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <label htmlFor="rr" className="sr-only">الدور</label>
          <select id="rr" value={role} onChange={(e) => setRole(e.target.value as Role)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">{grantable.map((r) => <option key={r} value={r}>{ROLE_AR[r]}</option>)}</select>
          {role !== "ministry_admin" && <><label htmlFor="rw" className="sr-only">الولاية</label><select id="rw" value={w} onChange={(e) => setW(+e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">{wilayas.map((x) => <option key={x.code} value={x.code}>{x.nameAr}</option>)}</select></>}
          <Button size="sm" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} منح</Button>
        </form>
        {msg && <p role="status" className="mt-2 text-xs font-bold">{msg}</p>}
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-right text-xs text-slate-500"><th className="p-2">الشخص</th><th className="p-2">الدور</th><th className="p-2">الولاية</th><th className="p-2">منذ</th><th /></tr></thead>
        <tbody>{roles.map((r) => (
          <tr key={r.userId + r.role} className="border-t border-slate-100">
            <td className="p-2">{r.name || <span className="text-slate-400 font-mono text-[10px]" dir="ltr">{r.userId.slice(0, 8)}</span>}</td>
            <td className="p-2">{ROLE_AR[r.role] ?? r.role}</td><td className="p-2">{r.wilayaCode ? findWilaya(r.wilayaCode)?.nameAr : "وطني"}</td><td className="p-2 text-xs">{formatDate(r.grantedAt)}</td>
            <td className="p-2"><button disabled={pending} className="text-xs font-bold text-red-700" onClick={() => start(async () => { const x = await revokeRole(r.userId, r.role as Role); setMsg(x.ok ? "سُحب" : x.error); if (x.ok) router.refresh(); })}>سحب</button></td>
          </tr>
        ))}</tbody>
      </table>
    </section>
  );
}
