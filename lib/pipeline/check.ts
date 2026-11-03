import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { findWilaya } from "@/lib/wilayas";
import { aiProvider } from "./provider";
import { embeddingProvider, toPgVector } from "./embeddings";
import { contentHash, keyedHash, sha256 } from "./hash";
import { heuristicAnalyze } from "./heuristic";
import { sanitizeAnalysis } from "./sanitize";
import { bestDuplicate, bestRecycled } from "./scoring";
import { canonicalText } from "./text";
import type { ActiveCandidate, Analysis, AnalysisMode, HistoricalCandidate } from "./types";
import { verifyVerdict, type VerifyResult } from "./verify";

export interface CheckOutcome extends VerifyResult {
  mode: AnalysisMode;
  model: string | null;
  durationMs: number;
  understood: {
    msa: string;
    darijaTerms: { from: string; to: string }[];
    category: string | null;
    urgency: string;
    wilaya: string | null;
    bloodType: string | null;
    hasPhone: boolean;
  };
}

/**
 * Read-only version of pipeline stages 2–6 for the public "Is this post real?" page.
 * Nothing is stored except an `ai_runs` audit row (hash of the input, never the text or phone numbers).
 */
export async function checkPost(raw: string): Promise<CheckOutcome> {
  const db = supabaseAdmin();
  const started = performance.now();
  const inputHash = sha256(raw);

  let mode: AnalysisMode = "heuristic";
  let model: string | null = null;
  let analysis: Analysis;
  const provider = aiProvider();
  if (provider) {
    try {
      const r = await provider.analyze(raw);
      analysis = r.analysis; mode = provider.name; model = r.model;
      await db.from("ai_runs").insert({ stage: "verify", mode: provider.name, model: r.model, input_hash: inputHash,
        latency_ms: Math.round(performance.now() - started), input_tokens: r.inputTokens, output_tokens: r.outputTokens,
        cost_usd: r.costUsd, success: true });
    } catch (e) {
      await db.from("ai_runs").insert({ stage: "verify", mode: provider.name, input_hash: inputHash,
        latency_ms: Math.round(performance.now() - started), success: false, error: String(e).slice(0, 300) });
      analysis = heuristicAnalyze(raw);
    }
  } else {
    analysis = heuristicAnalyze(raw);
  }
  analysis = sanitizeAnalysis(analysis, raw).analysis;

  const canonical = canonicalText(raw);
  const phoneHashes = analysis.phone_numbers.map(keyedHash);
  let embedding: number[] | null = null;
  const emb = embeddingProvider();
  if (emb) embedding = await emb.embed(analysis.normalized_text || raw).catch(() => null);

  const [{ data: hist, error: hErr }, { count: archiveSize }] = await Promise.all([
    db.rpc("match_historical", { p_text: canonical, p_hash: contentHash(raw), p_phone_hashes: phoneHashes,
      p_embedding: toPgVector(embedding) as never, p_limit: 5 }),
    db.from("historical_posts").select("*", { count: "exact", head: true }),
  ]);
  if (hErr) throw hErr;
  const recycled = bestRecycled((hist ?? []) as HistoricalCandidate[]);

  let duplicate: ActiveCandidate | null = null;
  if (analysis.category) {
    const { data: act, error: aErr } = await db.rpc("match_active_alerts", {
      p_text: canonical, p_phone_hashes: phoneHashes, p_wilaya: analysis.wilaya_code as never,
      p_category: analysis.category, p_embedding: toPgVector(embedding) as never, p_days: 21, p_limit: 5 });
    if (aErr) throw aErr;
    duplicate = bestDuplicate((act ?? []) as ActiveCandidate[]);
  }

  const verdict = verifyVerdict({ analysis, recycled, duplicate, archiveSize: archiveSize ?? 0 });
  const wilaya = analysis.wilaya_code ? findWilaya(analysis.wilaya_code) : undefined;
  return {
    ...verdict, mode, model, durationMs: Math.round(performance.now() - started),
    understood: {
      msa: analysis.normalized_text, darijaTerms: analysis.darija_terms.slice(0, 8), category: analysis.category,
      urgency: analysis.urgency, wilaya: wilaya?.nameAr ?? null, bloodType: analysis.blood_type, hasPhone: analysis.phone_numbers.length > 0,
    },
  };
}
