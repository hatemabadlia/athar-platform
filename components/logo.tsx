import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * ATHAR mark: an eight-point khatam (the geometric seal found across Algerian tilework) carrying a check —
 * "a seal of trust". It reads as verification, not as a warning sign.
 */
export function LogoMark({ className, mono }: { className?: string; mono?: boolean }) {
  const id = useId();
  const fill = mono ? "currentColor" : `url(#${id})`;
  return (
    <svg viewBox="0 0 48 48" className={cn("h-10 w-10", className)} aria-hidden focusable="false">
      {!mono && (
        <defs>
          <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="8" y1="8" x2="40" y2="40">
            <stop offset="0" stopColor="#10b981" />
            <stop offset="1" stopColor="#065f46" />
          </linearGradient>
        </defs>
      )}
      <rect x="8.5" y="8.5" width="31" height="31" rx="5" fill={fill} />
      <rect x="8.5" y="8.5" width="31" height="31" rx="5" fill={fill} transform="rotate(45 24 24)" />
      <path d="M16.5 24.5l5 5L31.5 19" fill="none" stroke={mono ? "white" : "#ecfdf5"} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ tagline, className }: { tagline?: string; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="leading-none">
        <span className="block text-[22px] font-black tracking-tight text-slate-900">إيثار</span>
        {tagline && <span className="mt-1 block text-[10px] font-bold text-emerald-700">{tagline}</span>}
      </span>
    </span>
  );
}
