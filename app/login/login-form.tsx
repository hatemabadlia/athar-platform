"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, KeyRound, Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next") ?? "/profile";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/profile";
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error") ? "انتهت صلاحية الرابط، أعد المحاولة." : null);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setBusy(false);
    if (error) setError(error.status === 429 ? "طلبات كثيرة، انتظر قليلاً ثم أعد المحاولة." : "تعذّر إرسال الرمز. تحقق من البريد.");
    else setStage("code");
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error } = await supabaseBrowser().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) { setError("الرمز غير صحيح أو منتهي الصلاحية."); return; }
    router.replace(next);
    router.refresh();
  };

  const input = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-black text-slate-900">الدخول إلى إيثار</h1>
      <p className="mt-1 text-sm text-slate-600">نرسل لك رمزاً من 6 أرقام على بريدك الإلكتروني. لا كلمة سر.</p>
      {stage === "email" ? (
        <form onSubmit={sendCode} className="mt-5 space-y-3">
          <label className="block text-xs font-bold text-slate-700" htmlFor="email">البريد الإلكتروني</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
            <input id="email" type="email" required dir="ltr" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${input} pr-9`} />
          </div>
          <Button className="w-full" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} أرسل الرمز</Button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-5 space-y-3">
          <label className="block text-xs font-bold text-slate-700" htmlFor="code">الرمز المرسل إلى <span dir="ltr">{email}</span></label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
            <input id="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required dir="ltr"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className={`${input} pr-9 tracking-[0.5em] text-center`} />
          </div>
          <Button className="w-full" disabled={busy || code.length !== 6}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} تأكيد</Button>
          <button type="button" onClick={() => setStage("email")} className="w-full text-xs text-slate-500 hover:text-slate-900">تغيير البريد</button>
        </form>
      )}
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
      <p className="mt-5 text-[11px] leading-relaxed text-slate-500">
        بالدخول توافق على <a href="/privacy" className="underline">سياسة الخصوصية</a>. الدخول برقم الهاتف (SMS) يُفعَّل عند ربط مزوّد رسائل.
      </p>
    </div>
  );
}
