import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  // one strong action per view (ink); green is reserved for confirmation, clay for destructive
  primary: "bg-ink text-paper hover:bg-brand-800",
  secondary: "bg-brand-600 text-white hover:bg-brand-700",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
  danger: "bg-clay-500 text-white hover:bg-clay-600",
  success: "bg-brand-600 text-white hover:bg-brand-700",
  outline: "border border-slate-300 bg-white text-ink hover:border-slate-400 hover:bg-paper",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors active:translate-y-px disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
