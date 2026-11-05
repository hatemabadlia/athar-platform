"use client";

import { useEffect, useRef, useState } from "react";
import type { SealMode } from "./seal-scene";
import { LogoMark } from "@/components/logo";

/**
 * Canvas host for the 3D seal. three.js is imported only here, on demand, so pages without the seal never
 * download it. Without WebGL (or before it loads) the flat logo is shown instead.
 */
export function SealCanvas({ mode, className }: { mode: SealMode; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    import("./seal-scene").then(({ createSealScene }) => {
      if (disposed || !ref.current) return;
      try {
        const s = createSealScene(ref.current, mode, { reducedMotion });
        cleanup = s.dispose; setReady(true);
      } catch { setFailed(true); } // no WebGL: keep the 2D mark
    }).catch(() => setFailed(true));
    return () => { disposed = true; cleanup?.(); };
  }, [mode]);
  return (
    <div className={className} style={{ position: "relative" }}>
      <canvas ref={ref} className="absolute inset-0 h-full w-full" style={{ opacity: ready ? 1 : 0, transition: "opacity .4s" }} aria-hidden />
      {(!ready || failed) && <div className="absolute inset-0 flex items-center justify-center"><LogoMark className="h-24 w-24 opacity-90" /></div>}
    </div>
  );
}
