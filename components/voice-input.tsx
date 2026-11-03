"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null;
};

/**
 * Speech-to-text with the browser's own recogniser (Chrome / Edge / Safari), Algerian Arabic first.
 * Free, no server, nothing recorded by Athar: the transcript is put in the text box for the person to
 * check before sending. The pipeline then rewrites Darija into MSA like any typed message.
 */
export function VoiceInput({ onText, className }: { onText: (chunk: string) => void; className?: string }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    setSupported(!!(w.SpeechRecognition ?? w.webkitSpeechRecognition));
    return () => rec.current?.stop();
  }, []);

  if (!supported) return null;

  const toggle = () => {
    if (listening) { rec.current?.stop(); return; }
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const R = (w.SpeechRecognition ?? w.webkitSpeechRecognition)!;
    const r = new R();
    r.lang = "ar-DZ"; r.continuous = true; r.interimResults = true;
    r.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) onText(res[0].transcript.trim()); else live += res[0].transcript;
      }
      setInterim(live);
    };
    r.onerror = (e) => setError(e.error === "not-allowed" ? "اسمح للمتصفح باستعمال الميكروفون" : "تعذّر التعرّف على الصوت، حاول مجدداً");
    r.onend = () => { setListening(false); setInterim(""); };
    rec.current = r; setError(null); setListening(true); r.start();
  };

  return (
    <div className={className}>
      <button type="button" onClick={toggle} aria-pressed={listening}
        className={cn("inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors",
          listening ? "border-red-500 bg-red-50 text-red-700" : "border-slate-300 bg-white text-slate-700 hover:border-brand-500 hover:text-brand-700")}>
        {listening ? <Square className="h-3.5 w-3.5 fill-current" aria-hidden /> : <Mic className="h-3.5 w-3.5" aria-hidden />}
        {listening ? "إيقاف التسجيل" : "تكلّم بالدارجة"}
        {listening && <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden />}
      </button>
      {interim && <p className="mt-1 text-[11px] text-slate-500" aria-live="polite">… {interim}</p>}
      {error && <p role="alert" className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
