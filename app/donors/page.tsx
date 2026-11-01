import Link from "next/link";
import { Droplets } from "lucide-react";
import { getMyProfile } from "@/lib/data/profile";
import { supabaseServer } from "@/lib/supabase/server";
import { DonorClient } from "@/components/modules/donor-client";
import { compatibleDonors, RED_CELL_COMPATIBILITY } from "@/lib/matching";
import type { BloodType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "شبكة المتبرعين بالدم" };

export default async function DonorsPage() {
  const profile = await getMyProfile();
  const supabase = await supabaseServer();
  const [{ data: donor }, { data: donations }, { data: interval }] = await Promise.all([
    profile ? supabase.from("blood_donors").select("*").eq("user_id", profile.id).maybeSingle() : Promise.resolve({ data: null }),
    profile ? supabase.from("blood_donations").select("id, donated_on, institution, confirmed_at").eq("user_id", profile.id).order("donated_on", { ascending: false }) : Promise.resolve({ data: [] }),
    supabase.from("app_settings").select("value, source").eq("key", "blood_min_interval_days").maybeSingle(),
  ]);
  const bt = profile?.bloodType as BloodType | null;
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-5">
      <section className="rounded-3xl bg-gradient-to-l from-rose-600 to-rose-900 p-6 text-white">
        <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-black"><Droplets className="h-7 w-7" aria-hidden /> شبكة المتبرعين بالدم</h1>
        <p className="mt-2 text-sm text-white/85 max-w-2xl">سجّل كمتبرع ليُخطرك المشرفون عند نداء دم متوافق مع فصيلتك في ولايتك. هويتك ورقمك لا يظهران لأحد. الأهلية الطبية يقررها مركز حقن الدم وحده.</p>
      </section>
      {!profile ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm"><Link href="/login?next=/donors" className="font-bold text-brand-700 underline">سجّل الدخول</Link> للتسجيل في الشبكة.</div>
      ) : (
        <DonorClient
          bloodType={bt}
          defaultWilaya={profile.wilayaCode ?? 16}
          donor={donor ? { wilayaCode: donor.wilaya_code, available: donor.available, lastDonationOn: donor.last_donation_at } : null}
          donations={(donations ?? []).map((d) => ({ id: d.id, on: d.donated_on, institution: d.institution, confirmed: !!d.confirmed_at }))}
          interval={interval ? { days: Number(interval.value), source: interval.source } : null}
        />
      )}
      {bt && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm">
          <h2 className="font-black mb-2">توافق فصيلتك ({bt}) — الكريات الحمراء</h2>
          <p>يمكنك التبرع لـ: <b dir="ltr">{RED_CELL_COMPATIBILITY[bt].join(", ")}</b></p>
          <p>يمكنك الاستقبال من: <b dir="ltr">{compatibleDonors(bt).join(", ")}</b></p>
          <p className="mt-2 text-[11px] text-slate-500">مرجع عام لقواعد ABO/RhD للكريات الحمراء؛ البلازما والصفائح لها قواعد مختلفة. القرار الطبي للمختصين.</p>
        </section>
      )}
    </div>
  );
}
