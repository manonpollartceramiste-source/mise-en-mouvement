import { type NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { loadCoaches } from "@/lib/content/coaches.server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// ─── Signature verification ───────────────────────────────────────────────────

const SECRET = process.env.CALCOM_WEBHOOK_SECRET;

function verifySignature(body: string, sig: string, secret: string): boolean {
  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex")}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractCalcomUsername(url: string): string | null {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? null;
  } catch {
    return null;
  }
}

function durationMin(start: string, end: string): number {
  return Math.max(
    15,
    Math.round(
      (new Date(end).getTime() - new Date(start).getTime()) / 60_000,
    ),
  );
}

// ─── Cal.com payload types ───────────────────────────────────────────────────

type CalcomPayload = {
  uid: string;
  bookingId?: number;
  title?: string;
  startTime: string;
  endTime: string;
  location?: string;
  organizer: {
    email: string;
    name: string;
    username?: string;
  };
  attendees?: { email: string; name: string }[];
  cancellationReason?: string | null;
  rescheduleUid?: string | null;
};

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Vérification de signature si le secret est configuré
  if (SECRET) {
    const sig = req.headers.get("X-Cal-Signature-256") ?? "";
    if (!sig || !verifySignature(rawBody, sig, SECRET)) {
      console.warn("[calcom/webhook] Signature invalide");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let parsed: { triggerEvent: string; payload: CalcomPayload };
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { triggerEvent, payload } = parsed;
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  // ── BOOKING_CANCELLED ──────────────────────────────────────────────────────
  if (triggerEvent === "BOOKING_CANCELLED") {
    await supabase
      .from("calcom_bookings")
      .update({ status: "annulée", updated_at: now })
      .eq("calcom_uid", payload.uid);
    return NextResponse.json({ ok: true });
  }

  // ── BOOKING_CREATED / BOOKING_RESCHEDULED ─────────────────────────────────
  if (
    triggerEvent === "BOOKING_CREATED" ||
    triggerEvent === "BOOKING_RESCHEDULED"
  ) {
    const coaches = await loadCoaches();
    const organizer = payload.organizer;

    // Identification du coach :
    // 1. Email OS du coach == email organisateur Cal.com
    let coach = coaches.find(
      (c) =>
        c.email &&
        c.email.toLowerCase() === organizer.email.toLowerCase(),
    );
    // 2. Fallback : username extrait du calcomUrl
    if (!coach && organizer.username) {
      coach = coaches.find(
        (c) => extractCalcomUsername(c.calcomUrl) === organizer.username,
      );
    }

    if (!coach?.osProfileId) {
      // Aucun coach correspondant — on répond 200 pour éviter les retries Cal.com
      console.warn(
        "[calcom/webhook] Aucun coach trouvé pour :",
        organizer.email,
        "username:",
        organizer.username,
      );
      return NextResponse.json({ ok: true, warn: "coach_not_found" });
    }

    // Reschedule : annuler l'ancienne réservation avant d'insérer la nouvelle
    if (triggerEvent === "BOOKING_RESCHEDULED" && payload.rescheduleUid) {
      await supabase
        .from("calcom_bookings")
        .update({ status: "annulée", updated_at: now })
        .eq("calcom_uid", payload.rescheduleUid);
    }

    const attendee = payload.attendees?.[0];

    const { error } = await supabase.from("calcom_bookings").upsert(
      {
        calcom_uid: payload.uid,
        calcom_booking_id: payload.bookingId ?? null,
        coach_id: coach.osProfileId,
        client_name: attendee?.name ?? "Client",
        client_email: attendee?.email ?? "",
        title: payload.title ?? null,
        scheduled_at: payload.startTime,
        duration_min: durationMin(payload.startTime, payload.endTime),
        status: "planifiée",
        location: payload.location ?? null,
        updated_at: now,
      },
      { onConflict: "calcom_uid" },
    );

    if (error) {
      console.error("[calcom/webhook] Erreur Supabase :", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  // Événement non géré — on répond 200 pour ne pas bloquer Cal.com
  return NextResponse.json({ ok: true, warn: "unhandled_event" });
}
