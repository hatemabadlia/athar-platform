"use client";

import { useEffect, useState } from "react";
import { SealCanvas } from "@/components/three/seal-canvas";

/**
 * Opening animation (≈2.6 s), once per browser session: the 3D khatam assembles, the check draws, the name appears.
 * Skippable; never shown with "reduce motion", to automated browsers, or when storage is unavailable.
 */
export function IntroSplash() {
  const [state, setState] = useState<"hidden" | "show" | "leaving">("hidden");
  useEffect(() => {
    try {
      if (sessionStorage.getItem("athar:intro")) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || navigator.webdriver) return;
      sessionStorage.setItem("athar:intro", "1");
    } catch { return; }
    setState("show");
    const t1 = setTimeout(() => setState("leaving"), 2600);
    const t2 = setTimeout(() => setState("hidden"), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  useEffect(() => {
    if (state === "hidden") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [state]);
  if (state === "hidden") return null;
  const skip = () => { setState("leaving"); setTimeout(() => setState("hidden"), 500); };
  return (
    <div role="dialog" aria-label="إيثار" aria-live="polite" onClick={skip}
      className="fixed inset-0 z-[3000] flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,#064e3b_0%,#020617_70%)] text-white"
      style={{ opacity: state === "leaving" ? 0 : 1, transform: state === "leaving" ? "scale(1.04)" : "none", transition: "opacity .55s ease, transform .55s ease" }}>
      <SealCanvas mode="intro" className="h-[46vh] w-full max-w-[560px]" />
      <div className="intro-title mt-2 text-center">
        <div className="text-5xl sm:text-6xl font-black tracking-tight">إيثار</div>
        <div className="mt-2 text-base sm:text-lg font-bold text-emerald-300">تحقّق قبل أن تشارك</div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); skip(); }} className="absolute bottom-8 rounded-full border border-white/20 px-4 py-1.5 text-xs font-bold text-white/70 hover:text-white">تخطّي</button>
    </div>
  );
}
