import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { contentHash } from "@/lib/pipeline/hash";
import { processIntake, type PipelineOutcome } from "@/lib/pipeline/run";

export type IntakeChannel = "web_form" | "telegram" | "whatsapp" | "rss" | "moderator_paste" | "api";

export interface NewIntake {
  channel: IntakeChannel;
  text: string;
  externalId?: string | null;
  sourceUrl?: string | null;
  sourceLabel?: string | null;
  submitterId?: string | null;
  contact?: { name?: string | null; phone?: string | null } | null;
  consentVersion?: string | null;
}

/**
 * Stores an inbound message in the intake queue (idempotent on channel+externalId), then runs
 * the pipeline. Pipeline failures leave the item in status "failed" for a moderator to retry.
 */
export async function enqueueAndProcess(input: NewIntake): Promise<{ intakeId: string; duplicate: boolean; outcome: PipelineOutcome | null; error?: string }> {
  const db = supabaseAdmin();
  const text = input.text.trim();
  const { data, error } = await db.from("intake_items").upsert({
    channel: input.channel, raw_text: text, content_hash: contentHash(text),
    external_id: input.externalId ?? null, source_url: input.sourceUrl ?? null,
    source_label: input.sourceLabel ?? null, submitter_id: input.submitterId ?? null,
  }, { onConflict: "channel,external_id", ignoreDuplicates: true }).select("id").maybeSingle();
  if (error) throw error;
  if (!data) {
    const { data: existing } = await db.from("intake_items").select("id").eq("channel", input.channel).eq("external_id", input.externalId ?? "").maybeSingle();
    return { intakeId: existing?.id ?? "", duplicate: true, outcome: null };
  }
  const intakeId = data.id;
  if (input.contact && (input.contact.name || input.contact.phone)) {
    await db.from("intake_contacts").insert({ intake_item_id: intakeId, name: input.contact.name ?? null, phone: input.contact.phone ?? null });
  }
  if (input.consentVersion) {
    await db.from("consents").insert({ user_id: input.submitterId ?? null, intake_item_id: intakeId, purpose: "public_submission", version: input.consentVersion });
  }
  try {
    const outcome = await processIntake(intakeId);
    return { intakeId, duplicate: false, outcome };
  } catch (e) {
    return { intakeId, duplicate: false, outcome: null, error: e instanceof Error ? e.message : "pipeline failed" };
  }
}
