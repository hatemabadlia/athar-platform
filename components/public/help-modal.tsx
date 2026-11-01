"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Phone, MapPin, Clock, HeartHandshake, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { PublicAlert } from "@/lib/types";
import { CATEGORY_META, URGENCY_META } from "@/lib/reference/meta";
import { joinAlert } from "@/app/actions/alerts";
import { timeAgo } from "@/lib/utils";
import { formatPhone } from "@/lib/pipeline/text";

export function HelpModal({ alert, onClose, signedIn }: { alert: PublicAlert | null; onClose: () => void; signedIn: boolean }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ phone: string | null; name: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);

  if (!alert) return null;
  const cat = CATEGORY_META[alert.category];
  const urg = URGENCY_META[alert.urgency];
  const remaining = alert.volunteersNeeded > 0 ? Math.max(0, alert.volunteersNeeded - alert.volunteersJoined) : null;

  const close = () => { setResult(null); setError(null); setAgree(false); onClose(); };
  const join = () => start(async () => {
    setError(null);
    const r = await joinAlert(alert.id);
    if (r.ok) setResult(r.data ?? { phone: null, name: null }); else setError(r.error);
  });

  return (
    <Modal open={!!alert} onClose={close} title="🙋 أستطيع المساعدة">
      <div className="rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cat.bg} ${cat.color}`}>{cat.emoji} {cat.labelAr}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${urg.bg} ${urg.color}`}>{urg.labelAr}</span>
        </div>
        <div className="font-bold text-slate-900">{alert.title}</div>
        {alert.summary && <p className="mt-1 text-sm text-slate-600">{alert.summary}</p>}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden /> {alert.wilaya}{alert.baladiya ? ` · ${alert.baladiya}` : ""}</span>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden /> {timeAgo(alert.createdAt)}</span>
          {remaining != null && <span className="flex items-center gap-1"><HeartHandshake className="h-3.5 w-3.5" aria-hidden /> نحتاج {remaining}</span>}
        </div>
      </div>

      {result || alert.joinedByMe ? (
        <div className="text-center py-5 animate-fade-up">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100"><CheckCircle2 className="h-8 w-8 text-emerald-600" /></div>
          <h4 className="text-lg font-black text-slate-900">تم تسجيل مشاركتك</h4>
          <p className="mt-1 text-sm text-slate-600">اتصل بالجهة صاحبة النداء للتنسيق. تُحتسب النقاط بعد تأكيد حضورك (QR أو تأكيد صاحب النداء).</p>
          {result && (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-right text-sm">
              {result.name && <div className="font-bold text-slate-800 mb-1">{result.name}</div>}
              {result.phone
                ? <a href={`tel:${result.phone}`} className="flex items-center gap-2 font-bold text-brand-700" dir="ltr"><Phone className="h-4 w-4" />{formatPhone(result.phone)}</a>
                : <div className="text-slate-500">لا يوجد رقم اتصال لهذا النداء — تابع التحديثات على المنصة.</div>}
            </div>
          )}
          <Button className="mt-5 w-full" onClick={close}>إغلاق</Button>
        </div>
      ) : !signedIn ? (
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <p>للمشاركة سجّل الدخول أولاً — هكذا يرى صاحب النداء المتطوعين الحقيقيين فقط ويمكن تأكيد حضورك.</p>
          <Link href={`/login?next=${encodeURIComponent("/")}`} className="block rounded-xl bg-brand-600 py-2.5 text-center font-bold text-white">تسجيل الدخول</Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {alert.category === "blood" && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              🩸 أهلية التبرع (الفاصل بين التبرعات، السن، الوزن، الحالة الصحية) يحددها مركز حقن الدم — اتبع تعليماته.
            </div>
          )}
          <label className="flex items-start gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
            <span>أوافق على أن يرى صاحب النداء والمشرفون اسمي ومشاركتي لتنسيق المساعدة (<Link href="/privacy" className="underline">الخصوصية</Link>).</span>
          </label>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
          <Button size="lg" className="w-full" onClick={join} disabled={!agree || pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} تأكيد المشاركة وإظهار رقم الاتصال
          </Button>
        </div>
      )}
    </Modal>
  );
}
