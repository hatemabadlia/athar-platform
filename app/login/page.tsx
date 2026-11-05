import { Suspense } from "react";
import { ShieldCheck, Lock, Bell } from "lucide-react";
import { LoginForm } from "./login-form";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t.login.title };
}

const POINTS = [
  [ShieldCheck, "لا ندخل بكلمات سر: رمز من 6 أرقام يصل إلى بريدك."],
  [Lock, "هاتفك وفصيلة دمك خاصّان — لا يراهما إلا من تختار المساعدة معه."],
  [Bell, "تتابع نداءاتك وبلاغاتك، وتصلك إشعارات حين تحتاجك حالة قريبة."],
] as const;

export default function LoginPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:py-16">
      <aside className="hidden rounded-2xl bg-ink pattern-zellige p-10 text-paper lg:flex lg:flex-col">
        <div className="font-display text-4xl">إيثار</div>
        <p className="mt-4 text-[15px] leading-8 text-paper/75">حسابك يجعل مساهمتك قابلة للتحقق: حضورك يُؤكَّد، ساعاتك تُحتسب، وشهادتك يمكن لأي أحد التأكد منها.</p>
        <ul className="mt-auto space-y-4 pt-10 text-sm text-paper/80">
          {POINTS.map(([Icon, text]) => <li key={text} className="flex gap-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden />{text}</li>)}
        </ul>
      </aside>
      <Suspense fallback={<div className="h-64 rounded-2xl skeleton" />}><LoginForm /></Suspense>
    </div>
  );
}
