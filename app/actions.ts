"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/data";
import type { PipelineStage } from "@/lib/types/database";

/**
 * Move a lead to a new pipeline stage (used by the drag-and-drop board).
 * No-ops gracefully against the sample dataset when Supabase isn't configured;
 * the board keeps its optimistic state either way.
 */
export async function updateLeadStage(leadId: string, stage: PipelineStage) {
  if (!supabaseConfigured()) {
    return { ok: true, persisted: false };
  }
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({
        pipeline_stage: stage,
        stage_changed_at: new Date().toISOString(),
      })
      .eq("id", leadId);
    if (error) return { ok: false, persisted: false, error: error.message };
    revalidatePath("/");
    revalidatePath(`/leads/${leadId}`);
    return { ok: true, persisted: true };
  } catch (err) {
    return { ok: false, persisted: false, error: String(err) };
  }
}

/**
 * Manually enrol a lead into an automation sequence. Creates the first
 * pending step; the worker/cron that actually sends is a later feature.
 */
export async function triggerSequence(leadId: string, sequenceType: string) {
  if (!supabaseConfigured()) {
    return { ok: true, persisted: false };
  }
  try {
    const supabase = createClient();
    const { error } = await supabase.from("sequences").insert({
      lead_id: leadId,
      sequence_type: sequenceType,
      day_number: 0,
      status: "pending",
      scheduled_at: new Date().toISOString(),
    });
    if (error) return { ok: false, persisted: false, error: error.message };
    revalidatePath(`/leads/${leadId}`);
    return { ok: true, persisted: true };
  } catch (err) {
    return { ok: false, persisted: false, error: String(err) };
  }
}
