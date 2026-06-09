import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { refreshAccessToken } from "./oauth";
import type { Booking } from "@/lib/booking/types";

const GCAL_API = "https://www.googleapis.com/calendar/v3";

type GoogleEvent = {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
};

// ─── Token management ─────────────────────────────────────────────────────────

async function getCalendarRow(coachId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("coach_google_tokens")
    .select("access_token, refresh_token, token_expiry, calendar_id")
    .eq("coach_id", coachId)
    .maybeSingle();
  if (error) {
    console.error(`[gcal] getCalendarRow error for coach ${coachId}:`, error.message);
    return null;
  }
  return data as {
    access_token: string;
    refresh_token: string | null;
    token_expiry: string | null;
    calendar_id: string;
  } | null;
}

async function getValidToken(coachId: string): Promise<string | null> {
  const row = await getCalendarRow(coachId);
  if (!row) return null;

  const expiry = row.token_expiry ? new Date(row.token_expiry) : null;
  const bufferMs = 5 * 60 * 1000;
  const needsRefresh = !expiry || expiry.getTime() - Date.now() < bufferMs;

  if (!needsRefresh) return row.access_token;

  if (!row.refresh_token) {
    console.error(`[gcal] No refresh_token for coach ${coachId} — token expired`);
    return null;
  }

  try {
    const refreshed = await refreshAccessToken(row.refresh_token);
    const admin = getSupabaseAdmin();
    await admin
      .from("coach_google_tokens")
      .update({
        access_token: refreshed.access_token,
        token_expiry: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("coach_id", coachId);
    return refreshed.access_token;
  } catch (err) {
    console.error(`[gcal] Token refresh failed for coach ${coachId}:`, err);
    return null;
  }
}

async function getCalendarId(coachId: string): Promise<string> {
  const row = await getCalendarRow(coachId);
  return row?.calendar_id ?? "primary";
}

// ─── Event body ───────────────────────────────────────────────────────────────

function buildEventBody(
  booking: Booking,
  coachName: string,
  offerName: string,
): GoogleEvent {
  const lines = [
    `Client : ${booking.client_name}`,
    `Email : ${booking.client_email}`,
    booking.client_phone ? `Téléphone : ${booking.client_phone}` : null,
    booking.client_notes ? `Notes : ${booking.client_notes}` : null,
    `Coach : ${coachName}`,
    `Prestation : ${offerName}`,
  ].filter((l): l is string => l !== null);

  return {
    summary: `${offerName} — ${booking.client_name}`,
    description: lines.join("\n"),
    start: { dateTime: booking.starts_at, timeZone: "Europe/Paris" },
    end: { dateTime: booking.ends_at, timeZone: "Europe/Paris" },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Crée un événement Google Calendar pour une réservation. Retourne l'event_id ou null si échec. */
export async function createCalendarEvent(
  coachId: string,
  booking: Booking,
  coachName: string,
  offerName: string,
): Promise<string | null> {
  const token = await getValidToken(coachId);
  if (!token) return null;

  const calendarId = await getCalendarId(coachId);
  const body = buildEventBody(booking, coachName, offerName);

  try {
    const res = await fetch(
      `${GCAL_API}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(`[gcal] createCalendarEvent HTTP ${res.status}:`, text);
      return null;
    }

    const event = (await res.json()) as { id: string };
    return event.id ?? null;
  } catch (err) {
    console.error("[gcal] createCalendarEvent exception:", err);
    return null;
  }
}

/** Met à jour un événement Google Calendar existant. Retourne true si succès. */
export async function updateCalendarEvent(
  coachId: string,
  googleEventId: string,
  booking: Booking,
  coachName: string,
  offerName: string,
): Promise<boolean> {
  const token = await getValidToken(coachId);
  if (!token) return false;

  const calendarId = await getCalendarId(coachId);
  const body = buildEventBody(booking, coachName, offerName);

  try {
    const res = await fetch(
      `${GCAL_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(`[gcal] updateCalendarEvent HTTP ${res.status}:`, text);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[gcal] updateCalendarEvent exception:", err);
    return false;
  }
}

/** Supprime un événement Google Calendar. Retourne true si succès ou déjà supprimé. */
export async function deleteCalendarEvent(
  coachId: string,
  googleEventId: string,
): Promise<boolean> {
  const token = await getValidToken(coachId);
  if (!token) return false;

  const calendarId = await getCalendarId(coachId);

  try {
    const res = await fetch(
      `${GCAL_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    // 204 = OK, 410 = déjà supprimé (OK aussi)
    if (!res.ok && res.status !== 410) {
      const text = await res.text();
      console.error(`[gcal] deleteCalendarEvent HTTP ${res.status}:`, text);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[gcal] deleteCalendarEvent exception:", err);
    return false;
  }
}
