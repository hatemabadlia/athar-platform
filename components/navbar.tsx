"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, ShieldCheck, Sparkles, Building2, UserCircle2, TreePine, LogIn, LogOut, Send, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/actions/auth";

type NavViewer = { email: string | null; isStaff: boolean; isMinistry: boolean } | null;

export function Navbar({ viewer }: { viewer: NavViewer }) {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "الخريطة", icon: Map },
    { href: "/submit", label: "أرسل نداءً", icon: Send },
    { href: "/clubs", label: "النوادي", icon: Building2 },
    { href: "/trees", label: "غابة إيثار", icon: TreePine },
    { href: "/impact", label: "الأثر", icon: BarChart3 },
    ...(viewer ? [{ href: "/profile", label: "ملفي", icon: UserCircle2 }] : []),
    ...(viewer?.isStaff ? [
      { href: "/ingest", label: "محرك المعالجة", icon: Sparkles },
      { href: "/admin", label: "لوحة الإشراف", icon: ShieldCheck },
    ] : []),
  ];

  return (
    <header className="sticky top-0 z-[900] border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="إيثار — الصفحة الرئيسية">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-700 text-white shadow-lg shadow-brand-600/30">
            <span className="text-xl font-black" aria-hidden>إ</span>
          </div>
          <div className="leading-tight">
            <div className="text-lg font-black text-slate-900">إيثار</div>
            <div className="text-[10px] font-semibold tracking-wide text-slate-500">Athar · منصة التطوع</div>
          </div>
        </Link>

        <nav aria-label="التنقل الرئيسي" className="hidden lg:flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
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
        </nav>

        <div className="flex items-center gap-2">
          {viewer ? (
            <form action={signOut}>
              <button className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50" title={viewer.email ?? ""}>
                <LogOut className="h-3.5 w-3.5" aria-hidden /> خروج
              </button>
            </form>
          ) : (
            <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">
              <LogIn className="h-3.5 w-3.5" aria-hidden /> دخول
            </Link>
          )}
        </div>
      </div>

      <nav aria-label="التنقل (الهاتف)" className="lg:hidden flex overflow-x-auto border-t border-slate-100 bg-white">
        {links.map(({ href, label, icon: Icon }) => {
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
