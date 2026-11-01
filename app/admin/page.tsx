"use client";

import { useState } from "react";
import { ShieldCheck, Download, Bell } from "lucide-react";
import { StatsCards } from "@/components/admin/stats-cards";
import { AlertsTable } from "@/components/admin/alerts-table";
import { WilayaChart } from "@/components/admin/wilaya-chart";
import { ActivityFeed } from "@/components/admin/activity-feed";
import { ClubsSummary } from "@/components/admin/clubs-summary";
import { CrisisPanel } from "@/components/admin/crisis-panel";
import { Forecasts } from "@/components/admin/forecasts";
import { TreeReview } from "@/components/admin/tree-review";
import { Button } from "@/components/ui/button";
import { useAthar } from "@/lib/store";

export default function AdminPage() {
  const [preset, setPreset] = useState("all");
  const { stats, trees } = useAthar();
  const pendingTrees = trees.filter((t) => t.status === "pending").length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
            <ShieldCheck className="h-3.5 w-3.5" /> وزارة الشباب · مديرية الشباب والرياضة والترفيه لولاية الجزائر
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">لوحة القيادة والمتابعة</h1>
          <p className="text-sm text-slate-600">مراجعة النداءات المصنفة آلياً، اعتمادها، أو تصفيتها.</p>
        </div>
        <div className="flex items-center gap-2">
          {stats.pending > 0 && (
            <button onClick={() => setPreset("all")} className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
              <Bell className="h-4 w-4 animate-pulse" /> {stats.pending} بانتظار المراجعة
            </button>
          )}
          {pendingTrees > 0 && <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">🌳 {pendingTrees} شجرة للمراجعة</span>}
          <Button variant="outline" size="sm"><Download className="h-4 w-4" /> تصدير التقرير</Button>
        </div>
      </div>

      <StatsCards onSelect={setPreset} active={preset} />

      <CrisisPanel />

      <TreeReview />

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <AlertsTable statusPreset={preset} />
        <div className="space-y-6">
          <Forecasts />
          <WilayaChart />
          <ClubsSummary />
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
