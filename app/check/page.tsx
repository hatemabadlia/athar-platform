import { Masthead } from "@/components/ui/masthead";
import { Checker } from "./checker";

export const metadata = {
  title: "هل هذا النداء حقيقي؟",
  description: "الصق منشوراً وصلك على فيسبوك أو واتساب: يخبرك إيثار إن كان موثّقاً، أو سبق حلّه، أو يُعاد تداوله، مع الأسباب.",
};

const VERDICTS = [
  ["#146846", "موثّق ونشط", "راجعه مشرف الولاية وما زال مفتوحاً"],
  ["#0369a1", "سبق حلّه", "نفس الطلب أُغلق من قبل"],
  ["#b45309", "قديم أو مكرر", "محتوى متداول منذ مدة — تحقّق قبل النشر"],
  ["#B6532C", "يستدعي الحذر", "طلب تحويل أموال، تواريخ قديمة…"],
  ["#78736A", "أدلة غير كافية", "جديد علينا — أرسله ليراجعه مشرف"],
] as const;

export default function CheckPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
      <Masthead eyebrow="أداة التحقق" title="هل هذا النداء حقيقي؟"
        lede="قبل أن تعيد نشر طلب مساعدة، الصقه هنا. نخبرك بما نعرفه عنه — مع الأدلة. لا نتّهم أحداً: القِدم أو التكرار لا يعنيان أن الطلب كاذب."
        aside={
          <ol className="divide-y divide-slate-200 border-y border-slate-200 text-[13px]">
            {VERDICTS.map(([c, t, d]) => (
              <li key={t} className="flex items-baseline gap-3 py-2.5">
                <span className="h-2.5 w-2.5 shrink-0 translate-y-0.5 rounded-sm" style={{ background: c }} aria-hidden />
                <span className="w-28 shrink-0 font-semibold text-ink">{t}</span><span className="text-slate-500">{d}</span>
              </li>
            ))}
          </ol>
        } />
      <Checker />
    </div>
  );
}
