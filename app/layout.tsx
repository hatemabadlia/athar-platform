import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { AtharProvider } from "@/lib/store";
import { Navbar } from "@/components/navbar";
import { Chatbot } from "@/components/chatbot";
import { CrisisBanner } from "@/components/crisis-banner";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "800", "900"],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "إيثار | Athar Volunteer Intelligence Platform",
  description:
    "منصة ذكاء اصطناعي لرصد نداءات التطوع في الجزائر، تصفية المنشورات القديمة وتوجيه المتطوعين إلى الاحتياج الحقيقي.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <body className="font-sans min-h-screen flex flex-col">
        <AtharProvider>
          <Navbar />
          <CrisisBanner />
          <main className="flex-1">{children}</main>
          <Chatbot />
        </AtharProvider>
      </body>
    </html>
  );
}
