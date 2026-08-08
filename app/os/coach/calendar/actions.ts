"use server";

import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabase/server";
import type { SessionStatus } from "@/lib/os/types";
import {
  hasSessionConflictForCoach,
  hasBookingConflictGlobal,
  getAllBookingsInRange,
} from "@/lib/supabase/booking.server";
import { computeWeeklyOccurrences, hasInMemoryConflict } from "@/lib/booking/recurring";

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

// ── Résultat de création de séances récurrentes ──────────────────────────────

export type RecurringSessionResult = {
  created: number;
  skipped: Array<{ scheduledAt: string; reason: string }>;
};

// ── Création de séances récurrentes ──────────────────────────────────────────

export async function createRecurringSessionsAction(payload: {
  client_id: string;
  scheduled_at: string;   // ISO UTC — première occurrence
  duration_min: number;
  location: string;
  summary: string;
  repeat_until: string;   // "YYYY-MM-DD" — date Paris (inclusive)
}): Promise<{ result?: RecurringSessionResult; error?: string }> {
  if (!payload.client_id || !payload.scheduled_at || !payload.repeat_until) {
    return { error: "Données manquantes" };
  }

  const profile = await guardCoach();

  if (isNaN(new Date(payload.scheduled_at).getTime())) return { error: "Date invalide" };

  // Calculer toutes les occurrences (DST-safe via recurring.ts)
  const occurrences = computeWeeklyOccurrences({
    firstScheduledAtISO: payload.scheduled_at,
    repeatUntilParisDate: payload.repeat_until,
    durationMin: payload.duration_min,
  });

  if (occurrences.length === 0) {
    return { error: "Aucune occurrence à créer avec ces paramètres" };
  }

  // Charger les données existantes une seule fois pour toute la plage
  const rangeStart = occurrences[0].startsAt;
  const rangeEnd = occurrences[occurrences.length - 1].endsAt;

  // Sessions existantes de ce coach dans la plage
  const supabaseAdmin = getSupabaseAdmin();
  const fetchFrom = new Date(rangeStart.getTime() - 8 * 60 * 60 * 1000);
  const { data: existingSessionsRaw, error: sessionsErr } = await supabaseAdmin
    .from("sessions")
    .select("id, scheduled_at, duration_min")
    .eq("coach_id", profile.id)
    .not("status", "in", '("annulée","no_show")')
    .gte("scheduled_at", fetchFrom.toISOString())
    .lt("scheduled_at", rangeEnd.toISOString());

  if (sessionsErr) return { error: sessionsErr.message };

  const existingSessions = (existingSessionsRaw ?? []) as Array<{
    id: string;
    scheduled_at: string;
    duration_min: number;
  }>;

  // Bookings actifs dans la plage (tous coachs)
  const existingBookings = await getAllBookingsInRange(rangeStart, rangeEnd);

  // Chercher un pack actif du client (une seule fois pour toutes les occurrences)
  const supabase = await getSupabaseServer();
  const { data: pack } = await supabase
    .from("session_packs")
    .select("id, offer_id, remaining")
    .eq("client_id", payload.client_id)
    .gt("remaining", 0)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Traiter chaque occurrence
  const result: RecurringSessionResult = { created: 0, skipped: [] };

  for (const occ of occurrences) {
    const { startsAt, endsAt, parisDateStr, parisTimeStr } = occ;

    // Vérification en mémoire (conflit session ou booking)
    const { conflict, reason } = hasInMemoryConflict(
      startsAt,
      endsAt,
      existingSessions,
      existingBookings,
    );

    if (conflict) {
      result.skipped.push({
        scheduledAt: `${parisDateStr}T${parisTimeStr}`,
        reason: reason ?? "Conflit horaire",
      });
      continue;
    }

    // Insertion individuelle (le trigger DB protège contre les race conditions)
    const { error: insertErr } = await supabaseAdmin.from("sessions").insert({
      client_id: payload.client_id,
      coach_id: profile.id,
      scheduled_at: startsAt.toISOString(),
      duration_min: payload.duration_min,
      location: payload.location || null,
      summary: payload.summary || null,
      status: "planifiée",
      pack_id: pack?.id ?? null,
      offer_id: pack?.offer_id ?? null,
    });

    if (insertErr) {
      // Mapper les erreurs de trigger DB
      let reason = "Erreur lors de la création";
      if (
        insertErr.message.includes("réservation en ligne") ||
        insertErr.message.includes("sessions_no_overlap")
      ) {
        reason = "Conflit avec une réservation en ligne";
      } else if (
        insertErr.message.includes("séance") ||
        insertErr.message.includes("trg_session")
      ) {
        reason = "Conflit avec une séance existante";
      }
      result.skipped.push({ scheduledAt: `${parisDateStr}T${parisTimeStr}`, reason });
    } else {
      result.created++;
      // Mettre à jour les sessions en mémoire pour les vérifications suivantes
      existingSessions.push({
        id: `new-${startsAt.toISOString()}`,
        scheduled_at: startsAt.toISOString(),
        duration_min: payload.duration_min,
      });
    }
  }

  return { result };
}
