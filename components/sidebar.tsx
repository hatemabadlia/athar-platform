"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, X, Map, Globe2, ScanSearch, Send, Wrench, Droplets, CalendarHeart, Building2, Gift, TreePine, BadgeCheck,
  Trophy, BarChart3, UserCircle2, Bell, ShieldCheck, Sparkles, LogIn, Lock, Camera, MapPinned, ListChecks,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: React.ElementType; hint?: string };
type Group = { title: string; items: Item[] };

/** Full site menu: every section in one place, grouped. Opens from the ☰ button (phone and desktop). */
export function Sidebar({ signedIn, isStaff, unread = 0 }: { signedIn: boolean; isStaff: boolean; unread?: number }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  useEffect(() => setMounted(true), []);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  const groups: Group[] = [
    { title: "الرئيسية", items: [
      { href: "/", label: "النداءات الموثّقة", icon: Map },
      { href: "/map", label: "خريطة إيثار", icon: Globe2, hint: "نداءات · أشجار · نوادي · إيواء" },
      { href: "/check", label: "هل هذا النداء حقيقي؟", icon: ScanSearch },
      { href: "/submit", label: "أرسل نداءً", icon: Send },
    ] },
    { title: "صوّر وبلّغ — مشاكل الحي", items: [
      { href: "/civic/new", label: "بلّغ عن مشكل", icon: Camera, hint: "حفرة، إنارة، نفايات، تسرب مياه…" },
      { href: "/civic/map", label: "خريطة البلاغات", icon: MapPinned },
      ...(signedIn ? [{ href: "/civic/mine", label: "بلاغاتي", icon: ListChecks }] : []),
    ] },
    { title: "تطوّع", items: [
      { href: "/services", label: "تطوّع بمهارتك", icon: Wrench },
      { href: "/donors", label: "شبكة المتبرعين بالدم", icon: Droplets },
      { href: "/campaigns", label: "الحملات الموسمية", icon: CalendarHeart },
      { href: "/clubs", label: "نوادي دور الشباب", icon: Building2 },
      { href: "/donations", label: "تبرعات عينية", icon: Gift },
      { href: "/trees", label: "غابة إيثار", icon: TreePine },
      { href: "/associations", label: "الجمعيات المعتمدة", icon: BadgeCheck },
    ] },
    { title: "الأثر", items: [
      { href: "/leaderboard", label: "لوحة الشرف", icon: Trophy },
      { href: "/impact", label: "الأثر الوطني", icon: BarChart3 },
    ] },
    { title: "حسابي", items: signedIn ? [
      { href: "/profile", label: "ملفي ومهاراتي", icon: UserCircle2 },
      { href: "/notifications", label: unread ? `الإشعارات (${unread})` : "الإشعارات", icon: Bell },
    ] : [{ href: `/login?next=${encodeURIComponent(pathname)}`, label: "تسجيل الدخول", icon: LogIn }] },
    ...(isStaff ? [{ title: "الإشراف", items: [
      { href: "/admin", label: "لوحة الإشراف", icon: ShieldCheck },
      { href: "/ingest", label: "محرك المعالجة", icon: Sparkles },
    ] }] : []),
  ];
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href.split("?")[0]));

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="القائمة الكاملة" aria-expanded={open} aria-controls="site-sidebar"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50">
        <Menu className="h-5 w-5" aria-hidden />
      </button>
      {/* Rendered on <body>: the header's backdrop-filter would otherwise become the containing block of these fixed elements */}
      {mounted && createPortal(<>
      {open && <div className="fixed inset-0 z-[1100] bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-hidden />}
      <aside id="site-sidebar" aria-label="القائمة الكاملة" aria-hidden={!open}
        className={cn("fixed inset-y-0 start-0 z-[1101] flex w-[300px] max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-200",
          open ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full")}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <Logo tagline="تحقّق قبل أن تشارك" />
          <button onClick={() => setOpen(false)} aria-label="إغلاق" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {groups.map((g) => (
            <div key={g.title} className="mb-4">
              <div className="px-2 pb-1 text-[11px] font-black text-slate-400">{g.title}</div>
              <ul>
                {g.items.map(({ href, label, icon: Icon, hint }) => (
                  <li key={href}>
                    <Link href={href} tabIndex={open ? 0 : -1} aria-current={isActive(href) ? "page" : undefined}
                      className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold",
                        isActive(href) ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-slate-50")}>
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="min-w-0"><span className="block truncate">{label}</span>{hint && <span className="block truncate text-[10px] font-semibold text-slate-400">{hint}</span>}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-100 px-4 py-3 text-[11px] text-slate-500">
          <Link href="/privacy" tabIndex={open ? 0 : -1} className="flex items-center gap-1.5 hover:text-slate-900"><Lock className="h-3.5 w-3.5" aria-hidden /> الخصوصية وحماية البيانات</Link>
        </div>
      </aside>
      </>, document.body)}
    </>
  );
}
