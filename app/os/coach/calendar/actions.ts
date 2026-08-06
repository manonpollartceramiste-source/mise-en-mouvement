"use server";

import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabase/server";
import type { SessionStatus } from "@/lib/os/types";
import {
  hasSessionConflictForCoach,
  hasBookingConflictGlobal,
} from "@/lib/supabase/booking.server";

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

  const startsAt = new Date(payload.scheduled_at);
  if (isNaN(startsAt.getTime())) return { error: "Date invalide" };
  const endsAt = new Date(startsAt.getTime() + payload.duration_min * 60_000);

  // Backend conflict check — frontend warning is not enough
  const [bookingConflict, sessionConflict] = await Promise.all([
    hasBookingConflictGlobal(startsAt, endsAt),
    hasSessionConflictForCoach(profile.id, startsAt, endsAt),
  ]);

  if (bookingConflict) return { error: "Créneau déjà occupé par une réservation en ligne" };
  if (sessionConflict) return { error: "Conflit horaire avec une autre séance de ce coach" };

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

  if (error) {
    // Map DB trigger errors (cross-table protection)
    if (error.message.includes("réservation en ligne") || error.message.includes("sessions_no_overlap")) {
      return { error: "Créneau déjà occupé par une réservation en ligne" };
    }
    if (error.message.includes("séance") || error.message.includes("trg_session")) {
      return { error: "Conflit horaire avec une autre séance" };
    }
    return { error: error.message };
  }
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

  // Only run conflict check if the new status still occupies the slot
  const blocksSlot = updates.status !== "annulée" && updates.status !== "no_show";

  if (blocksSlot) {
    const startsAt = new Date(updates.scheduled_at);
    if (isNaN(startsAt.getTime())) return { error: "Date invalide" };
    const endsAt = new Date(startsAt.getTime() + updates.duration_min * 60_000);

    const [bookingConflict, sessionConflict] = await Promise.all([
      hasBookingConflictGlobal(startsAt, endsAt),
      // Exclude the session being updated (self)
      hasSessionConflictForCoach(profile.id, startsAt, endsAt, sessionId),
    ]);

    if (bookingConflict) return { error: "Créneau déjà occupé par une réservation en ligne" };
    if (sessionConflict) return { error: "Conflit horaire avec une autre séance de ce coach" };
  }

  const supabase = await getSupabaseServer();

  const { error } = await supabase
    .from("sessions")
    .update({
      status: updates.status,
      summary: updates.summary || null,
      location: updates.location || null,
      scheduled_at: updates.scheduled_at,
      duration_min: updates.duration_min,
    })
    .eq("id", sessionId);

  if (error) {
    if (error.message.includes("réservation en ligne") || error.message.includes("sessions_no_overlap")) {
      return { error: "Créneau déjà occupé par une réservation en ligne" };
    }
    if (error.message.includes("séance") || error.message.includes("trg_session")) {
      return { error: "Conflit horaire avec une autre séance" };
    }
    return { error: error.message };
  }
  return {};
}

export async function moveSessionAction(
  sessionId: string,
  newScheduledAt: string,
): Promise<{ error?: string }> {
  const profile = await guardCoach();

  const startsAt = new Date(newScheduledAt);
  if (isNaN(startsAt.getTime())) return { error: "Date invalide" };

  // Read current session duration (needed to compute endsAt)
  const supabaseAdmin = getSupabaseAdmin();
  const { data: session, error: readError } = await supabaseAdmin
    .from("sessions")
    .select("duration_min, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (readError || !session) {
    return { error: readError?.message ?? "Séance introuvable" };
  }

  // A cancelled/no-show session being moved is unusual but we still check if it would now conflict
  const durationMin = (session as { duration_min: number }).duration_min;
  const endsAt = new Date(startsAt.getTime() + durationMin * 60_000);

  const [bookingConflict, sessionConflict] = await Promise.all([
    hasBookingConflictGlobal(startsAt, endsAt),
    hasSessionConflictForCoach(profile.id, startsAt, endsAt, sessionId),
  ]);

  if (bookingConflict) return { error: "Créneau déjà occupé par une réservation en ligne" };
  if (sessionConflict) return { error: "Conflit horaire avec une autre séance de ce coach" };

  const supabase = await getSupabaseServer();

  const { error } = await supabase
    .from("sessions")
    .update({ scheduled_at: newScheduledAt })
    .eq("id", sessionId);

  if (error) {
    if (error.message.includes("réservation en ligne") || error.message.includes("sessions_no_overlap")) {
      return { error: "Créneau déjà occupé par une réservation en ligne" };
    }
    if (error.message.includes("séance") || error.message.includes("trg_session")) {
      return { error: "Conflit horaire avec une autre séance" };
    }
    return { error: error.message };
  }
  return {};
}

export async function deleteSessionAction(
  sessionId: string,
): Promise<{ error?: string }> {
  await guardCoach();
  const supabase = await getSupabaseServer();

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId);

  if (error) return { error: error.message };
  return {};
}
