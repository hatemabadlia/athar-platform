"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, ScanSearch, HandHeart, UserCircle2, ShieldCheck, LogIn, LogOut, Send, Languages, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/actions/auth";
import { setLocale } from "@/app/actions/locale";
import { useEffect, useState } from "react";
import { useLocale, useT } from "@/lib/i18n/client";
import { Logo } from "@/components/logo";

type NavViewer = { email: string | null; isStaff: boolean; isMinistry: boolean } | null;

/** Pages that belong to the "Act / تطوّع" hub. */
const ACT_PATHS = ["/act", "/clubs", "/campaigns", "/donors", "/donations", "/associations", "/trees", "/submit", "/impact"];
const MINE_PATHS = ["/profile", "/notifications", "/login", "/certificates"];

/**
 * Four primary sections — Alerts, Check, Act, My space — plus a role-based staff entry.
 * Everything else lives one tap deeper in the Act hub, so the bar never wraps.
 */
export function Navbar({ viewer, unread = 0 }: { viewer: NavViewer; unread?: number }) {
  const pathname = usePathname();
  const [count, setCount] = useState(unread);
  useEffect(() => setCount(unread), [unread]);
  useEffect(() => {
    const on = (e: Event) => setCount((c) => c + Number((e as CustomEvent).detail ?? 1));
    window.addEventListener("athar:unread", on);
    return () => window.removeEventListener("athar:unread", on);
  }, []);
  const t = useT();
  const locale = useLocale();
  const sections = [
    { href: "/", label: t.nav.alerts, icon: Map, active: pathname === "/" || pathname.startsWith("/crisis") },
    { href: "/check", label: t.nav.check, icon: ScanSearch, active: pathname.startsWith("/check") },
    { href: "/act", label: t.nav.act, icon: HandHeart, active: ACT_PATHS.some((p) => pathname.startsWith(p)) },
    { href: viewer ? "/profile" : `/login?next=${encodeURIComponent(pathname)}`, label: t.nav.mine, icon: UserCircle2, active: MINE_PATHS.some((p) => pathname.startsWith(p)) },
  ];
  const staffActive = pathname.startsWith("/admin") || pathname.startsWith("/ingest");

  return (
    <>
      <header className="sticky top-0 z-[900] border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" aria-label={t.brand.home} className="shrink-0"><Logo tagline={t.brand.tagline} /></Link>

          <nav aria-label={t.nav.main} className="hidden md:flex items-center gap-1 rounded-2xl bg-slate-100/80 p-1">
            {sections.map(({ href, label, icon: Icon, active }) => (
              <Link key={label} href={href} aria-current={active ? "page" : undefined}
                className={cn("flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition-all",
                  active ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-900")}>
                <Icon className="h-4 w-4" aria-hidden />{label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {viewer?.isStaff && (
              <Link href="/admin" aria-current={staffActive ? "page" : undefined}
                className={cn("hidden sm:flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold",
                  staffActive ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-700 hover:bg-slate-50")}>
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> {t.nav.staff}
              </Link>
            )}
            <Link href="/submit" className="hidden lg:flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800">
              <Send className="h-3.5 w-3.5" aria-hidden /> {t.nav.submit}
            </Link>
            {viewer && (
              <Link href="/notifications" aria-label={`${t.nav.notifications}${count ? ` (${count})` : ""}`} className="relative flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50">
                <Bell className="h-4 w-4" aria-hidden />
                {count > 0 && <span className="absolute -top-1 -end-1 min-w-[18px] rounded-full bg-rose-600 px-1 text-center text-[10px] font-black leading-[18px] text-white">{count > 9 ? "9+" : count}</span>}
              </Link>
            )}
            <form action={setLocale.bind(null, locale === "ar" ? "fr" : "ar")}>
              <button className="flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50" lang={locale === "ar" ? "fr" : "ar"} aria-label={t.nav.language}>
                <Languages className="h-3.5 w-3.5" aria-hidden /><span className="hidden sm:inline">{t.nav.language}</span>
              </button>
            </form>
            {viewer ? (
              <form action={signOut}>
                <button className="flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50" title={viewer.email ?? ""} aria-label={t.nav.logout}>
                  <LogOut className="h-3.5 w-3.5" aria-hidden /><span className="hidden sm:inline">{t.nav.logout}</span>
                </button>
              </form>
            ) : (
              <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="hidden sm:flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
                <LogIn className="h-3.5 w-3.5" aria-hidden /> {t.nav.login}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile: app-style bottom tab bar with the same four sections */}
      <nav aria-label={t.nav.mobile} className="md:hidden fixed inset-x-0 bottom-0 z-[900] grid grid-cols-4 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        {sections.map(({ href, label, icon: Icon, active }) => (
          <Link key={label} href={href} aria-current={active ? "page" : undefined}
            className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold", active ? "text-emerald-700" : "text-slate-500")}>
            <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-emerald-100")}><Icon className="h-5 w-5" aria-hidden /></span>
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
