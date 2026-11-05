"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { postCrisisUpdate } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

export function CrisisActions({ crisisId, signedIn, canAdmin }: { crisisId: string; signedIn: boolean; canAdmin: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [body, setBody] = useState("");
  return (
    <div className="space-y-3">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm">
        {signedIn ? (
          <Button disabled={pending} onClick={() => start(async () => {
            const { error } = await supabaseBrowser().rpc("confirm_crisis_availability", { crisis: crisisId });
            setMsg(error ? "تعذّر التسجيل" : "سُجّل توفرك. سيتواصل معك المنسقون عبر المنصة.");
          })}>أنا متاح للتطوع</Button>
        ) : <Link href={`/login?next=/crisis/${crisisId}`} className="font-bold text-brand-700 underline">سجّل الدخول لتأكيد توفرك</Link>}
        {msg && <p role="status" className="mt-2 text-xs">{msg}</p>}
      </div>
      {canAdmin && (
        <div className="rounded-3xl border border-red-200 bg-white p-4 space-y-2">
          <label htmlFor="cu" className="text-xs font-bold">نشر تحديث رسمي</label>
          <textarea id="cu" rows={2} value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm" />
          <Button size="sm" disabled={pending || body.trim().length < 3} onClick={() => start(async () => { const r = await postCrisisUpdate(crisisId, body); if (r.ok) { setBody(""); router.refresh(); } else setMsg(r.error); })}>نشر</Button>
        </div>
      )}
    </div>
  );
}
