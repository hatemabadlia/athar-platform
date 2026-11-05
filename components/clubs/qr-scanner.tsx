"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";

/** Camera QR scanner (html5-qrcode). Calls onScan once per decoded token. */
export function QrScanner({ onScan, paused }: { onScan: (text: string) => void; paused: boolean }) {
  const id = useRef(`qr-${Math.random().toString(36).slice(2)}`);
  const [state, setState] = useState<"starting" | "on" | "error">("starting");
  const last = useRef<{ t: string; at: number } | null>(null);
  const cb = useRef(onScan); cb.current = onScan;
  const pausedRef = useRef(paused); pausedRef.current = paused;

  useEffect(() => {
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;
    let stopped = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (stopped) return;
        scanner = new Html5Qrcode(id.current, { verbose: false });
        await scanner.start({ facingMode: "environment" }, { fps: 8, qrbox: { width: 220, height: 220 } }, (text) => {
          if (pausedRef.current) return;
          const now = Date.now();
          if (last.current && last.current.t === text && now - last.current.at < 4000) return;
          last.current = { t: text, at: now };
          cb.current(text);
        }, () => undefined);
        setState("on");
      } catch { setState("error"); }
    })();
    return () => { stopped = true; scanner?.stop().catch(() => undefined); };
  }, []);

  return (
    <div>
      <div id={id.current} className="mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-slate-900" />
      <div className="mt-2 flex items-center justify-center gap-1 text-[11px] text-slate-500">
        {state === "on" ? <><Camera className="h-3 w-3" aria-hidden /> وجّه الكاميرا نحو رمز المتطوع</> : state === "error"
          ? <><CameraOff className="h-3 w-3" aria-hidden /> تعذّر فتح الكاميرا (اسمح بالوصول أو الصق الرمز يدوياً)</> : "تشغيل الكاميرا…"}
      </div>
    </div>
  );
}
