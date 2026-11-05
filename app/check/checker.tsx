"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck, CheckCircle2, History, AlertTriangle, HelpCircle, Loader2, ScanSearch, RotateCcw, Send,
  Link2, Search, Languages, Share2, Ban, Eye,
} from "lucide-react";
import type { CheckOutcome } from "@/lib/pipeline/check";
import type { EvidenceKind, Recommendation, VerifyStatus } from "@/lib/pipeline/verify";
import { CATEGORY_META } from "@/lib/reference/meta";
import { VoiceInput } from "@/components/voice-input";
import { cn } from "@/lib/utils";

const STATUS: Record<VerifyStatus, { icon: React.ElementType; label: string; tone: string; ring: string; chip: string }> = {
  active: { icon: ShieldCheck, label: "موثّق ونشط", tone: "from-emerald-600 to-emerald-800", ring: "ring-emerald-200", chip: "bg-emerald-100 text-emerald-800" },
  resolved: { icon: CheckCircle2, label: "سبق حلّه", tone: "from-sky-600 to-sky-800", ring: "ring-sky-200", chip: "bg-sky-100 text-sky-800" },
  recycled: { icon: History, label: "قديم أو مكرر", tone: "from-amber-500 to-amber-700", ring: "ring-amber-200", chip: "bg-amber-100 text-amber-900" },
  suspicious: { icon: AlertTriangle, label: "يستدعي الحذر", tone: "from-rose-600 to-rose-800", ring: "ring-rose-200", chip: "bg-rose-100 text-rose-800" },
  insufficient: { icon: HelpCircle, label: "أدلة غير كافية", tone: "from-slate-600 to-slate-800", ring: "ring-slate-200", chip: "bg-slate-100 text-slate-700" },
};

const RECO: Record<Recommendation, { icon: React.ElementType; label: string; cls: string }> = {
  share: { icon: Share2, label: "يمكنك مشاركته — عبر رابط إيثار", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  review: { icon: Eye, label: "تحقّق قبل المشاركة", cls: "bg-amber-50 text-amber-900 border-amber-200" },
  dont_share: { icon: Ban, label: "لا تُعِد نشره", cls: "bg-rose-50 text-rose-800 border-rose-200" },
};

const EVIDENCE: Record<EvidenceKind, { dot: string; label: string }> = {
  match: { dot: "bg-indigo-500", label: "في سجل إيثار" },
  warning: { dot: "bg-rose-500", label: "تنبيه" },
  positive: { dot: "bg-emerald-500", label: "في النص" },
  missing: { dot: "bg-slate-400", label: "ناقص" },
};

const CHECKS = ["نفهم الدارجة ونستخرج المعلومات", "نبحث في المنشورات السابقة والمغلقة", "نقارن بالنداءات النشطة في الولاية", "نبحث عن علامات تستدعي الحذر"];

export function Checker() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckOutcome | null>(null);

  const check = async () => {
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      const json = await res.json().catch(() => ({}));
      if (res.status === 429) setError("فحصت منشورات كثيرة في وقت قصير. حاول بعد دقائق.");
      else if (!res.ok) setError(json.issues?.[0] ?? "تعذّر الفحص الآن. حاول مجدداً.");
      else setResult(json as CheckOutcome);
    } catch { setError("لا يوجد اتصال بالإنترنت."); }
    setBusy(false);
  };

  const sendForReview = () => {
    try { sessionStorage.setItem("athar:prefill", text); } catch { /* storage unavailable: the form simply opens empty */ }
    window.location.href = "/submit";
  };
  const reset = () => { setResult(null); setText(""); setError(null); };

  return (
    <div className="space-y-6">
      {!result && (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <label htmlFor="post" className="mb-2 block text-sm font-bold text-slate-700">الصق المنشور كما وصلك (فيسبوك، واتساب، تيليغرام…)</label>
          <textarea id="post" value={text} onChange={(e) => setText(e.target.value)} rows={7} maxLength={5000} disabled={busy}
            placeholder="مثال: خاوتي عاجل نحتاجو متبرعين بالدم فصيلة O- فسبيطار…"
            className="w-full resize-y rounded-2xl border border-slate-300 bg-slate-50 p-4 text-base leading-relaxed focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:opacity-60" />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <VoiceInput onText={(c) => setText((p) => (p ? `${p} ${c}` : c).slice(0, 5000))} />
            <span className="text-[11px] text-slate-400">{text.length}/5000 · لا نحفظ النص الذي تفحصه</span>
          </div>
          {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
          <button onClick={check} disabled={busy || text.trim().length < 20}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-lg font-black text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <ScanSearch className="h-5 w-5" aria-hidden />}
            {busy ? "جارٍ الفحص…" : "افحص المنشور"}
          </button>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2" aria-label="ما الذي نفحصه">
            {CHECKS.map((c) => (
              <li key={c} className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold", busy ? "bg-brand-50 text-brand-800" : "bg-slate-50 text-slate-600")}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Search className="h-3.5 w-3.5" aria-hidden />} {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result && <Result r={result} text={text} onReset={reset} onReview={sendForReview} />}
    </div>
  );
}

function Result({ r, text, onReset, onReview }: { r: CheckOutcome; text: string; onReset: () => void; onReview: () => void }) {
  const s = STATUS[r.status];
  const reco = RECO[r.recommendation];
  const Icon = s.icon;
  const RIcon = reco.icon;
  const cat = r.understood.category ? CATEGORY_META[r.understood.category as keyof typeof CATEGORY_META] : null;
  const groups: EvidenceKind[] = ["match", "warning", "positive", "missing"];

  return (
    <div className="space-y-4 animate-fade-up" aria-live="polite">
      <section className={cn("relative overflow-hidden rounded-3xl bg-gradient-to-l p-6 sm:p-8 text-white shadow-xl ring-8", s.tone, s.ring)}>
        <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur"><Icon className="h-9 w-9" aria-hidden /></div>
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-wide text-white/75">النتيجة · {s.label}</div>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black leading-tight">{r.headline}</h2>
            <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-white/90">{r.advice}</p>
          </div>
        </div>
        <div className={cn("relative mt-5 inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-black", reco.cls)}>
          <RIcon className="h-4 w-4" aria-hidden /> {reco.label}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-black text-slate-900">على ماذا بنينا هذه النتيجة؟</h3>
          <p className="mt-1 text-xs text-slate-500">كل نتيجة لها أسباب يمكن التحقق منها. القِدم أو التكرار وحدهما لا يعنيان أن الطلب كاذب.</p>
          <div className="mt-4 space-y-4">
            {groups.map((g) => {
              const items = r.evidence.filter((e) => e.kind === g);
              if (!items.length) return null;
              return (
                <div key={g}>
                  <div className="mb-1.5 text-[11px] font-bold text-slate-400">{EVIDENCE[g].label}</div>
                  <ul className="space-y-1.5">
                    {items.map((e) => (
                      <li key={e.text} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", EVIDENCE[g].dot)} aria-hidden /> {e.text}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 font-black text-slate-900"><Languages className="h-4 w-4 text-brand-600" aria-hidden /> ما فهمه إيثار</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <Row k="النوع" v={cat ? `${cat.emoji} ${cat.labelAr}` : "غير واضح"} />
              <Row k="الولاية" v={r.understood.wilaya ?? "غير مذكورة"} />
              {r.understood.bloodType && <Row k="الفصيلة" v={r.understood.bloodType} />}
              {r.understood.skills.length > 0 && <Row k="مهارات مطلوبة" v={`${r.understood.skills.join("، ")}${r.understood.remote ? " · عن بُعد" : ""}`} />}
              <Row k="رقم اتصال" v={r.understood.hasPhone ? "موجود (لا نعرضه)" : "غير موجود"} />
            </dl>
            {r.understood.msa && <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">{r.understood.msa}</p>}
            {r.understood.darijaTerms.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {r.understood.darijaTerms.map((t) => <span key={t.from} className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800">{t.from} ← {t.to}</span>)}
              </div>
            )}
            <div className="mt-3 text-[11px] text-slate-400">
              {r.mode === "heuristic" ? "تحليل بالقواعد (بدون نموذج ذكاء اصطناعي)" : `تحليل ${r.mode === "claude" ? "Claude" : "Gemini"} (${r.model})`} · {(r.durationMs / 1000).toFixed(1)} ث
            </div>
          </section>

          <div className="grid gap-2">
            {r.publicAlertId && (
              <Link href={`/?alert=${r.publicAlertId}`} className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-sm font-black text-white"><Link2 className="h-4 w-4" aria-hidden /> افتح النداء الموثّق</Link>
            )}
            {r.status !== "active" && text && (
              <button onClick={onReview} className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 text-sm font-black text-white"><Send className="h-4 w-4" aria-hidden /> أرسله ليراجعه مشرف الولاية</button>
            )}
            <button onClick={onReset} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700"><RotateCcw className="h-4 w-4" aria-hidden /> افحص منشوراً آخر</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="font-semibold text-slate-900 text-end">{v}</dd></div>;
}
