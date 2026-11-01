"use client";

import { useEffect, useMemo, useState } from "react";
import { Facebook, Instagram, Twitter, MessageCircle, Check, Loader2, Send, Sparkles, ExternalLink, Copy, Wand2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { BrandedCard } from "./branded-card";
import { generateBrandedPost } from "@/lib/post-generator";
import { useAthar } from "@/lib/store";
import type { Channel, ClassificationResult, PublishedPost } from "@/lib/types";
import { cn, sleep } from "@/lib/utils";

export const CHANNELS: { key: Channel; label: string; handle: string; Icon: React.ElementType; color: string }[] = [
  { key: "facebook", label: "Facebook", handle: "صفحة إيثار الجزائر", Icon: Facebook, color: "text-blue-600" },
  { key: "instagram", label: "Instagram", handle: "@athar.dz", Icon: Instagram, color: "text-pink-600" },
  { key: "twitter", label: "X", handle: "@athar_dz", Icon: Twitter, color: "text-slate-900" },
  { key: "whatsapp", label: "قناة واتساب", handle: "إيثار — نداءات موثّقة", Icon: MessageCircle, color: "text-emerald-600" },
];

type Stage = "idle" | "generating" | "queued" | "uploading" | "done";

export function PublishModal({ open, onClose, text, result, hub }: { open: boolean; onClose: () => void; text: string; result: ClassificationResult | null; hub?: string }) {
  const { publishPost } = useAthar();
  const base = useMemo(() => (result ? generateBrandedPost(text, result, hub) : null), [text, result, hub]);
  const [caption, setCaption] = useState("");
  const [selected, setSelected] = useState<Channel[]>(["facebook", "instagram", "twitter", "whatsapp"]);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState<Partial<Record<Channel, "queued" | "uploading" | "done">>>({});
  const [published, setPublished] = useState<PublishedPost | null>(null);
  const [genStep, setGenStep] = useState(0);

  // "AI generation" typing effect when opened
  useEffect(() => {
    if (!open || !base) return;
    let cancelled = false;
    setStage("generating"); setCaption(""); setPublished(null); setProgress({}); setGenStep(0);
    (async () => {
      const steps = ["قراءة الهوية البصرية لإيثار…", "صياغة عنوان جذاب ومختصر…", "إدراج التفاصيل الموثّقة (مكان، وقت، هاتف)…", "توليد الوسوم ورابط التتبع…"];
      for (let i = 0; i < steps.length; i++) { if (cancelled) return; setGenStep(i + 1); await sleep(380); }
      const full = base.caption;
      for (let i = 0; i <= full.length; i += 6) { if (cancelled) return; setCaption(full.slice(0, i)); await sleep(8); }
      if (!cancelled) { setCaption(full); setStage("idle"); }
    })();
    return () => { cancelled = true; };
  }, [open, base]);

  if (!base || !result) return null;

  const toggle = (c: Channel) => setSelected((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));

  const publish = async () => {
    setStage("uploading");
    const init: typeof progress = {};
    selected.forEach((c) => (init[c] = "queued"));
    setProgress(init);
    for (const c of selected) {
      setProgress((p) => ({ ...p, [c]: "uploading" }));
      await sleep(650 + Math.random() * 500);
      setProgress((p) => ({ ...p, [c]: "done" }));
    }
    const p = publishPost({ ...base, caption }, text, selected);
    setPublished(p);
    setStage("done");
  };

  const GEN_STEPS = ["قراءة الهوية البصرية لإيثار…", "صياغة عنوان جذاب ومختصر…", "إدراج التفاصيل الموثّقة (مكان، وقت، هاتف)…", "توليد الوسوم ورابط التتبع…"];

  return (
    <Modal open={open} onClose={onClose} title="📣 توليد منشور بهوية إيثار ونشره" className="sm:max-w-4xl">
      <div className="grid md:grid-cols-[320px_1fr] gap-5">
        {/* visual */}
        <div className="space-y-3">
          <BrandedCard post={{ ...base, caption }} />
          <div className="text-[11px] text-slate-500 text-center">معاينة المرئي 1:1 — يُنشأ تلقائياً بألوان الفئة وشعار إيثار</div>
        </div>

        {/* caption + channels */}
        <div className="space-y-4">
          {stage === "generating" && (
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-3 space-y-1.5">
              {GEN_STEPS.map((s, i) => (
                <div key={s} className={cn("flex items-center gap-2 text-xs font-semibold", i < genStep ? "text-brand-800" : "text-slate-400")}>
                  {i < genStep - 1 || (i === genStep - 1 && caption.length > 0) ? <Check className="h-3.5 w-3.5 text-brand-600" /> : i === genStep - 1 ? <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" /> : <span className="h-3.5 w-3.5 rounded-full border border-slate-300" />}
                  {s}
                </div>
              ))}
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><Wand2 className="h-4 w-4 text-brand-600" /> النص المولّد (قابل للتعديل)</label>
              <button onClick={() => navigator.clipboard?.writeText(caption)} className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800"><Copy className="h-3 w-3" /> نسخ</button>
            </div>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={11} disabled={stage !== "idle"}
              className="w-full resize-none rounded-2xl border border-slate-300 bg-slate-50 p-3 text-sm leading-relaxed focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-80" />
            <div className="mt-1 flex flex-wrap gap-1">
              {base.hashtags.map((h) => <span key={h} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-brand-700">#{h}</span>)}
            </div>
          </div>

          <div>
            <div className="text-sm font-bold text-slate-800 mb-2">قنوات إيثار الرسمية</div>
            <div className="grid grid-cols-2 gap-2">
              {CHANNELS.map((c) => {
                const on = selected.includes(c.key);
                const st = progress[c.key];
                const url = published?.channels[c.key];
                return (
                  <button key={c.key} type="button" disabled={stage !== "idle"} onClick={() => toggle(c.key)}
                    className={cn("flex items-center gap-2.5 rounded-2xl border p-2.5 text-right transition-all", on ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white opacity-60")}>
                    <c.Icon className={cn("h-5 w-5 shrink-0", c.color)} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900">{c.label}</div>
                      <div className="truncate text-[10px] text-slate-500">{c.handle}</div>
                    </div>
                    {st === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-brand-600" />}
                    {st === "queued" && <span className="text-[10px] text-slate-400">في الانتظار</span>}
                    {st === "done" && (url ? <a href={url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-700"><Check className="h-3.5 w-3.5" /> نُشر <ExternalLink className="h-3 w-3" /></a> : <Check className="h-4 w-4 text-emerald-600" />)}
                    {!st && on && <Check className="h-4 w-4 text-brand-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {stage === "done" && published ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 animate-fade-up">
              <div className="font-black text-emerald-800 flex items-center gap-2"><Sparkles className="h-4 w-4" /> تم النشر على {selected.length} قنوات</div>
              <p className="mt-1 text-xs text-emerald-900">رابط التتبع <b dir="ltr">{published.shortLink}</b> يقيس النقرات والتسجيلات لكل قناة. الوصول المتوقع خلال الساعة الأولى: <b>{published.reach.toLocaleString("en-US")}</b> شخص.</p>
              <Button className="mt-3 w-full" variant="secondary" onClick={onClose}>إغلاق</Button>
            </div>
          ) : (
            <Button size="lg" className="w-full" onClick={publish} disabled={stage !== "idle" || selected.length === 0}>
              {stage === "uploading" ? <><Loader2 className="h-4 w-4 animate-spin" /> جارٍ النشر…</> : <><Send className="h-4 w-4" /> نشر الآن على {selected.length} قنوات</>}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
