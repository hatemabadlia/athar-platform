"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { enqueue } from "@/lib/outbox";

declare global {
  interface Window { turnstile?: { render: (el: HTMLElement, o: { sitekey: string; callback: (t: string) => void; "expired-callback": () => void }) => string } }
}

export function SubmitForm({ turnstileSiteKey, signedIn }: { turnstileSiteKey: string | null; signedIn: boolean }) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const widget = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);

  const renderWidget = () => {
    if (!turnstileSiteKey || !widget.current || !window.turnstile || rendered.current) return;
    rendered.current = true;
    window.turnstile.render(widget.current, { sitekey: turnstileSiteKey, callback: setToken, "expired-callback": () => setToken(null) });
  };
  useEffect(renderWidget);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/intake", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, name: name || undefined, phone: phone || undefined, consent, turnstileToken: token ?? undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 429) setError("أرسلت نداءات كثيرة خلال وقت قصير. حاول بعد 10 دقائق.");
      else if (!res.ok) setError(json.issues?.[0] ?? (json.error === "captcha_failed" ? "فشل التحقق من أنك لست روبوتاً." : "تعذّر الإرسال."));
      else setDone(true);
    } catch {
      // offline: keep it on this device and send when the connection returns (Turnstile token is re-required then if configured)
      enqueue({ text, name: name || undefined, phone: phone || undefined, consent });
      setQueued(true); setDone(true);
    }
    setBusy(false);
  };

  if (done) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
        <h2 className="mt-3 text-xl font-black text-slate-900">{queued ? "حُفظ على جهازك — لم يُرسل بعد" : "وصلنا نداؤك"}</h2>
        <p className="mt-1 text-sm text-slate-600">{queued ? "لا يوجد اتصال. سيُرسل تلقائياً عند عودة الإنترنت وستظهر رسالة تأكيد." : `سيراجعه مشرف قبل نشره. ${signedIn ? "يمكنك متابعة حالته من ملفك." : ""}`}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="outline" onClick={() => { setDone(false); setQueued(false); setText(""); setConsent(false); }}>نداء آخر</Button>
          <Link href="/" className="inline-flex h-10 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white">الخريطة</Link>
        </div>
      </div>
    );
  }

  const input = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";
  return (
    <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      {turnstileSiteKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onLoad={renderWidget} />}
      <div>
        <label htmlFor="text" className="mb-1 block text-sm font-bold text-slate-700">نص النداء *</label>
        <textarea id="text" required minLength={20} maxLength={5000} rows={7} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="مثال: نحتاجو متبرعين بالدم فصيلة A- في مستشفى ... قبل الساعة 17:00، للتواصل 05.."
          className={`${input} resize-y leading-relaxed`} />
        <div className="mt-1 text-[11px] text-slate-400">{text.length}/5000</div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="name" className="mb-1 block text-xs font-bold text-slate-700">اسم جهة الاتصال (اختياري)</label>
          <input id="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-xs font-bold text-slate-700">رقم الاتصال (اختياري)</label>
          <input id="phone" dir="ltr" inputMode="tel" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05XX XX XX XX" className={`${input} text-right`} />
        </div>
      </div>
      <p className="text-[11px] text-slate-500">رقم الهاتف لا يظهر علناً: يراه المشرفون والمتطوعون الذين ينضمون للنداء فقط.</p>
      <label className="flex items-start gap-2 text-xs text-slate-700">
        <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
        <span>أؤكد أن المعلومات صحيحة حسب علمي، وأوافق على معالجتها لغرض تنسيق المساعدة وفق <Link href="/privacy" className="underline">سياسة الخصوصية</Link>.</span>
      </label>
      {turnstileSiteKey ? <div ref={widget} /> : <p className="text-[11px] text-amber-700">وضع التطوير: التحقق من الروبوتات (Turnstile) غير مفعّل.</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={busy || !consent || text.trim().length < 20 || (!!turnstileSiteKey && !token)}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} إرسال للمراجعة
      </Button>
    </form>
  );
}
