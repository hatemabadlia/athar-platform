import Link from "next/link";
import { Send, Droplets, CalendarHeart, Building2, Gift, BadgeCheck, TreePine, BarChart3, ShieldCheck, Sparkles, ArrowLeft, Trophy, Wrench, Camera } from "lucide-react";
import { getViewer } from "@/lib/server/guards";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

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
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
      <header>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">{c.title}</h1>
        <p className="mt-2 max-w-2xl text-slate-600">{c.lead}</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PUBLIC.map(({ key, ...i }) => <Card key={key} {...i} text={c.items[key]} />)}
      </div>
      {viewer?.isStaff && (
        <section>
          <h2 className="mb-3 text-sm font-black text-slate-500">{c.staff}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{STAFF.map(({ key, ...i }) => <Card key={key} {...i} text={c.items[key]} />)}</div>
        </section>
      )}
    </div>
  );
}

function Card({ href, icon: Icon, tone, text, big }: { href: string; icon: React.ElementType; tone: string; text: readonly [string, string]; big?: boolean }) {
  return (
    <Link href={href} className={cn("group relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", big && "sm:col-span-2 lg:col-span-2 border-slate-900")}>
      <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", tone)}><Icon className="h-5 w-5" aria-hidden /></div>
      <div className="mt-4">
        <div className="flex items-center justify-between gap-2 font-black text-slate-900">{text[0]}<ArrowLeft className="h-4 w-4 text-slate-300 transition group-hover:text-slate-900 rtl:rotate-0 ltr:rotate-180" aria-hidden /></div>
        <p className="mt-1 text-sm text-slate-600">{text[1]}</p>
      </div>
    </Link>
  );
}
