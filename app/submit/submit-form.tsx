"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { enqueue } from "@/lib/outbox";
import { useT } from "@/lib/i18n/client";
import { VoiceInput } from "@/components/voice-input";

declare global {
  interface Window { turnstile?: { render: (el: HTMLElement, o: { sitekey: string; callback: (t: string) => void; "expired-callback": () => void }) => string } }
}

export function SubmitForm({ turnstileSiteKey, signedIn }: { turnstileSiteKey: string | null; signedIn: boolean }) {
  const t = useT();
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
  // Text handed over from the "Is this post real?" page.
  useEffect(() => {
    try {
      const pre = sessionStorage.getItem("athar:prefill");
      if (pre) { setText(pre.slice(0, 5000)); sessionStorage.removeItem("athar:prefill"); }
    } catch { /* storage unavailable */ }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/intake", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, name: name || undefined, phone: phone || undefined, consent, turnstileToken: token ?? undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 429) setError(t.submit.errRate);
      else if (!res.ok) setError(json.issues?.[0] ?? (json.error === "captcha_failed" ? t.submit.errCaptcha : t.submit.errGeneric));
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
        <h2 className="mt-3 text-xl font-black text-slate-900">{queued ? t.submit.queued : t.submit.received}</h2>
        <p className="mt-1 text-sm text-slate-600">{queued ? t.submit.queuedText : `${t.submit.receivedText} ${signedIn ? t.submit.trackInProfile : ""}`}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="outline" onClick={() => { setDone(false); setQueued(false); setText(""); setConsent(false); }}>{t.submit.another}</Button>
          <Link href="/" className="inline-flex h-10 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white">{t.submit.map}</Link>
        </div>
      </div>
    );
  }

  const input = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";
  return (
    <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      {turnstileSiteKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onLoad={renderWidget} />}
      <div>
        <label htmlFor="text" className="mb-1 block text-sm font-bold text-slate-700">{t.submit.text}</label>
        <textarea id="text" required minLength={20} maxLength={5000} rows={7} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={t.submit.placeholder}
          className={`${input} resize-y leading-relaxed`} />
        <div className="mt-1 flex items-start justify-between gap-2">
          <VoiceInput onText={(c) => setText((p) => (p ? `${p} ${c}` : c).slice(0, 5000))} />
          <div className="text-[11px] text-slate-400">{text.length}/5000</div>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="name" className="mb-1 block text-xs font-bold text-slate-700">{t.submit.name}</label>
          <input id="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-xs font-bold text-slate-700">{t.submit.phone}</label>
          <input id="phone" dir="ltr" inputMode="tel" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05XX XX XX XX" className={`${input} text-start`} />
        </div>
      </div>
      <p className="text-[11px] text-slate-500">{t.submit.phoneNote}</p>
      <label className="flex items-start gap-2 text-xs text-slate-700">
        <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
        <span>{t.submit.consent} <Link href="/privacy" className="underline">{t.submit.privacyLink}</Link>.</span>
      </label>
      {turnstileSiteKey ? <div ref={widget} /> : <p className="text-[11px] text-amber-700">{t.submit.devCaptcha}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={busy || !consent || text.trim().length < 20 || (!!turnstileSiteKey && !token)}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t.submit.send}
      </Button>
    </form>
  );
}
