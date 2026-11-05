import Link from "next/link";
import { Trophy, Users, Building2, Clock, ShieldCheck, Medal, EyeOff } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { getViewer } from "@/lib/server/guards";
import { getT } from "@/lib/i18n/server";
import { findWilaya } from "@/lib/wilayas";
import { cn } from "@/lib/utils";
import { WilayaFilter } from "./wilaya-filter";
import { Masthead } from "@/components/ui/masthead";

export const dynamic = "force-dynamic";

const COPY = {
  ar: {
    title: "لوحة الشرف", lead: "ترتيب يعتمد فقط على أعمال مؤكَّدة: حضور مؤكَّد في نداء، تسجيل حضور بـ QR، أو شجرة اعتمدها مشرف. لا شيء يُحتسب بنقرة.",
    volunteers: "المتطوعون", clubs: "النوادي", month: "هذا الشهر", all: "منذ البداية", allWilayas: "كل الولايات",
    points: "نقطة", hours: "ساعة", actions: "عمل مؤكَّد", members: "عضو", checkins: "حضور مؤكَّد", trees: "شجرة",
    you: "أنت", myRank: (r: number, n: number) => `ترتيبك: ${r} من ${n}`, notRanked: "لم تجمع نقاطاً مؤكَّدة في هذه الفترة بعد.",
    hidden: "اخترت عدم الظهور في القائمة العامة — ترتيبك يظهر لك وحدك.", login: "سجّل الدخول لترى ترتيبك",
    empty: "لا توجد نقاط مؤكَّدة في هذه الفترة بعد.", how: "كيف تُحسب النقاط؟",
    rulesV: ["مشاركة مؤكَّدة في نداء: 100 (حرج) · 60 (متوسط) · 40 (عادي)", "تسجيل حضور بـ QR في نشاط: 20", "شجرة اعتمدها مشرف: 50"],
    rulesC: ["كل حضور مؤكَّد بـ QR في أنشطة النادي: 20", "كل شجرة معتمدة غُرست باسم النادي: 50"],
    privacy: "يظهر الاسم المختار فقط، دون هاتف أو صورة. يمكنك الاختفاء من القائمة من «حسابي».",
  },
  fr: {
    title: "Tableau d'honneur", lead: "Classement basé uniquement sur des actions confirmées : présence confirmée sur un appel, pointage QR, arbre validé par un modérateur.",
    volunteers: "Bénévoles", clubs: "Clubs", month: "Ce mois-ci", all: "Depuis le début", allWilayas: "Toutes les wilayas",
    points: "pts", hours: "h", actions: "actions confirmées", members: "membres", checkins: "présences", trees: "arbres",
    you: "Vous", myRank: (r: number, n: number) => `Votre rang : ${r} sur ${n}`, notRanked: "Pas encore de points confirmés sur cette période.",
    hidden: "Vous êtes masqué du classement public — votre rang n'est visible que par vous.", login: "Connectez-vous pour voir votre rang",
    empty: "Aucun point confirmé sur cette période.", how: "Comment les points sont-ils calculés ?",
    rulesV: ["Participation confirmée à un appel : 100 (critique) · 60 (moyen) · 40 (normal)", "Pointage QR à une activité : 20", "Arbre validé : 50"],
    rulesC: ["Chaque présence QR aux activités du club : 20", "Chaque arbre validé planté pour le club : 50"],
    privacy: "Seul le nom choisi est affiché. Vous pouvez vous masquer depuis « Mon espace ».",
  },
} as const;

export async function generateMetadata() {
  const { locale } = await getT();
  return { title: COPY[locale].title };
}

type SP = { tab?: string; w?: string; period?: string };

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const tab = sp.tab === "clubs" ? "clubs" : "volunteers";
  const period = sp.period === "all" ? "all" : "month";
  const w = sp.w && /^\d{1,2}$/.test(sp.w) && findWilaya(Number(sp.w)) ? Number(sp.w) : null;
  const since = period === "month" ? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString() : undefined;
  const [{ locale }, viewer, supabase] = await Promise.all([getT(), getViewer(), supabaseServer()]);
  const c = COPY[locale];
  const wName = (code: number | null) => (code ? (locale === "fr" ? findWilaya(code)?.name : findWilaya(code)?.nameAr) ?? "" : "");
  const args = { p_wilaya: w ?? undefined, p_since: since };

  const [vol, clubs, mine, me] = await Promise.all([
    tab === "volunteers" ? supabase.rpc("volunteer_leaderboard", { ...args, p_limit: 50 }) : Promise.resolve({ data: null }),
    tab === "clubs" ? supabase.rpc("club_leaderboard", { ...args, p_limit: 50 }) : Promise.resolve({ data: null }),
    tab === "volunteers" && viewer ? supabase.rpc("my_leaderboard_rank", args) : Promise.resolve({ data: null }),
    viewer ? supabase.from("profiles").select("hide_from_leaderboard").eq("id", viewer.id).single() : Promise.resolve({ data: null }),
  ]);

  type Row = { key: string; rank: number; name: string; sub: string; points: number; stats: string[]; isMe?: boolean };
  const rows: Row[] = tab === "volunteers"
    ? (vol.data ?? []).map((r, i) => ({ key: `v${i}`, rank: Number(r.rank), name: r.display_name, sub: wName(r.wilaya_code), points: Number(r.points),
        stats: [`${Number(r.hours)} ${c.hours}`, `${Number(r.actions)} ${c.actions}`], isMe: r.is_me }))
    : (clubs.data ?? []).map((r) => ({ key: r.club_id, rank: Number(r.rank), name: r.name, sub: [wName(r.wilaya_code), r.institution_name].filter(Boolean).join(" · "),
        points: Number(r.points), stats: [`${Number(r.members)} ${c.members}`, `${Number(r.checkins)} ${c.checkins}`, `${Number(r.hours)} ${c.hours}`, ...(Number(r.trees) ? [`${Number(r.trees)} ${c.trees}`] : [])] }));
  const podium = rows.filter((r) => r.rank <= 3).slice(0, 3);
  const rest = rows.slice(podium.length);
  const myRow = (mine.data ?? [])[0];
  const hidden = !!(me.data as { hide_from_leaderboard?: boolean } | null)?.hide_from_leaderboard;

  const href = (o: Partial<SP>) => {
    const q = new URLSearchParams({ tab, period, ...(w ? { w: String(w) } : {}), ...o } as Record<string, string>);
    if (!q.get("w")) q.delete("w");
    return `/leaderboard?${q.toString()}`;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
      <Masthead eyebrow={tab === "clubs" ? c.clubs : c.volunteers} title={c.title} lede={c.lead} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex gap-1 rounded-2xl bg-slate-100 p-1" aria-label={c.title}>
          {([["volunteers", c.volunteers, Users], ["clubs", c.clubs, Building2]] as const).map(([k, label, Icon]) => (
            <Link key={k} href={href({ tab: k })} aria-current={tab === k ? "page" : undefined}
              className={cn("flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold", tab === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}>
              <Icon className="h-4 w-4" aria-hidden />{label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
            {([["month", c.month], ["all", c.all]] as const).map(([k, label]) => (
              <Link key={k} href={href({ period: k })} aria-current={period === k ? "true" : undefined}
                className={cn("rounded-lg px-3 py-1.5 text-xs font-bold", period === k ? "bg-slate-900 text-white" : "text-slate-600")}>{label}</Link>
            ))}
          </div>
          <WilayaFilter value={w} allLabel={c.allWilayas} locale={locale} />
        </div>
      </div>

      {tab === "volunteers" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {!viewer ? <Link href="/login?next=/leaderboard" className="font-bold underline">{c.login}</Link>
            : myRow ? <span className="font-bold">{c.myRank(Number(myRow.rank), Number(myRow.ranked))} · {Number(myRow.points)} {c.points}</span>
            : <span>{c.notRanked}</span>}
          {viewer && hidden && <span className="ms-2 inline-flex items-center gap-1 text-xs"><EyeOff className="h-3.5 w-3.5" aria-hidden /> {c.hidden}</span>}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{c.empty}</p>
      ) : (
        <>
          <ol className="grid grid-cols-3 items-end gap-2 sm:gap-4" aria-label="podium">
            {[podium[1], podium[0], podium[2]].map((r, i) => r ? (
              <li key={r.key} className={cn("flex flex-col items-center rounded-3xl border bg-white p-3 sm:p-5 text-center shadow-sm",
                i === 1 ? "border-amber-300 pb-8 sm:pb-12 ring-4 ring-amber-100" : "border-slate-200", r.isMe && "ring-4 ring-emerald-200")}>
                <span className={cn("flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full text-lg font-black",
                  r.rank === 1 ? "bg-amber-400 text-slate-900" : r.rank === 2 ? "bg-slate-300 text-slate-800" : "bg-orange-300 text-orange-950")}>
                  {r.rank === 1 ? <Trophy className="h-5 w-5" aria-hidden /> : <Medal className="h-5 w-5" aria-hidden />}
                </span>
                <span className="mt-2 text-[11px] font-bold text-slate-400">#{r.rank}</span>
                <span className="mt-1 line-clamp-2 text-sm sm:text-base font-black text-slate-900">{r.name}{r.isMe && <span className="ms-1 text-emerald-700">({c.you})</span>}</span>
                <span className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{r.sub}</span>
                <span className="mt-2 text-xl sm:text-2xl font-black tabular-nums text-slate-900">{r.points}</span>
                <span className="text-[10px] text-slate-500">{c.points}</span>
              </li>
            ) : <li key={`empty-${i}`} />)}
          </ol>

          {rest.length > 0 && (
            <ol className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200 bg-white">
              {rest.map((r) => (
                <li key={r.key} className={cn("flex items-center gap-3 px-4 py-3", r.isMe && "bg-emerald-50")}>
                  <span className="w-8 shrink-0 text-center text-sm font-black tabular-nums text-slate-400">{r.rank}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-slate-900">{r.name}{r.isMe && <span className="ms-1 text-xs text-emerald-700">({c.you})</span>}</div>
                    <div className="truncate text-[11px] text-slate-500">{[r.sub, ...r.stats].filter(Boolean).join(" · ")}</div>
                  </div>
                  <span className="shrink-0 text-lg font-black tabular-nums text-slate-900">{r.points}<span className="ms-1 text-[10px] font-semibold text-slate-400">{c.points}</span></span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm">
        <h2 className="flex items-center gap-2 font-black text-slate-900"><ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden /> {c.how}</h2>
        <ul className="mt-2 space-y-1 text-slate-600">{(tab === "clubs" ? c.rulesC : c.rulesV).map((x) => <li key={x} className="flex gap-2"><Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />{x}</li>)}</ul>
        <p className="mt-3 text-[11px] text-slate-500">{c.privacy}</p>
      </section>
    </div>
  );
}
