import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Reem_Kufi } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Chatbot } from "@/components/chatbot";
import { LiveNotifications } from "@/components/live-notifications";
import { IntroSplash } from "@/components/intro-splash";
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

const plex = IBM_Plex_Sans_Arabic({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex", display: "swap" });
const kufi = Reem_Kufi({ subsets: ["arabic", "latin"], weight: ["500", "600", "700"], variable: "--font-kufi", display: "swap" });

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
    <html lang={locale} dir={dirOf(locale)} className={`${plex.variable} ${kufi.variable}`}>
      <body className="font-sans min-h-screen flex flex-col">
        <I18nProvider locale={locale}>
        <IntroSplash />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[2000] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow">{t.skip}</a>
        <Navbar viewer={viewer ? { email: viewer.email, isStaff: viewer.isStaff, isMinistry: viewer.isMinistry } : null} unread={unread} />
        {viewer && <LiveNotifications userId={viewer.id} />}
        <CrisisBanner crises={crises} />
        <OfflineSync />
        <main id="main" className="flex-1"><LocaleScope>{children}</LocaleScope></main>
        <footer className="mt-16 bg-ink text-paper pattern-zellige">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-28 pt-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:pb-12">
            <div>
              <div className="font-display text-3xl">إيثار</div>
              <p className="mt-3 max-w-sm text-sm leading-7 text-paper/70">منصة جزائرية تربط من يحتاج بمن يستطيع — بعد التحقق. الذكاء الاصطناعي يقترح، ومشرف الولاية يقرّر، والأثر يُحتسب فقط حين يُؤكَّد.</p>
            </div>
            {([
              ["المنصة", [["/", "النداءات الموثّقة"], ["/check", "هل هذا النداء حقيقي؟"], ["/map", "خريطة إيثار"], ["/submit", t.footer.submit]]],
              ["شارك", [["/services", "تطوّع بمهارتك"], ["/donors", "شبكة المتبرعين بالدم"], ["/clubs", "نوادي دور الشباب"], ["/civic", "صوّر وبلّغ"]]],
              ["الثقة", [["/impact", t.footer.impact], ["/leaderboard", "لوحة الشرف"], ["/privacy", t.footer.privacy], ["/associations", "الجمعيات المعتمدة"]]],
            ] as const).map(([title, links]) => (
              <nav key={title} aria-label={title}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-paper/45">{title}</div>
                <ul className="mt-4 space-y-2.5 text-sm">{links.map(([href, label]) => <li key={href}><Link href={href} className="text-paper/80 transition-colors hover:text-paper">{label}</Link></li>)}</ul>
              </nav>
            ))}
          </div>
          <div className="border-t border-white/10">
            <p className="mx-auto max-w-7xl px-4 py-5 text-[11px] leading-5 text-paper/50 sm:px-6 pb-24 md:pb-5">{t.footer.disclaimer} إيثار ليست جهة رسمية ولا خدمة طوارئ — للطوارئ: الحماية المدنية 14 · الشرطة 17.</p>
          </div>
        </footer>
        <Chatbot signedIn={!!viewer} />
        </I18nProvider>
      </body>
    </html>
  );
}
