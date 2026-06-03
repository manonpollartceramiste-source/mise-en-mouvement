"use server";

import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getSupabaseServer } from "@/lib/supabase/server";

async function guardCoach() {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");
  return profile;
}

function done(clientId: string, tab: string, msg: string): never {
  redirect(
    `/os/coach/clients/${clientId}?tab=${tab}&saved=${encodeURIComponent(msg)}`,
  );
}

function fail(clientId: string, tab: string, msg: string): never {
  redirect(
    `/os/coach/clients/${clientId}?tab=${tab}&error=${encodeURIComponent(msg)}`,
  );
}

export async function createSessionAction(formData: FormData) {
  const profile = await guardCoach();
  const clientId = String(formData.get("client_id") ?? "");
  const scheduledAt = String(formData.get("scheduled_at") ?? "").trim();
  const durationMin = Math.max(1, Number(formData.get("duration_min") ?? 60));
  const location = String(formData.get("location") ?? "").trim() || null;
  const packId = String(formData.get("pack_id") ?? "").trim() || null;

  if (!scheduledAt) fail(clientId, "seances", "Date et heure obligatoires.");

  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("sessions").insert({
    client_id: clientId,
    coach_id: profile.id,
    scheduled_at: scheduledAt,
    duration_min: durationMin,
    location,
    pack_id: packId,
    status: "planifiée",
  });

  if (error) fail(clientId, "seances", error.message);
  done(clientId, "seances", "Séance ajoutée.");
}

export async function updateSessionStatusAction(formData: FormData) {
  const profile = await guardCoach();
  const clientId = String(formData.get("client_id") ?? "");
  const sessionId = String(formData.get("session_id") ?? "");
  const status = String(formData.get("status") ?? "");

  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from("sessions")
    .update({ status })
    .eq("id", sessionId)
    .eq("coach_id", profile.id);

  if (error) fail(clientId, "seances", error.message);
  done(clientId, "seances", "Statut mis à jour.");
}

export async function createNoteAction(formData: FormData) {
  const profile = await guardCoach();
  const clientId = String(formData.get("client_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!body) fail(clientId, "notes", "La note est vide.");

  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("coach_notes").insert({
    client_id: clientId,
    coach_id: profile.id,
    body,
    pinned: false,
  });

  if (error) fail(clientId, "notes", error.message);
  done(clientId, "notes", "Note ajoutée.");
}

export async function toggleNotePinnedAction(formData: FormData) {
  const profile = await guardCoach();
  const clientId = String(formData.get("client_id") ?? "");
  const noteId = String(formData.get("note_id") ?? "");
  const currentPinned = formData.get("pinned") === "true";

  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from("coach_notes")
    .update({ pinned: !currentPinned })
    .eq("id", noteId)
    .eq("coach_id", profile.id);

  if (error) fail(clientId, "notes", error.message);
  done(clientId, "notes", currentPinned ? "Note désépinglée." : "Note épinglée.");
}

export async function createMeasureAction(formData: FormData) {
  const profile = await guardCoach();
  const clientId = String(formData.get("client_id") ?? "");

  const num = (key: string) => {
    const v = String(formData.get(key) ?? "").trim();
    return v === "" ? null : Number(v);
  };

  const measuredAt =
    String(formData.get("measured_at") ?? "").trim() ||
    new Date().toISOString().split("T")[0];

  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("measures").insert({
    client_id: clientId,
    coach_id: profile.id,
    measured_at: measuredAt,
    weight_kg: num("weight_kg"),
    fat_pct: num("fat_pct"),
    muscle_pct: num("muscle_pct"),
    water_pct: num("water_pct"),
    bmi: num("bmi"),
    bmr_kcal: num("bmr_kcal"),
    waist_cm: num("waist_cm"),
    hip_cm: num("hip_cm"),
    notes: String(formData.get("notes") ?? "").trim() || null,
  });

  if (error) fail(clientId, "mesures", error.message);
  done(clientId, "mesures", "Mesure enregistrée.");
}

export async function createPackAction(formData: FormData) {
  const profile = await guardCoach();
  const clientId = String(formData.get("client_id") ?? "");
  const offerLabel = String(formData.get("offer_label") ?? "").trim();
  const total = Number(formData.get("total") ?? 0);
  const expiresAt = String(formData.get("expires_at") ?? "").trim() || null;

  if (!offerLabel || total <= 0)
    fail(clientId, "pack", "Intitulé et nombre de séances obligatoires.");

  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("session_packs").insert({
    client_id: clientId,
    coach_id: profile.id,
    offer_id: offerLabel.toLowerCase().replace(/\s+/g, "-"),
    offer_label: offerLabel,
    total,
    remaining: total,
    expires_at: expiresAt,
  });

  if (error) fail(clientId, "pack", error.message);
  done(clientId, "pack", "Pack créé.");
}

export async function createMovementTestAction(formData: FormData) {
  const profile = await guardCoach();
  const clientId = String(formData.get("client_id") ?? "");
  const testName = String(formData.get("test_name") ?? "").trim();
  const testType = String(formData.get("test_type") ?? "autre").trim();
  const result = String(formData.get("result") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const testedAt =
    String(formData.get("tested_at") ?? "").trim() ||
    new Date().toISOString().split("T")[0];

  if (!testName || !result) fail(clientId, "mouvement", "Nom et résultat obligatoires.");

  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("movement_tests").insert({
    client_id: clientId,
    coach_id: profile.id,
    tested_at: testedAt,
    test_name: testName,
    test_type: testType,
    result,
    unit,
    notes,
  });

  if (error) fail(clientId, "mouvement", error.message);
  done(clientId, "mouvement", "Test enregistré.");
}

export async function createGoalAction(formData: FormData) {
  const profile = await guardCoach();
  const clientId = String(formData.get("client_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const targetDate = String(formData.get("target_date") ?? "").trim() || null;

  if (!title) fail(clientId, "objectifs", "Le titre est obligatoire.");

  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("client_goals").insert({
    client_id: clientId,
    coach_id: profile.id,
    title,
    description,
    target_date: targetDate,
    status: "actif",
  });

  if (error) fail(clientId, "objectifs", error.message);
  done(clientId, "objectifs", "Objectif ajouté.");
}

export async function updateGoalStatusAction(formData: FormData) {
  const profile = await guardCoach();
  const clientId = String(formData.get("client_id") ?? "");
  const goalId = String(formData.get("goal_id") ?? "");
  const status = String(formData.get("status") ?? "");

  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from("client_goals")
    .update({
      status,
      achieved_at: status === "atteint" ? new Date().toISOString().split("T")[0] : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", goalId)
    .eq("coach_id", profile.id);

  if (error) fail(clientId, "objectifs", error.message);
  done(clientId, "objectifs", "Objectif mis à jour.");
}

