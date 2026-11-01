"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, ShieldCheck, Sparkles, Radio, RotateCcw, Building2, UserCircle2, TreePine } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAthar } from "@/lib/store";

const links = [
  { href: "/", label: "الخريطة", icon: Map },
  { href: "/clubs", label: "النوادي", icon: Building2 },
  { href: "/trees", label: "غابة إيثار", icon: TreePine },
  { href: "/profile", label: "ملفي", icon: UserCircle2 },
  { href: "/ingest", label: "محرك AI", icon: Sparkles },
  { href: "/admin", label: "لوحة المديرية", icon: ShieldCheck },
];

export function Navbar() {
  const pathname = usePathname();
  const { stats, resetDemo, profile } = useAthar();

  return (
    <header className="sticky top-0 z-[900] border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-700 text-white shadow-lg shadow-brand-600/30">
            <span className="text-xl font-black">إ</span>
            <span className="absolute -top-1 -left-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
          </div>
          <div className="leading-tight">
            <div className="text-lg font-black text-slate-900">إيثار</div>
            <div className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
              Athar Volunteer Intelligence
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all",
                  active ? "bg-white text-brand-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            <span>{stats.verifiedActive} نداء نشط</span>
          </div>
          {profile && (
            <Link href="/profile" className="hidden sm:flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
              ⭐ {profile.points}
            </Link>
          )}
          <button
            onClick={resetDemo}
            title="إعادة ضبط بيانات العرض"
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* mobile nav */}
      <nav className="md:hidden flex overflow-x-auto border-t border-slate-100 bg-white">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-[72px] flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold whitespace-nowrap",
                active ? "text-brand-700" : "text-slate-500"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
