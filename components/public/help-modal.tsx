"use client";

import { useState } from "react";
import { CheckCircle2, Phone, MapPin, Clock, HeartHandshake } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { Alert } from "@/lib/types";
import { CATEGORY_META, URGENCY_META } from "@/lib/mock-data";
import { useAthar } from "@/lib/store";
import { timeAgo } from "@/lib/utils";

export function HelpModal({ alert, onClose }: { alert: Alert | null; onClose: () => void }) {
  const { volunteer, joinedIds } = useAthar();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);

  if (!alert) return null;
  const cat = CATEGORY_META[alert.category];
  const urg = URGENCY_META[alert.urgency];
  const already = joinedIds.includes(alert.id);
  const remaining = Math.max(0, alert.volunteersNeeded - alert.volunteersJoined);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    volunteer(alert.id, name, phone);
    setDone(true);
  };

  const close = () => {
    setDone(false);
    setName("");
    setPhone("");
    onClose();
  };

  return (
    <Modal open={!!alert} onClose={close} title="🙋 أستطيع المساعدة">
      {done || already ? (
        <div className="text-center py-6 animate-fade-up">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <h4 className="text-xl font-black text-slate-900">شكراً لك! تم تسجيلك</h4>
          <p className="mt-2 text-sm text-slate-600">
            تم إرسال بياناتك إلى جهة الاتصال. المتبقي الآن:{" "}
            <b className="text-brand-700">{remaining} متطوع</b>
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
            ⭐ +{alert.urgency === "critical" ? 100 : alert.urgency === "medium" ? 60 : 40} نقطة أثر
            {alert.category === "blood" && " · شارة 🩸 بطل الدم"}
            {alert.urgency === "critical" && " · شارة ⚡ مستجيب سريع"}
          </div>
          {alert.hub && <div className="mt-2 text-xs text-indigo-700 font-semibold">🏛️ نقطة التجمع: {alert.hub}</div>}
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-right text-sm">
            <div className="font-bold text-slate-800 mb-1">{alert.contactName}</div>
            <div className="flex items-center gap-2 text-slate-600" dir="ltr">
              <Phone className="h-4 w-4" /> {alert.contactPhone}
            </div>
          </div>
          <Button className="mt-5 w-full" onClick={close}>إغلاق</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cat.bg} ${cat.color}`}>
                {cat.emoji} {cat.labelAr}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${urg.bg} ${urg.color}`}>
                {urg.labelAr}
              </span>
            </div>
            <div className="font-bold text-slate-900">{alert.title}</div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {alert.wilaya} · {alert.baladiya}</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {timeAgo(alert.postedAt)}</span>
              <span className="flex items-center gap-1"><HeartHandshake className="h-3.5 w-3.5" /> نحتاج {remaining} متطوع</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">الاسم الكامل</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: ياسين بن عمر"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">رقم الهاتف</label>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05 XX XX XX XX"
              dir="ltr"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-right focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>
          {alert.category === "blood" && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
              🩸 تأكد من أن فصيلة دمك متوافقة وأنك لم تتبرع خلال آخر 3 أشهر.
            </div>
          )}
          <Button type="submit" size="lg" className="w-full">تأكيد المشاركة</Button>
        </form>
      )}
    </Modal>
  );
}
