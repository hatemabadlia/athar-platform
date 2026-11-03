"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share2, MessageCircle, Facebook, Link2, Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { PublicAlert } from "@/lib/types";
import { CATEGORY_META, URGENCY_META } from "@/lib/reference/meta";

const SIZE = 1080;

/** Wraps RTL text to a max width; returns lines. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > max && line) { lines.push(line); line = w; } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] += "…"; }
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}

/**
 * Draws the branded 1:1 card in the browser (canvas shapes Arabic correctly, unlike most
 * server-side SVG renderers). Only public, moderator-approved fields are used — never a phone number.
 */
function draw(canvas: HTMLCanvasElement, a: PublicAlert, url: string) {
  const ctx = canvas.getContext("2d")!;
  const font = getComputedStyle(document.body).fontFamily || "sans-serif";
  const urg = URGENCY_META[a.urgency];
  const cat = CATEGORY_META[a.category];
  canvas.width = SIZE; canvas.height = SIZE;
  ctx.direction = "rtl";

  const g = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  g.addColorStop(0, "#064e3b"); g.addColorStop(0.55, "#047857"); g.addColorStop(1, "#0f172a");
  ctx.fillStyle = g; ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath(); ctx.arc(140, 120, 260, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(980, 980, 320, 0, Math.PI * 2); ctx.fill();

  // header
  ctx.textAlign = "right"; ctx.fillStyle = "#fff";
  ctx.font = `900 64px ${font}`; ctx.fillText("إيثار", SIZE - 80, 130);
  ctx.font = `500 28px ${font}`; ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText("نداء موثّق — راجعه مشرف", SIZE - 80, 178);

  // urgency pill
  ctx.font = `800 34px ${font}`;
  const pill = `${a.urgency === "critical" ? "عاجل جداً" : a.urgency === "medium" ? "مستعجل" : "نداء"}`;
  const pw = ctx.measureText(pill).width + 60;
  ctx.fillStyle = urg.hex; roundRect(ctx, 80, 92, pw, 70, 35);
  ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(pill, 80 + pw / 2, 140);

  // card
  ctx.fillStyle = "#ffffff"; roundRect(ctx, 60, 240, SIZE - 120, 600, 48);
  ctx.textAlign = "right"; ctx.fillStyle = "#047857";
  ctx.font = `800 40px ${font}`; ctx.fillText(`${cat.emoji}  ${cat.labelAr ?? ""}${a.bloodType ? ` · فصيلة ${a.bloodType}` : ""}`, SIZE - 110, 320);

  ctx.fillStyle = "#0f172a"; ctx.font = `900 62px ${font}`;
  const title = wrap(ctx, a.title, SIZE - 220, 3);
  title.forEach((l, i) => ctx.fillText(l, SIZE - 110, 420 + i * 80));

  let y = 420 + title.length * 80 + 10;
  if (a.summary) {
    ctx.fillStyle = "#475569"; ctx.font = `500 34px ${font}`;
    wrap(ctx, a.summary, SIZE - 220, 2).forEach((l, i) => ctx.fillText(l, SIZE - 110, y + i * 50));
    y += 110;
  }
  ctx.fillStyle = "#334155"; ctx.font = `700 36px ${font}`;
  ctx.fillText(`📍 ${a.wilaya}${a.baladiya ? ` · ${a.baladiya}` : ""}`, SIZE - 110, Math.min(y + 20, 760));
  if (a.volunteersNeeded > 0) {
    const left = Math.max(0, a.volunteersNeeded - a.volunteersJoined);
    ctx.fillText(`🙋 نحتاج ${left} متطوعاً`, SIZE - 110, Math.min(y + 75, 810));
  }

  // footer CTA
  ctx.fillStyle = "#fbbf24"; roundRect(ctx, 60, 880, SIZE - 120, 130, 40);
  ctx.fillStyle = "#0f172a"; ctx.textAlign = "center"; ctx.font = `900 44px ${font}`;
  ctx.fillText("ساهم الآن عبر منصة إيثار", SIZE / 2, 940);
  ctx.font = `600 28px ${font}`; ctx.direction = "ltr";
  ctx.fillText(url.replace(/^https?:\/\//, ""), SIZE / 2, 985);
}

export function ShareCard({ alert, onClose }: { alert: PublicAlert | null; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" && alert ? `${window.location.origin}/?alert=${alert.id}` : "";
  const caption = alert
    ? `${alert.urgency === "critical" ? "🚨 عاجل: " : ""}${alert.title}\n📍 ${alert.wilaya}\nنداء موثّق على منصة إيثار — ساهم من هنا:\n${url}\n#إيثار #تطوع #الجزائر`
    : "";

  useEffect(() => {
    if (!alert || !canvas.current) return;
    const c = canvas.current;
    document.fonts.ready.then(() => draw(c, alert, url));
  }, [alert, url]);

  if (!alert) return null;

  const blob = () => new Promise<Blob | null>((res) => canvas.current?.toBlob(res, "image/png"));
  const download = async () => {
    const b = await blob(); if (!b) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = `athar-${alert.id.slice(0, 8)}.png`; a.click();
    URL.revokeObjectURL(a.href);
  };
  const share = async () => {
    const b = await blob();
    const file = b ? new File([b], "athar.png", { type: "image/png" }) : null;
    if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: caption }).catch(() => {});
    else if (navigator.share) await navigator.share({ text: caption, url }).catch(() => {});
    else download();
  };
  const copy = async () => { await navigator.clipboard.writeText(caption); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <Modal open={!!alert} onClose={onClose} title="مشاركة النداء">
      <canvas ref={canvas} className="w-full rounded-2xl border border-slate-200" aria-label={`بطاقة مشاركة: ${alert.title}`} />
      <p className="mt-2 text-[11px] text-slate-500">البطاقة لا تحتوي أي رقم هاتف: من يريد المساعدة يمرّ عبر المنصة.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button onClick={share}><Share2 className="h-4 w-4" aria-hidden /> مشاركة</Button>
        <Button variant="outline" onClick={download}><Download className="h-4 w-4" aria-hidden /> تحميل الصورة</Button>
        <a href={`https://wa.me/?text=${encodeURIComponent(caption)}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 text-sm font-bold text-white"><MessageCircle className="h-4 w-4" aria-hidden /> واتساب</a>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-3 text-sm font-bold text-white"><Facebook className="h-4 w-4" aria-hidden /> فيسبوك</a>
      </div>
      <button onClick={copy} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-600">
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Link2 className="h-4 w-4" />} {copied ? "نُسخ النص" : "نسخ النص والرابط"}
      </button>
    </Modal>
  );
}
