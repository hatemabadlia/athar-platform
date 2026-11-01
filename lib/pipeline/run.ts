import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { findWilaya } from "@/lib/wilayas";
import { claudeProvider } from "./claude";
import { embeddingProvider, toPgVector } from "./embeddings";
import { contentHash, keyedHash, sha256 } from "./hash";
import { heuristicAnalyze } from "./heuristic";
import { sanitizeAnalysis } from "./sanitize";
import { bestDuplicate, bestRecycled, scoreCredibility, THRESHOLDS } from "./scoring";
import { canonicalText, formatPhone } from "./text";
import {
  STAGE_LABELS,
  type ActiveCandidate, type Analysis, type AnalysisMode, type CredibilityReason,
  type HistoricalCandidate, type StageResult, type Verdict,
} from "./types";

export interface PipelineOutcome {
  intakeId: string;
  alertId: string | null;
  linkedTo: string | null;
  verdict: Verdict;
  mode: AnalysisMode;
  score: number;
  reasons: CredibilityReason[];
  stages: StageResult[];
  analysis: Analysis;
  recycled: HistoricalCandidate | null;
  duplicate: (ActiveCandidate & { autoLink: boolean }) | null;
  review: string[];
}

const now = () => performance.now();

async function logRun(row: {
  intake_item_id: string; stage: string; mode: "claude" | "heuristic" | "embedding"; model?: string | null;
  input_hash: string; output?: unknown; latency_ms: number; input_tokens?: number | null; output_tokens?: number | null;
  cost_usd?: number | null; success: boolean; error?: string | null;
}) {
  // Output stored is the structured result only (no raw message, phone numbers masked); input is referenced by hash.
  const out = row.output && typeof row.output === "object" && "phone_numbers" in (row.output as object)
    ? { ...(row.output as Record<string, unknown>), phone_numbers: ((row.output as { phone_numbers: string[] }).phone_numbers ?? []).map(() => "•••"),
        normalized_text: "[redacted]" }
    : row.output;
  await supabaseAdmin().from("ai_runs").insert({ ...row, output: (out ?? null) as never });
}

/** Runs the 7-stage pipeline on one queued intake item and persists the result. Idempotent per item. */
export async function processIntake(intakeId: string): Promise<PipelineOutcome> {
  const db = supabaseAdmin();
  const { data: item, error } = await db.from("intake_items").select("*").eq("id", intakeId).single();
  if (error || !item) throw new Error(`intake item not found: ${intakeId}`);
  if (item.status === "processed" && item.pipeline) return item.pipeline as unknown as PipelineOutcome;

  await db.from("intake_items").update({ status: "processing", error: null }).eq("id", intakeId);
  const stages: StageResult[] = [];
  const raw = item.raw_text;
  const inputHash = sha256(raw);

  try {
    // 1 — ingest
    stages.push({ id: "ingest", labelAr: STAGE_LABELS.ingest, status: "done", durationMs: 0,
      detail: `قناة: ${item.channel}${item.source_label ? ` · ${item.source_label}` : ""} · ${raw.length} حرف` });

    // 2–4 — normalisation, extraction, classification (one structured call, or rules)
    let mode: AnalysisMode = "heuristic";
    let analysis: Analysis;
    const t0 = now();
    const provider = claudeProvider();
    let providerNote = "لا يوجد مفتاح Claude — تحليل بالقواعد";
    if (provider) {
      try {
        const r = await provider.analyze(raw);
        analysis = r.analysis;
        mode = "claude";
        providerNote = `Claude (${r.model})`;
        await logRun({ intake_item_id: intakeId, stage: "analyze", mode: "claude", model: r.model, input_hash: inputHash,
          output: r.analysis, latency_ms: Math.round(now() - t0), input_tokens: r.inputTokens, output_tokens: r.outputTokens,
          cost_usd: r.costUsd, success: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await logRun({ intake_item_id: intakeId, stage: "analyze", mode: "claude", model: null, input_hash: inputHash,
          latency_ms: Math.round(now() - t0), success: false, error: msg.slice(0, 500) });
        analysis = heuristicAnalyze(raw);
        providerNote = `فشل Claude (${msg.slice(0, 80)}) — تحليل بالقواعد`;
      }
    } else {
      analysis = heuristicAnalyze(raw);
    }
    if (mode === "heuristic") {
      await logRun({ intake_item_id: intakeId, stage: "analyze", mode: "heuristic", input_hash: inputHash,
        output: analysis, latency_ms: Math.round(now() - t0), success: true });
    }
    const { analysis: clean, dropped } = sanitizeAnalysis(analysis, raw);
    analysis = clean;
    const tAnalysis = Math.round(now() - t0);

    stages.push({ id: "normalize", labelAr: STAGE_LABELS.normalize, mode, durationMs: tAnalysis, status: "done",
      detail: analysis.darija_terms.length
        ? `${providerNote} · ${analysis.darija_terms.length} مصطلح دارج: ${analysis.darija_terms.slice(0, 4).map((t) => `${t.from}←${t.to}`).join("، ")}`
        : `${providerNote} · لا مصطلحات دارجة` });
    const wilaya = analysis.wilaya_code ? findWilaya(analysis.wilaya_code) ?? null : null;
    const ents = [
      wilaya && `الولاية: ${wilaya.nameAr}`, analysis.baladiya && `البلدية: ${analysis.baladiya}`,
      ...analysis.phone_numbers.map((p) => `هاتف: ${formatPhone(p)}`), analysis.blood_type && `فصيلة: ${analysis.blood_type}`,
      analysis.quantity && `العدد: ${analysis.quantity}`, analysis.deadline_text && `الموعد: ${analysis.deadline_text}`,
      analysis.institution && `مؤسسة: ${analysis.institution}`,
    ].filter(Boolean);
    stages.push({ id: "entities", labelAr: STAGE_LABELS.entities, mode, durationMs: 0,
      status: dropped.length ? "warning" : "done",
      detail: (ents.length ? ents.join(" · ") : "لا كيانات واضحة") + (dropped.length ? ` · حُذفت ${dropped.length} قيمة غير موجودة في النص` : "") });
    stages.push({ id: "classify", labelAr: STAGE_LABELS.classify, mode, durationMs: 0,
      status: analysis.category ? "done" : "warning",
      detail: `الفئة: ${analysis.category ?? "غير محددة"} · الاستعجال: ${analysis.urgency} · الثقة ${Math.round(analysis.confidence * 100)}%` });

    // 5 — recycled content
    const canonical = canonicalText(raw);
    const hash = contentHash(raw);
    const phoneHashes = analysis.phone_numbers.map(keyedHash);
    let embedding: number[] | null = null;
    const emb = embeddingProvider();
    const t5 = now();
    if (emb) {
      try {
        embedding = await emb.embed(analysis.normalized_text || raw);
        await logRun({ intake_item_id: intakeId, stage: "embed", mode: "embedding", model: emb.name, input_hash: inputHash,
          latency_ms: Math.round(now() - t5), success: true });
      } catch (e) {
        await logRun({ intake_item_id: intakeId, stage: "embed", mode: "embedding", model: emb.name, input_hash: inputHash,
          latency_ms: Math.round(now() - t5), success: false, error: String(e).slice(0, 500) });
      }
    }
    const { data: hist, error: hErr } = await db.rpc("match_historical", {
      p_text: canonical, p_hash: hash, p_phone_hashes: phoneHashes, p_embedding: toPgVector(embedding) as never, p_limit: 5 });
    if (hErr) throw hErr;
    const { count: archiveSize } = await db.from("historical_posts").select("*", { count: "exact", head: true });
    const recycled = bestRecycled((hist ?? []) as HistoricalCandidate[]);
    stages.push({ id: "recycle", labelAr: STAGE_LABELS.recycle, mode: "sql", durationMs: Math.round(now() - t5),
      status: recycled ? "warning" : "done",
      detail: recycled
        ? `تطابق ${recycled.exact ? "تام" : `${Math.round(recycled.text_similarity * 100)}%`} مع محتوى رُصد في ${recycled.first_seen_at.slice(0, 10)} (شوهد ${recycled.times_seen} مرة)`
        : `قورن مع ${archiveSize ?? 0} سجل في الأرشيف${embedding ? " (تضمين دلالي + نص)" : " (تشابه نصي + بصمة + هاتف؛ لا تضمين دلالي)"} — لا تطابق` });

    // 6 — duplicates among active alerts
    const t6 = now();
    let duplicate: PipelineOutcome["duplicate"] = null;
    if (analysis.category) {
      const { data: act, error: aErr } = await db.rpc("match_active_alerts", {
        p_text: canonical, p_phone_hashes: phoneHashes, p_wilaya: analysis.wilaya_code as never,
        p_category: analysis.category, p_embedding: toPgVector(embedding) as never, p_days: 21, p_limit: 5 });
      if (aErr) throw aErr;
      duplicate = bestDuplicate((act ?? []) as ActiveCandidate[]);
    }
    stages.push({ id: "dedupe", labelAr: STAGE_LABELS.dedupe, mode: "sql", durationMs: Math.round(now() - t6),
      status: duplicate ? "warning" : "done",
      detail: duplicate
        ? `تشابه ${Math.round(duplicate.text_similarity * 100)}% مع «${duplicate.title}»${duplicate.autoLink ? " — رُبط كمصدر إضافي" : " — يُقترح الدمج على المشرف"}`
        : analysis.category ? "لا يوجد نداء نشط مشابه (آخر 21 يوماً)" : "تم التخطي (الفئة غير محددة)" });

    // 7 — explainable credibility
    let verifiedAssociation = false;
    if (item.submitter_id) {
      const { data: roles } = await db.from("user_roles").select("role").eq("user_id", item.submitter_id).eq("role", "association");
      verifiedAssociation = !!roles?.length;
    }
    const { score, reasons, verdict, review } = scoreCredibility({
      analysis, mode, channel: item.channel, verifiedAssociation, wilayaMatched: !!wilaya, recycled, duplicate });
    stages.push({ id: "score", labelAr: STAGE_LABELS.score, durationMs: 0, status: score < 50 ? "warning" : "done",
      detail: `${score}/100 · ${reasons.filter((r) => r.delta !== 0).length} عوامل · للفرز فقط، ليس دليلاً على صحة النداء` });

    // persist
    let alertId: string | null = null;
    let linkedTo: string | null = null;
    if (duplicate?.autoLink && !recycled) {
      linkedTo = duplicate.id;
      await db.from("alert_sources").insert({ alert_id: duplicate.id, intake_item_id: intakeId, channel: item.channel,
        url: item.source_url, similarity: duplicate.text_similarity });
      const { data: cur } = await db.from("alerts").select("source_count").eq("id", duplicate.id).single();
      await db.from("alerts").update({ source_count: (cur?.source_count ?? 1) + 1 }).eq("id", duplicate.id);
    } else {
      const { data: inserted, error: insErr } = await db.from("alerts").insert({
        title: analysis.title || "نداء",
        summary: analysis.summary,
        original_text: raw,
        normalized_text: analysis.normalized_text,
        canonical_text: canonical,
        content_hash: hash,
        darija_terms: analysis.darija_terms,
        category: analysis.category ?? "relief",
        urgency: analysis.urgency,
        status: "pending",
        verdict,
        wilaya_code: wilaya?.code ?? null,
        baladiya_name: analysis.baladiya,
        institution_name: analysis.institution,
        // public point = wilaya centroid (people's locations are never published more precisely)
        lat: wilaya?.lat ?? null,
        lng: wilaya?.lng ?? null,
        location_precision: "wilaya",
        blood_type: analysis.blood_type,
        quantity: analysis.quantity,
        contact_name: analysis.contact_name,
        volunteers_needed: analysis.quantity ?? 0,
        credibility_score: score,
        credibility_reasons: reasons as never,
        ai_mode: mode,
        ai_confidence: analysis.confidence,
        needs_review_reasons: analysis.category ? review : [...review, "الفئة الافتراضية «إغاثة» — صحّحها."],
        owner_id: item.submitter_id,
        first_seen_at: recycled?.first_seen_at ?? null,
        embedding: toPgVector(embedding) as never,
      }).select("id").single();
      if (insErr || !inserted) throw insErr ?? new Error("alert insert failed");
      alertId = inserted.id;
      const contactPhone = analysis.phone_numbers[0] ?? null;
      const { data: formContact } = await db.from("intake_contacts").select("phone").eq("intake_item_id", intakeId).maybeSingle();
      const phone = contactPhone ?? formContact?.phone ?? null;
      await db.from("alert_contacts").insert({ alert_id: alertId, phone, phone_hash: phone ? keyedHash(phone) : null });
      await db.from("alert_sources").insert({ alert_id: alertId, intake_item_id: intakeId, channel: item.channel, url: item.source_url });
    }

    const outcome: PipelineOutcome = { intakeId, alertId, linkedTo, verdict, mode, score, reasons, stages, analysis, recycled, duplicate, review };
    // Stored pipeline output omits nothing sensitive beyond what the alert already holds; phones are in alert_contacts.
    const stored = { ...outcome, analysis: { ...analysis, phone_numbers: analysis.phone_numbers.map(() => "•••") } };
    await db.from("intake_items").update({
      status: "processed", processed_at: new Date().toISOString(), alert_id: alertId ?? linkedTo, pipeline: stored as never,
      wilaya_code: wilaya?.code ?? null,
    }).eq("id", intakeId);
    return outcome;
  } catch (e) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    await db.from("intake_items").update({ status: "failed", error: msg.slice(0, 500), pipeline: { stages } as never }).eq("id", intakeId);
    throw e;
  }
}

export { THRESHOLDS };
