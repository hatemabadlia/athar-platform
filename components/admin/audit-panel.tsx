import { formatDate } from "@/lib/utils";

type Audit = { id: number; actor_id: string | null; action: string; entity: string; entity_id: string | null; wilaya_code: number | null; details: unknown; created_at: string };
type Run = { id: number; stage: string; mode: string; model: string | null; latency_ms: number | null; input_tokens: number | null; output_tokens: number | null; cost_usd: number | null; success: boolean; error: string | null; created_at: string };
type Integrations = { claude: boolean; embeddings: boolean; turnstile: boolean; telegram: boolean; whatsapp: boolean; sms: boolean; smsProvider: string; model: string };

export function AuditPanel({ audit, runs, integrations }: { audit: Audit[]; runs: Run[]; integrations: Integrations }) {
  const cost = runs.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0);
  const items: [string, boolean, string][] = [
    ["Claude API", integrations.claude, integrations.claude ? integrations.model : "وضع القواعد"],
    ["Embeddings (Voyage)", integrations.embeddings, "تشابه نصي فقط"],
    ["Turnstile", integrations.turnstile, "غير مفعّل"],
    ["Telegram", integrations.telegram, "غير مربوط"],
    ["WhatsApp Cloud API", integrations.whatsapp, "غير مربوط"],
    ["SMS", integrations.sms, `مزوّد: ${integrations.smsProvider} (لا إرسال حقيقي)`],
  ];
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="font-black text-slate-900 mb-3">التكاملات</h2>
        <div className="grid sm:grid-cols-3 gap-2 text-sm">{items.map(([n, ok, off]) => (
          <div key={n} className={`rounded-xl border p-3 ${ok ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}><div className="font-bold">{n}</div><div className="text-xs text-slate-600">{ok ? "مفعّل ✓" : off}</div></div>
        ))}</div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 overflow-x-auto">
        <h2 className="font-black text-slate-900 mb-1">قرارات الذكاء الاصطناعي (ai_runs)</h2>
        <p className="text-xs text-slate-500 mb-3">آخر {runs.length} عملية · التكلفة التقديرية: ${cost.toFixed(4)} · المدخلات مسجلة كبصمة (hash) فقط.</p>
        {runs.length === 0 ? <p className="text-sm text-slate-500">لا عمليات بعد.</p> : (
          <table className="w-full text-xs"><thead><tr className="text-right text-slate-500"><th className="p-1.5">الوقت</th><th className="p-1.5">المرحلة</th><th className="p-1.5">الوضع</th><th className="p-1.5">النموذج</th><th className="p-1.5">ms</th><th className="p-1.5">tokens</th><th className="p-1.5">النتيجة</th></tr></thead>
            <tbody>{runs.map((r) => <tr key={r.id} className="border-t border-slate-100"><td className="p-1.5">{formatDate(r.created_at)}</td><td className="p-1.5">{r.stage}</td><td className="p-1.5">{r.mode}</td><td className="p-1.5" dir="ltr">{r.model ?? "—"}</td><td className="p-1.5 tabular-nums">{r.latency_ms ?? "—"}</td><td className="p-1.5 tabular-nums">{r.input_tokens != null ? `${r.input_tokens}/${r.output_tokens}` : "—"}</td><td className="p-1.5">{r.success ? "✓" : <span className="text-red-700" title={r.error ?? ""}>✗</span>}</td></tr>)}</tbody></table>
        )}
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 overflow-x-auto">
        <h2 className="font-black text-slate-900 mb-3">سجل التدقيق</h2>
        {audit.length === 0 ? <p className="text-sm text-slate-500">لا أحداث ضمن صلاحيتك.</p> : (
          <table className="w-full text-xs"><thead><tr className="text-right text-slate-500"><th className="p-1.5">الوقت</th><th className="p-1.5">الإجراء</th><th className="p-1.5">الكيان</th><th className="p-1.5">الولاية</th><th className="p-1.5">المنفّذ</th><th className="p-1.5">تفاصيل</th></tr></thead>
            <tbody>{audit.map((a) => <tr key={a.id} className="border-t border-slate-100"><td className="p-1.5">{formatDate(a.created_at)}</td><td className="p-1.5 font-bold">{a.action}</td><td className="p-1.5">{a.entity}</td><td className="p-1.5">{a.wilaya_code ?? "—"}</td><td className="p-1.5 font-mono" dir="ltr">{a.actor_id?.slice(0, 8) ?? "system"}</td><td className="p-1.5 font-mono text-[10px]" dir="ltr">{JSON.stringify(a.details).slice(0, 80)}</td></tr>)}</tbody></table>
        )}
      </section>
    </div>
  );
}
