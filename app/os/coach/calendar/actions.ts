"use server";

import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { SessionStatus } from "@/lib/os/types";

async function guardCoach() {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");
  return profile;
}

export async function createCalendarSessionAction(payload: {
  client_id: string;
  scheduled_at: string;
  duration_min: number;
  location: string;
  summary: string;
}): Promise<{ error?: string }> {
  if (!payload.client_id || !payload.scheduled_at) {
    return { error: "Données manquantes" };
  }

  const profile = await guardCoach();
  const supabase = await getSupabaseServer();

  const { data: pack } = await supabase
    .from("session_packs")
    .select("id, offer_id, remaining")
    .eq("client_id", payload.client_id)
    .gt("remaining", 0)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("sessions").insert({
    client_id: payload.client_id,
    coach_id: profile.id,
    scheduled_at: payload.scheduled_at,
    duration_min: payload.duration_min,
    location: payload.location || null,
    summary: payload.summary || null,
    status: "planifiée",
    pack_id: pack?.id ?? null,
    offer_id: pack?.offer_id ?? null,
  });

  if (error) return { error: error.message };
  return {};
}

export async function updateCalendarSessionAction(
  sessionId: string,
  updates: {
    status: SessionStatus;
    summary: string;
    location: string;
    scheduled_at: string;
    duration_min: number;
  },
): Promise<{ error?: string }> {
  const profile = await guardCoach();
  const supabase = await getSupabaseServer();
  const isAdmin = profile.roles.includes("admin");

  const q = supabase
    .from("sessions")
    .update({
      status: updates.status,
      summary: updates.summary || null,
      location: updates.location || null,
      scheduled_at: updates.scheduled_at,
      duration_min: updates.duration_min,
    })
    .eq("id", sessionId);

  const { error } = await (isAdmin ? q : q.eq("coach_id", profile.id));
  if (error) return { error: error.message };
  return {};
}

export async function moveSessionAction(
  sessionId: string,
  newScheduledAt: string,
): Promise<{ error?: string }> {
  const profile = await guardCoach();
  const supabase = await getSupabaseServer();
  const isAdmin = profile.roles.includes("admin");

  const q = supabase
    .from("sessions")
    .update({ scheduled_at: newScheduledAt })
    .eq("id", sessionId);

  const { error } = await (isAdmin ? q : q.eq("coach_id", profile.id));
  if (error) return { error: error.message };
  return {};
}

export async function deleteSessionAction(
  sessionId: string,
): Promise<{ error?: string }> {
  const profile = await guardCoach();
  const supabase = await getSupabaseServer();
  const isAdmin = profile.roles.includes("admin");

  const q = supabase.from("sessions").delete().eq("id", sessionId);

  const { error } = await (isAdmin ? q : q.eq("coach_id", profile.id));
  if (error) return { error: error.message };
  return {};
}
