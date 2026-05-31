"use server";

import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { MovementAssessment } from "@/lib/os/types";

async function guardCoach() {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");
  return profile;
}

type AssessmentPayload = Omit<
  MovementAssessment,
  "id" | "coach_id" | "created_at" | "updated_at"
>;

export async function createAssessmentAction(
  payload: AssessmentPayload,
): Promise<{ id?: string; error?: string }> {
  const profile = await guardCoach();
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("movement_assessments")
    .insert({ ...payload, coach_id: profile.id })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}

export async function updateAssessmentAction(
  id: string,
  payload: Partial<AssessmentPayload>,
): Promise<{ error?: string }> {
  const profile = await guardCoach();
  const supabase = await getSupabaseServer();
  const isAdmin = profile.roles.includes("admin");

  const q = supabase
    .from("movement_assessments")
    .update(payload)
    .eq("id", id);

  const { error } = await (isAdmin ? q : q.eq("coach_id", profile.id));
  if (error) return { error: error.message };
  return {};
}

export async function deleteAssessmentAction(
  id: string,
): Promise<{ error?: string }> {
  const profile = await guardCoach();
  const supabase = await getSupabaseServer();
  const isAdmin = profile.roles.includes("admin");

  const q = supabase.from("movement_assessments").delete().eq("id", id);

  const { error } = await (isAdmin ? q : q.eq("coach_id", profile.id));
  if (error) return { error: error.message };
  return {};
}
