"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Facebook, Instagram, Twitter, MessageCircle, Music2, Play, Square, Radar, ShieldCheck, Recycle, GitMerge, AlertTriangle, ScanSearch, Terminal, ArrowDownToLine, Megaphone } from "lucide-react";
import { generateBrandedPost } from "@/lib/post-generator";
import { SCRAPE_POOL, type ScrapedPost } from "@/lib/mock-data";
import { classifyPost } from "@/lib/ai-pipeline";
import type { ClassificationResult } from "@/lib/types";
import { useAthar } from "@/lib/store";
import { cn } from "@/lib/utils";

type FeedItem = { key: string; post: ScrapedPost; phase: "incoming" | "scanning" | "done"; result?: ClassificationResult; at: string; publish?: "generating" | "posting" | "published" };
type Log = { t: string; msg: string; tone?: "ok" | "warn" | "bad" | "dim" };

const SRC = {
  facebook: { Icon: Facebook, color: "text-blue-600", bg: "bg-blue-50", label: "Facebook", host: "facebook.com/groups" },
  instagram: { Icon: Instagram, color: "text-pink-600", bg: "bg-pink-50", label: "Instagram", host: "instagram.com" },
  twitter: { Icon: Twitter, color: "text-sky-500", bg: "bg-sky-50", label: "X", host: "x.com" },
  whatsapp: { Icon: MessageCircle, color: "text-emerald-600", bg: "bg-emerald-50", label: "WhatsApp", host: "wa.me/groups" },
  tiktok: { Icon: Music2, color: "text-slate-900", bg: "bg-slate-100", label: "TikTok", host: "tiktok.com" },
};

const VERDICT = {
  fresh: { label: "موثّق ✓", en: "VERIFIED", Icon: ShieldCheck, cls: "bg-emerald-600 text-white", ring: "ring-emerald-400", bar: "bg-emerald-500" },
  recycled: { label: "منشور قديم", en: "RECYCLED", Icon: Recycle, cls: "bg-fuchsia-600 text-white", ring: "ring-fuchsia-400", bar: "bg-fuchsia-500" },
  duplicate: { label: "مكرر → دمج", en: "MERGED", Icon: GitMerge, cls: "bg-indigo-600 text-white", ring: "ring-indigo-400", bar: "bg-indigo-500" },
  "low-confidence": { label: "مشبوه 🚩", en: "FLAGGED", Icon: AlertTriangle, cls: "bg-amber-500 text-white", ring: "ring-amber-400", bar: "bg-amber-500" },
};

const now = () => new Date().toLocaleTimeString("en-GB", { hour12: false });

export function LiveMonitor({ onInspect }: { onInspect: (text: string) => void }) {
  const { alerts, addFromClassification, publishPost } = useAthar();
  const [autoPublish, setAutoPublish] = useState(true);
  const autoRef = useRef(true);
  autoRef.current = autoPublish;
  const [running, setRunning] = useState(false);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [logs, setLogs] = useState<Log[]>([{ t: now(), msg: "Athar Crawler v0.9 جاهز — اضغط «بدء الرصد»", tone: "dim" }]);
  const [counts, setCounts] = useState({ scanned: 0, fresh: 0, recycled: 0, duplicate: 0, flagged: 0, published: 0 });
  const [source, setSource] = useState<keyof typeof SRC>("facebook");
  const idx = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;

  const log = useCallback((msg: string, tone?: Log["tone"]) => setLogs((l) => [...l.slice(-40), { t: now(), msg, tone }]), []);
  const later = (fn: () => void, ms: number) => { const t = setTimeout(fn, ms); timers.current.push(t); };

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }); }, [logs]);

  const tick = useCallback(() => {
    const post = SCRAPE_POOL[idx.current % SCRAPE_POOL.length];
    idx.current += 1;
    const key = `${post.id}-${idx.current}`;
    const s = SRC[post.source];
    setSource(post.source);
    log(`GET ${s.host}/${post.group.replace(/\s/g, "_")} → 1 منشور جديد (${post.reactions} تفاعل · ${post.shares} مشاركة)`);
    setFeed((f) => [{ key, post, phase: "incoming" as const, at: now() }, ...f].slice(0, 6));

    later(() => {
      setFeed((f) => f.map((i) => (i.key === key ? { ...i, phase: "scanning" as const } : i)));
      log(`⟳ تحليل ${post.id}: تطبيع عربي → كيانات → بصمة زمنية → مقارنة مع 3,412 سجل…`, "dim");
    }, 500);

    later(() => {
      const r = classifyPost(post.text, alertsRef.current);
      setFeed((f) => f.map((i) => (i.key === key ? { ...i, phase: "done" as const, result: r } : i)));
      setCounts((c) => ({
        ...c,
        scanned: c.scanned + 1,
        fresh: c.fresh + (r.verdict === "fresh" ? 1 : 0),
        recycled: c.recycled + (r.verdict === "recycled" ? 1 : 0),
        duplicate: c.duplicate + (r.verdict === "duplicate" ? 1 : 0),
        flagged: c.flagged + (r.verdict === "low-confidence" ? 1 : 0),
      }));
      if (r.verdict === "fresh") {
        // first pass only: push into the ministry review queue (later passes would be duplicates, which is realistic)
        if (idx.current <= SCRAPE_POOL.length) addFromClassification(post.text, r);
        log(`✔ ${post.id} موثّق ${r.credibilityScore}% · ${r.wilaya?.nameAr ?? "?"} · أُرسل إلى لوحة المديرية للاعتماد`, "ok");
        if (autoRef.current) {
          // auto-generate a branded post and push it to Athar's channels
          const branded = generateBrandedPost(post.text, r, /دار الشباب|مركز الشباب/.test(post.text) ? "دار الشباب المحلية" : undefined);
          setFeed((f) => f.map((i) => (i.key === key ? { ...i, publish: "generating" as const } : i)));
          log(`✎ توليد منشور بهوية إيثار: «${branded.headline}» + ${branded.hashtags.length} وسوم + رابط ${branded.shortLink}`, "dim");
          later(() => {
            setFeed((f) => f.map((i) => (i.key === key ? { ...i, publish: "posting" as const } : i)));
            log(`↑ POST facebook.com/athar.dz · instagram @athar.dz · x @athar_dz · قناة واتساب…`, "dim");
          }, 900);
          later(() => {
            publishPost(branded, post.text, ["facebook", "instagram", "twitter", "whatsapp"]);
            setFeed((f) => f.map((i) => (i.key === key ? { ...i, publish: "published" as const } : i)));
            setCounts((c) => ({ ...c, published: c.published + 1 }));
            log(`📣 نُشر على 4 قنوات — ${branded.shortLink} يتتبع التسجيلات`, "ok");
          }, 900 + 1300);
        }
      }
      else if (r.verdict === "recycled") log(`♻ ${post.id} منشور قديم — شوهد أولاً ${r.matchedHistorical?.firstSeenAt.slice(0, 4)} (تطابق ${Math.round((r.similarity ?? 0) * 100)}%) → أُرشف`, "warn");
      else if (r.verdict === "duplicate") log(`⇄ ${post.id} مكرر — دُمج في «${r.mergedIntoAlert?.title}»`, "warn");
      else log(`⚑ ${post.id} مشبوه ${r.credibilityScore}% — أُحيل للمراجعة البشرية`, "bad");
    }, 500 + 1400);

    later(tick, 2600 + Math.random() * 900);
  }, [log, addFromClassification, publishPost]);

  const start = () => {
    if (running) return;
    setRunning(true);
    log("▶ بدء الرصد: facebook · instagram · x · whatsapp · tiktok — 14 مجموعة، 5 كلمات مفتاحية", "ok");
    later(tick, 600);
  };
  const stop = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunning(false);
    log("■ توقف الرصد", "dim");
  }, [log]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const filtered = counts.recycled + counts.duplicate + counts.flagged;

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950 text-white shadow-xl overflow-hidden">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600/20">
            <Radar className="h-5 w-5 text-brand-400" />
            {running && <span className="absolute inset-0 rounded-xl bg-brand-500/40 animate-pulse-ring" />}
          </div>
          <div>
            <div className="flex items-center gap-2 font-black">
              الرصد المباشر لوسائل التواصل
              {running && <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-blink" /> LIVE</span>}
            </div>
            <div className="text-[11px] text-slate-400">Athar Crawler · يقرأ المنشورات ويتحقق منها آنياً قبل أن تصل إلى أي متطوع</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(Object.keys(SRC) as (keyof typeof SRC)[]).map((k) => {
            const S = SRC[k];
            const active = running && source === k;
            return (
              <div key={k} title={S.label} className={cn("flex h-8 w-8 items-center justify-center rounded-lg border transition-all", active ? "border-brand-400 bg-brand-500/20 scale-110" : "border-slate-800 bg-slate-900 text-slate-500")}>
                <S.Icon className={cn("h-4 w-4", active && S.color.replace("text-slate-900", "text-white"))} />
              </div>
            );
          })}
          {running ? (
            <button onClick={stop} className="ml-2 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold hover:bg-slate-700"><Square className="h-4 w-4" /> إيقاف</button>
          ) : (
            <button onClick={start} className="ml-2 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold hover:bg-brand-500 shadow-lg shadow-brand-600/30"><Play className="h-4 w-4" /> بدء الرصد</button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr_300px]">
        {/* radar + counters */}
        <div className="border-b lg:border-b-0 lg:border-l border-slate-800 p-4 flex flex-col items-center gap-4">
          <div className="relative h-36 w-36">
            {[1, 0.7, 0.4].map((r) => (
              <div key={r} className="absolute rounded-full border border-brand-500/30" style={{ inset: `${(1 - r) * 50}%` }} />
            ))}
            <div className="absolute inset-x-0 top-1/2 h-px bg-brand-500/20" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-brand-500/20" />
            {running && (
              <div className="absolute inset-0 animate-radar" style={{ background: "conic-gradient(from 0deg, rgba(16,185,129,0.55), rgba(16,185,129,0) 70deg)", borderRadius: "9999px" }} />
            )}
            {feed.slice(0, 5).map((f, i) => {
              const ang = (i * 137) % 360, rad = 22 + (i * 17) % 40;
              const x = 50 + rad * Math.cos((ang * Math.PI) / 180), y = 50 + rad * Math.sin((ang * Math.PI) / 180);
              const c = f.phase === "done" && f.result ? VERDICT[f.result.verdict].bar : "bg-white";
              return <span key={f.key} className={cn("absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full", c, f.phase !== "done" && "animate-ping")} style={{ left: `${x}%`, top: `${y}%` }} />;
            })}
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-400 shadow-[0_0_12px_#34d399]" />
          </div>
          <div className="w-full grid grid-cols-2 gap-2 text-center">
            <Counter v={counts.scanned} l="تم فحصه" cls="text-white" />
            <Counter v={counts.fresh} l="موثّق" cls="text-emerald-400" />
            <Counter v={filtered} l="تمت تصفيته" cls="text-fuchsia-400" />
            <Counter v={counts.scanned ? Math.round((filtered / counts.scanned) * 100) : 0} l="% ضجيج" cls="text-amber-400" suffix="%" />
            <div className="col-span-2 rounded-xl bg-brand-600/15 border border-brand-500/30 px-2 py-2">
              <div className="text-xl font-black tabular-nums text-brand-300">{counts.published}</div>
              <div className="text-[10px] text-brand-200/80">📣 نُشر بهوية إيثار</div>
            </div>
          </div>
          <label className="flex w-full cursor-pointer items-center justify-between rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-bold text-slate-300">
            <span className="flex items-center gap-1.5"><Megaphone className="h-3.5 w-3.5 text-brand-400" /> نشر تلقائي للموثّق</span>
            <button type="button" role="switch" aria-checked={autoPublish} onClick={() => setAutoPublish((v) => !v)} className={cn("relative h-5 w-9 rounded-full transition-colors", autoPublish ? "bg-brand-500" : "bg-slate-700")}>
              <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", autoPublish ? "left-0.5" : "left-[18px]")} />
            </button>
          </label>
        </div>

        {/* feed */}
        <div className="p-4 min-h-[380px]">
          {feed.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-500">
              <ScanSearch className="h-10 w-10 opacity-40" />
              <p className="text-sm">اضغط «بدء الرصد» لمشاهدة الذكاء الاصطناعي يجمع المنشورات من المجموعات ويتحقق منها واحداً واحداً.</p>
            </div>
          )}
          <div className="space-y-2.5">
            {feed.map((f) => {
              const S = SRC[f.post.source];
              const v = f.result ? VERDICT[f.result.verdict] : null;
              return (
                <div key={f.key} className={cn("relative overflow-hidden rounded-2xl border bg-slate-900/80 p-3 animate-slide-in transition-all", f.phase === "done" && v ? `border-transparent ring-1 ${v.ring}` : "border-slate-800")}>
                  {f.phase === "scanning" && (
                    <>
                      <div className="absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-brand-400/25 to-transparent animate-scan pointer-events-none" />
                      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(16,185,129,0.04)_3px,rgba(16,185,129,0.04)_4px)] pointer-events-none" />
                    </>
                  )}
                  <div className="flex items-start gap-3">
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", S.bg)}><S.Icon className={cn("h-4 w-4", S.color)} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400">
                        <span className="font-bold text-slate-200">{f.post.group}</span>
                        <span>· {f.post.author}</span>
                        <span>· {f.at}</span>
                        <span className="text-slate-500">· 👍 {f.post.reactions} · ↗ {f.post.shares}</span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-100 line-clamp-2">{f.post.text}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        {f.phase !== "done" ? (
                          <div className="flex items-center gap-2 text-[11px] font-bold text-brand-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-ping" />
                            {f.phase === "incoming" ? "استقبال…" : "جارٍ التحقق: بصمة زمنية · كيانات · مقارنة أرشيفية"}
                            <span className="ml-1 h-1 w-24 overflow-hidden rounded bg-slate-800"><span className="block h-full w-1/2 bg-brand-400 animate-shimmer" style={{ backgroundImage: "linear-gradient(90deg,#34d399,#a7f3d0,#34d399)", backgroundSize: "200% 100%" }} /></span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-slate-300">{f.result!.wilaya?.nameAr ?? "ولاية غير محددة"}</span>
                            {f.result!.extractedEntities.filter((e) => e.label !== "الولاية").slice(0, 2).map((e) => (
                              <span key={e.value} className="rounded-md bg-slate-800 px-1.5 py-0.5 text-slate-300" dir="auto">{e.value}</span>
                            ))}
                            {f.result!.verdict === "recycled" && <span className="rounded-md bg-fuchsia-500/20 px-1.5 py-0.5 font-bold text-fuchsia-300">🕓 شوهد أولاً {f.result!.matchedHistorical?.firstSeenAt.slice(0, 4)}</span>}
                            {f.result!.verdict === "duplicate" && <span className="rounded-md bg-indigo-500/20 px-1.5 py-0.5 font-bold text-indigo-300">⇄ {f.result!.mergedIntoAlert?.title}</span>}
                          </div>
                        )}
                        {f.phase === "done" && f.publish && (
                          <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold", f.publish === "published" ? "bg-brand-500/20 text-brand-300 animate-fade-up" : "bg-slate-800 text-slate-300")}>
                            {f.publish === "generating" && <><span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-ping" /> توليد منشور بهوية إيثار…</>}
                            {f.publish === "posting" && <><span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-ping" /> النشر على القنوات…</>}
                            {f.publish === "published" && <><Megaphone className="h-3 w-3" /> نُشر <Facebook className="h-3 w-3" /><Instagram className="h-3 w-3" /><Twitter className="h-3 w-3" /><MessageCircle className="h-3 w-3" /></>}
                          </span>
                        )}
                        {f.phase === "done" && (
                          <button onClick={() => onInspect(f.post.text)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 px-2 py-1 text-[11px] font-bold text-slate-300 hover:bg-slate-800">
                            <ArrowDownToLine className="h-3 w-3" /> تحليل مفصّل
                          </button>
                        )}
                      </div>
                    </div>
                    {f.phase === "done" && v && (
                      <div className="shrink-0 text-center animate-stamp">
                        <div className={cn("inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-black shadow-lg", v.cls)}><v.Icon className="h-3.5 w-3.5" /> {v.label}</div>
                        <div className={cn("mt-1 text-lg font-black tabular-nums", f.result!.credibilityScore >= 60 ? "text-emerald-400" : f.result!.credibilityScore >= 30 ? "text-amber-400" : "text-fuchsia-400")}>{f.result!.credibilityScore}%</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* terminal */}
        <div className="border-t lg:border-t-0 lg:border-r border-slate-800 flex flex-col">
          <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2 text-[11px] font-bold text-slate-400"><Terminal className="h-3.5 w-3.5" /> crawler.log</div>
          <div ref={logRef} className="flex-1 max-h-[380px] overflow-y-auto p-3 font-mono text-[10.5px] leading-relaxed" dir="ltr">
            {logs.map((l, i) => (
              <div key={i} className={cn("flex gap-2", l.tone === "ok" && "text-emerald-400", l.tone === "warn" && "text-fuchsia-300", l.tone === "bad" && "text-amber-400", l.tone === "dim" && "text-slate-500", !l.tone && "text-slate-300")}>
                <span className="shrink-0 text-slate-600">[{l.t}]</span>
                <span dir="auto" className="break-words">{l.msg}</span>
              </div>
            ))}
            {running && <div className="text-brand-400 animate-blink">▌</div>}
          </div>
        </div>
      </div>
    </section>
  );
}

function Counter({ v, l, cls, suffix = "" }: { v: number; l: string; cls: string; suffix?: string }) {
  return (
    <div className="rounded-xl bg-slate-900 px-2 py-2">
      <div className={cn("text-xl font-black tabular-nums transition-all", cls)}>{v}{suffix}</div>
      <div className="text-[10px] text-slate-500">{l}</div>
    </div>
  );
}
