import Link from "next/link";
import { Send, Droplets, CalendarHeart, Building2, Gift, BadgeCheck, TreePine, BarChart3, ShieldCheck, Sparkles, ArrowLeft, Trophy, Wrench, Camera } from "lucide-react";
import { getViewer } from "@/lib/server/guards";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";
import { Masthead } from "@/components/ui/masthead";

export const dynamic = "force-dynamic";

const COPY = {
  ar: {
    title: "كيف تريد أن تساعد؟", lead: "كل طرق العمل التطوعي في مكان واحد — وكل مشاركة مؤكَّدة تُحتسب في ساعاتك وشهادتك.",
    staff: "للمشرفين",
    items: {
      submit: ["أرسل نداءً", "تعرف حاجة حقيقية؟ أرسلها ليتحقق منها مشرف ولايتها."],
      civic: ["صوّر وبلّغ", "شفت مشكل في حيّك؟ حفرة، إنارة، نفايات… صوّرو وبلّغ عليه في أقل من دقيقة."],
      services: ["تطوّع بمهارتك", "ماشي كل مساعدة مادية: تصميم، ترجمة، توصيل، دروس، استشارة مهنية — في ولايتك أو عن بُعد."],
      donors: ["شبكة المتبرعين بالدم", "سجّل فصيلتك: نُعلمك عندما يحتاج مريض قريب فصيلة متوافقة."],
      campaigns: ["الحملات الموسمية", "قفة رمضان، الدخول المدرسي، الشتاء — بدون تكرار المستفيدين."],
      clubs: ["نوادي دور الشباب", "انضم لنادٍ في ولايتك وسجّل حضورك بـ QR."],
      donations: ["تبرعات عينية", "عندك ملابس، كتب، سيارة؟ نطابقها مع حاجة قريبة."],
      associations: ["الجمعيات المعتمدة", "جمعيات تحقّقت منها المنصة."],
      trees: ["غابة إيثار", "اغرس شجرة، صوّرها، ويتحقق منها مشرف."],
      impact: ["الأثر الوطني", "أرقام حقيقية من المنصة لكل ولاية."],
      leaderboard: ["لوحة الشرف", "ترتيب المتطوعين والنوادي حسب الأعمال المؤكَّدة فقط."],
      admin: ["لوحة الإشراف", "مراجعة النداءات في ولايتك، الأدوار، الطوارئ."],
      ingest: ["محرك المعالجة", "طابور الاستقبال والمراحل السبع."],
    },
  },
  fr: {
    title: "Comment voulez-vous aider ?", lead: "Toutes les façons d'agir au même endroit — chaque participation confirmée compte dans vos heures et votre certificat.",
    staff: "Modération",
    items: {
      submit: ["Signaler un besoin", "Vous connaissez un vrai besoin ? Envoyez-le au modérateur de la wilaya."],
      civic: ["Signaler un problème", "Nid-de-poule, éclairage, déchets… photographiez et signalez en moins d'une minute."],
      services: ["Bénévolat de compétences", "Toute aide n'est pas matérielle : design, traduction, transport, cours, conseil — sur place ou à distance."],
      donors: ["Réseau de donneurs de sang", "Indiquez votre groupe : nous vous prévenons quand un patient compatible proche en a besoin."],
      campaigns: ["Campagnes", "Ramadan, rentrée, hiver — sans doublons de bénéficiaires."],
      clubs: ["Clubs des maisons de jeunes", "Rejoignez un club et pointez votre présence par QR."],
      donations: ["Dons en nature", "Vêtements, livres, voiture ? Nous les associons à un besoin proche."],
      associations: ["Associations vérifiées", "Associations vérifiées par la plateforme."],
      trees: ["Forêt Athar", "Plantez un arbre, photographiez-le, un modérateur le vérifie."],
      impact: ["Impact national", "Chiffres réels de la plateforme, par wilaya."],
      leaderboard: ["Tableau d'honneur", "Bénévoles et clubs classés sur des actions confirmées."],
      admin: ["Modération", "Appels de votre wilaya, rôles, urgences."],
      ingest: ["Traitement", "File d'entrée et les sept étapes."],
    },
  },
} as const;

const PUBLIC = [
  { key: "submit", href: "/submit", icon: Send, tone: "bg-slate-900 text-white", big: true },
  { key: "services", href: "/services", icon: Wrench, tone: "bg-teal-600 text-white", big: true },
  { key: "civic", href: "/civic", icon: Camera, tone: "bg-orange-600 text-white", big: true },
  { key: "donors", href: "/donors", icon: Droplets, tone: "bg-rose-50 text-rose-700" },
  { key: "campaigns", href: "/campaigns", icon: CalendarHeart, tone: "bg-indigo-50 text-indigo-700" },
  { key: "clubs", href: "/clubs", icon: Building2, tone: "bg-amber-50 text-amber-700" },
  { key: "donations", href: "/donations", icon: Gift, tone: "bg-sky-50 text-sky-700" },
  { key: "associations", href: "/associations", icon: BadgeCheck, tone: "bg-emerald-50 text-emerald-700" },
  { key: "trees", href: "/trees", icon: TreePine, tone: "bg-lime-50 text-lime-700" },
  { key: "impact", href: "/impact", icon: BarChart3, tone: "bg-violet-50 text-violet-700" },
  { key: "leaderboard", href: "/leaderboard", icon: Trophy, tone: "bg-amber-50 text-amber-700" },
] as const;
const STAFF = [
  { key: "admin", href: "/admin", icon: ShieldCheck, tone: "bg-emerald-50 text-emerald-800" },
  { key: "ingest", href: "/ingest", icon: Sparkles, tone: "bg-slate-100 text-slate-800" },
] as const;

export async function generateMetadata() {
  const { locale } = await getT();
  return { title: COPY[locale].title };
}

export default async function ActPage() {
  const [{ locale }, viewer] = await Promise.all([getT(), getViewer()]);
  const c = COPY[locale];
  const featured = PUBLIC.filter((i) => "big" in i && i.big);
  const rest = PUBLIC.filter((i) => !("big" in i && i.big));
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-10">
      <Masthead eyebrow={locale === "fr" ? "Agir" : "تطوّع"} title={c.title} lede={c.lead} />

      {/* three ways in, set like a magazine contents spread */}
      <div className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 md:grid-cols-3">
        {featured.map(({ key, href, icon: Icon }, i) => (
          <Link key={key} href={href} className="group flex flex-col bg-white p-6 transition-colors hover:bg-paper">
            <div className="flex items-center justify-between">
              <span className={cn("font-display text-sm tabular-nums", key === "civic" ? "text-clay-600" : "text-brand-700")}>0{i + 1}</span>
              <Icon className="h-5 w-5 text-slate-400 transition-colors group-hover:text-ink" aria-hidden />
            </div>
            <h2 className="mt-6 font-display text-2xl text-ink">{c.items[key][0]}</h2>
            <p className="mt-2 flex-1 text-sm leading-7 text-slate-600">{c.items[key][1]}</p>
            <span className="mt-5 text-sm font-semibold text-ink"><span className="link">{locale === "fr" ? "Commencer" : "ابدأ"}</span> ←</span>
          </Link>
        ))}
      </div>

      <section>
        <p className="eyebrow">{locale === "fr" ? "Autres façons d'agir" : "طرق أخرى للمساهمة"}</p>
        <ol className="mt-2 grid md:grid-cols-2 md:gap-x-10">
          {rest.map(({ key, href, icon: Icon }, i) => (
            <li key={key} className="border-b border-slate-200">
              <Link href={href} className="group flex items-start gap-4 py-5">
                <span className="w-6 shrink-0 pt-0.5 font-display text-sm tabular-nums text-slate-400">{String(i + 4).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-base font-semibold text-ink"><Icon className="h-4 w-4 text-slate-400 transition-colors group-hover:text-brand-700" aria-hidden />{c.items[key][0]}</span>
                  <span className="mt-1 block text-sm leading-6 text-slate-600">{c.items[key][1]}</span>
                </span>
                <ArrowLeft className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:-translate-x-1 group-hover:text-ink rtl:rotate-0 ltr:rotate-180" aria-hidden />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {viewer?.isStaff && (
        <section>
          <p className="eyebrow">{c.staff}</p>
          <ul className="mt-2 grid md:grid-cols-2 md:gap-x-10">
            {STAFF.map(({ key, href, icon: Icon }) => (
              <li key={key} className="border-b border-slate-200"><Link href={href} className="flex items-center gap-3 py-4 text-sm"><Icon className="h-4 w-4 text-brand-700" aria-hidden /><b className="font-semibold text-ink">{c.items[key][0]}</b><span className="text-slate-500">{c.items[key][1]}</span></Link></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
