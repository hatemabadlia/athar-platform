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
import { Sidebar } from "@/components/sidebar";

type NavViewer = { email: string | null; isStaff: boolean; isMinistry: boolean } | null;

/** Pages that belong to the "Act / تطوّع" hub. */
const ACT_PATHS = ["/act", "/clubs", "/campaigns", "/donors", "/donations", "/associations", "/trees", "/submit", "/impact", "/leaderboard", "/services", "/civic"];
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
    { href: "/", label: t.nav.alerts, icon: Map, active: pathname === "/" || pathname.startsWith("/crisis") || pathname.startsWith("/map") },
    { href: "/check", label: t.nav.check, icon: ScanSearch, active: pathname.startsWith("/check") },
    { href: "/act", label: t.nav.act, icon: HandHeart, active: ACT_PATHS.some((p) => pathname.startsWith(p)) },
    { href: viewer ? "/profile" : `/login?next=${encodeURIComponent(pathname)}`, label: t.nav.mine, icon: UserCircle2, active: MINE_PATHS.some((p) => pathname.startsWith(p)) },
  ];
  const staffActive = pathname.startsWith("/admin") || pathname.startsWith("/ingest");

  return (
    <>
      <header className="sticky top-0 z-[900] border-b border-slate-200 bg-paper/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex shrink-0 items-center gap-3">
            <Sidebar signedIn={!!viewer} isStaff={!!viewer?.isStaff} unread={count} />
            <Link href="/" aria-label={t.brand.home}><Logo tagline={t.brand.tagline} /></Link>
          </div>

          {/* Text navigation with an underline marker — quieter than pills, closer to an editorial masthead */}
          <nav aria-label={t.nav.main} className="hidden md:flex h-full items-stretch gap-6">
            {sections.map(({ href, label, active }) => (
              <Link key={label} href={href} aria-current={active ? "page" : undefined}
                className={cn("relative flex items-center whitespace-nowrap text-[15px] font-medium transition-colors",
                  active ? "text-ink" : "text-slate-500 hover:text-ink",
                  "after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:origin-center after:transition-transform after:duration-200",
                  active ? "after:scale-x-100 after:bg-brand-600" : "after:scale-x-0 after:bg-slate-300 hover:after:scale-x-100")}>
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            {viewer?.isStaff && (
              <Link href="/admin" aria-current={staffActive ? "page" : undefined}
                className={cn("hidden sm:flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                  staffActive ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-100")}>
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> {t.nav.staff}
              </Link>
            )}
            {viewer && (
              <Link href="/notifications" aria-label={`${t.nav.notifications}${count ? ` (${count})` : ""}`} className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100">
                <Bell className="h-[18px] w-[18px]" aria-hidden />
                {count > 0 && <span className="absolute top-1 end-1 min-w-[16px] rounded-full bg-clay-500 px-1 text-center text-[10px] font-bold leading-4 text-white">{count > 9 ? "9+" : count}</span>}
              </Link>
            )}
            <form action={setLocale.bind(null, locale === "ar" ? "fr" : "ar")}>
              <button className="flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100" lang={locale === "ar" ? "fr" : "ar"} aria-label={t.nav.language}>
                <Languages className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">{t.nav.language}</span>
              </button>
            </form>
            {viewer ? (
              <form action={signOut}>
                <button className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100" title={viewer.email ?? ""} aria-label={t.nav.logout}>
                  <LogOut className="h-4 w-4" aria-hidden /><span className="hidden lg:inline">{t.nav.logout}</span>
                </button>
              </form>
            ) : (
              <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="hidden sm:flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                <LogIn className="h-4 w-4" aria-hidden /> {t.nav.login}
              </Link>
            )}
            <Link href="/submit" className="hidden lg:flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-ink px-3.5 text-[13px] font-semibold text-paper transition-colors hover:bg-brand-800">
              <Send className="h-3.5 w-3.5" aria-hidden /> {t.nav.submit}
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile: app-style bottom tab bar with the same four sections */}
      <nav aria-label={t.nav.mobile} className="md:hidden fixed inset-x-0 bottom-0 z-[900] grid grid-cols-4 border-t border-slate-200 bg-paper pb-[env(safe-area-inset-bottom)]">
        {sections.map(({ href, label, icon: Icon, active }) => (
          <Link key={label} href={href} aria-current={active ? "page" : undefined}
            className={cn("relative flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-semibold transition-colors", active ? "text-brand-700" : "text-slate-500")}>
            {active && <span className="absolute inset-x-6 top-0 h-[2px] rounded-full bg-brand-600" aria-hidden />}
            <Icon className="h-5 w-5" aria-hidden strokeWidth={active ? 2.2 : 1.8} />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
