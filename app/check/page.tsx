import { ShieldQuestion } from "lucide-react";
import { Checker } from "./checker";

export const metadata = {
  title: "هل هذا النداء حقيقي؟",
  description: "الصق منشوراً وصلك على فيسبوك أو واتساب: يخبرك إيثار إن كان موثّقاً، أو سبق حلّه، أو يُعاد تداوله، مع الأسباب.",
};

export default function CheckPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
      <header className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg"><ShieldQuestion className="h-7 w-7" aria-hidden /></div>
        <h1 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight text-slate-900">هل هذا النداء حقيقي؟</h1>
        <p className="mx-auto mt-3 max-w-2xl text-base sm:text-lg text-slate-600">
          قبل أن تعيد نشر طلب مساعدة، الصقه هنا. نخبرك إن كان موثّقاً ونشطاً، أو سبق حلّه، أو يُعاد تداوله منذ سنوات — مع الأدلة.
        </p>
      </header>
      <Checker />
    </div>
  );
}
