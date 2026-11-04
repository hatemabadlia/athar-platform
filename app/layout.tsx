import type { Metadata, Viewport } from "next";
import { Tajawal } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Chatbot } from "@/components/chatbot";
import { LiveNotifications } from "@/components/live-notifications";
import { supabaseServer } from "@/lib/supabase/server";
import { CrisisBanner } from "@/components/crisis-banner";
import { OfflineSync } from "@/components/offline-sync";
import { LocaleScope } from "@/components/locale-scope";
import { getViewer } from "@/lib/server/guards";
import { activeCrises } from "@/lib/data/crisis";
import { publicEnv } from "@/lib/env";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { dirOf } from "@/lib/i18n/dict";
import { I18nProvider } from "@/lib/i18n/client";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-tajawal",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getT();
  return {
    metadataBase: new URL(publicEnv().NEXT_PUBLIC_SITE_URL),
    title: { default: t.meta.title, template: `%s · ${t.brand.name}` },
    description: t.meta.description,
    openGraph: { type: "website", locale: locale === "fr" ? "fr_DZ" : "ar_DZ", siteName: "إيثار — Athar" },
    icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  };
}

export const viewport: Viewport = { themeColor: "#0f766e", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [viewer, crises, { t, locale }] = await Promise.all([getViewer(), activeCrises().catch(() => []), getT()]);
  const unread = viewer
    ? (await (await supabaseServer()).from("notifications").select("id", { count: "exact", head: true }).is("read_at", null)).count ?? 0
    : 0;
  return (
    <html lang={locale} dir={dirOf(locale)} className={tajawal.variable}>
      <body className="font-sans min-h-screen flex flex-col">
        <I18nProvider locale={locale}>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[2000] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow">{t.skip}</a>
        <Navbar viewer={viewer ? { email: viewer.email, isStaff: viewer.isStaff, isMinistry: viewer.isMinistry } : null} unread={unread} />
        {viewer && <LiveNotifications userId={viewer.id} />}
        <CrisisBanner crises={crises} />
        <OfflineSync />
        <main id="main" className="flex-1"><LocaleScope>{children}</LocaleScope></main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 pb-24 sm:pb-5 text-xs text-slate-500">
            <span>{t.footer.disclaimer}</span>
            <nav className="flex gap-4">
              <Link href="/privacy" className="hover:text-slate-900">{t.footer.privacy}</Link>
              <Link href="/impact" className="hover:text-slate-900">{t.footer.impact}</Link>
              <Link href="/submit" className="hover:text-slate-900">{t.footer.submit}</Link>
            </nav>
          </div>
        </footer>
        <Chatbot signedIn={!!viewer} />
        </I18nProvider>
      </body>
    </html>
  );
}
