"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, ShieldCheck, Sparkles, Building2, UserCircle2, TreePine, LogIn, LogOut, Send, BarChart3, Droplets, Gift, BadgeCheck, CalendarHeart, Bell, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/actions/auth";
import { setLocale } from "@/app/actions/locale";
import { useLocale, useT } from "@/lib/i18n/client";
import { Languages } from "lucide-react";

type NavViewer = { email: string | null; isStaff: boolean; isMinistry: boolean } | null;

export function Navbar({ viewer }: { viewer: NavViewer }) {
  const pathname = usePathname();
  const t = useT();
  const locale = useLocale();
  const primary = [
    { href: "/", label: t.nav.map, icon: Map },
    { href: "/submit", label: t.nav.submit, icon: Send },
    { href: "/campaigns", label: t.nav.campaigns, icon: CalendarHeart },
    { href: "/clubs", label: t.nav.clubs, icon: Building2 },
    { href: "/trees", label: t.nav.trees, icon: TreePine },
  ];
  const more = [
    { href: "/donors", label: t.nav.donors, icon: Droplets },
    { href: "/donations", label: t.nav.donations, icon: Gift },
    { href: "/associations", label: t.nav.associations, icon: BadgeCheck },
    { href: "/impact", label: t.nav.impact, icon: BarChart3 },
  ];
  const personal = viewer ? [{ href: "/profile", label: t.nav.profile, icon: UserCircle2 }, { href: "/notifications", label: t.nav.notifications, icon: Bell }] : [];
  const staff = viewer?.isStaff ? [
    { href: "/ingest", label: t.nav.ingest, icon: Sparkles },
    { href: "/admin", label: t.nav.admin, icon: ShieldCheck },
  ] : [];
  const links = [...primary, ...personal, ...staff];
  const all = [...primary, ...more, ...personal, ...staff];
  return (
    <header className="sticky top-0 z-[900] border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label={t.brand.home}>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-700 text-white shadow-lg shadow-brand-600/30">
            <span className="text-xl font-black" aria-hidden>إ</span>
          </div>
          <div className="leading-tight">
            <div className="text-lg font-black text-slate-900">{t.brand.name}</div>
            <div className="text-[10px] font-semibold tracking-wide text-slate-500">{t.brand.tagline}</div>
          </div>
        </Link>

        <nav aria-label={t.nav.main} className="hidden lg:flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined}
                className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all",
                  active ? "bg-white text-brand-700 shadow-sm" : "text-slate-600 hover:text-slate-900")}>
                <Icon className="h-4 w-4" aria-hidden />{label}
              </Link>
            );
          })}
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900">{t.nav.more} <ChevronDown className="h-3.5 w-3.5" aria-hidden /></summary>
            <div className="absolute end-0 z-[950] mt-1 w-48 rounded-2xl border border-slate-200 bg-white p-1 shadow-lg">
              {more.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><Icon className="h-4 w-4" aria-hidden />{label}</Link>
              ))}
            </div>
          </details>
        </nav>

        <div className="flex items-center gap-2">
          <form action={setLocale.bind(null, locale === "ar" ? "fr" : "ar")}>
            <button className="flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50" lang={locale === "ar" ? "fr" : "ar"}>
              <Languages className="h-3.5 w-3.5" aria-hidden /> {t.nav.language}
            </button>
          </form>
          {viewer ? (
            <form action={signOut}>
              <button className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50" title={viewer.email ?? ""}>
                <LogOut className="h-3.5 w-3.5" aria-hidden /> {t.nav.logout}
              </button>
            </form>
          ) : (
            <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">
              <LogIn className="h-3.5 w-3.5" aria-hidden /> {t.nav.login}
            </Link>
          )}
        </div>
      </div>

      <nav aria-label={t.nav.mobile} className="lg:hidden flex overflow-x-auto border-t border-slate-100 bg-white">
        {all.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}
              className={cn("flex min-w-[72px] flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold whitespace-nowrap",
                active ? "text-brand-700" : "text-slate-500")}>
              <Icon className="h-4 w-4" aria-hidden />{label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
