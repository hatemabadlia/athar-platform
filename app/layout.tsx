import type { Metadata, Viewport } from "next";
import { Tajawal } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Chatbot } from "@/components/chatbot";
import { CrisisBanner } from "@/components/crisis-banner";
import { getViewer } from "@/lib/server/guards";
import { activeCrises } from "@/lib/data/crisis";
import { publicEnv } from "@/lib/env";
import Link from "next/link";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv().NEXT_PUBLIC_SITE_URL),
  title: { default: "إيثار | منصة التطوع الذكية في الجزائر", template: "%s · إيثار" },
  description: "إيثار: نداءات تطوع وتبرع بالدم وإغاثة موثّقة بمراجعة بشرية، مع كشف المنشورات القديمة والمكررة، في كل ولايات الجزائر.",
  openGraph: { type: "website", locale: "ar_DZ", siteName: "إيثار — Athar" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#0f766e", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [viewer, crises] = await Promise.all([getViewer(), activeCrises().catch(() => [])]);
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <body className="font-sans min-h-screen flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[2000] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow">تخطَّ إلى المحتوى</a>
        <Navbar viewer={viewer ? { email: viewer.email, isStaff: viewer.isStaff, isMinistry: viewer.isMinistry } : null} />
        <CrisisBanner crises={crises} />
        <main id="main" className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-slate-500">
            <span>إيثار — منصة تطوعية. درجات المصداقية أداة فرز وليست دليلاً على صحة أي نداء.</span>
            <nav className="flex gap-4">
              <Link href="/privacy" className="hover:text-slate-900">الخصوصية</Link>
              <Link href="/impact" className="hover:text-slate-900">الأثر</Link>
              <Link href="/submit" className="hover:text-slate-900">أرسل نداءً</Link>
            </nav>
          </div>
        </footer>
        <Chatbot signedIn={!!viewer} />
      </body>
    </html>
  );
}
