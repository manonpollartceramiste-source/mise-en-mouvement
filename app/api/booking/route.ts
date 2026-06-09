import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createBooking } from "@/lib/supabase/booking.server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendBookingEmails } from "@/lib/email/send-booking-emails";
import { createCalendarEvent } from "@/lib/google/calendar";
import { loadCoaches } from "@/lib/content/coaches.server";
import { loadOffers } from "@/lib/content/offers.server";

const CreateBookingSchema = z.object({
  coach_id: z.string().uuid(),
  offer_id: z.string().min(1).max(100),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  duration_min: z.number().int().min(15).max(480),
  client_name: z.string().min(2).max(100).trim(),
  client_email: z.string().email().toLowerCase(),
  client_phone: z.string().max(20).optional().nullable(),
  client_notes: z.string().max(500).optional().nullable(),
  payment_method: z.enum(["online", "cabinet"]).optional().nullable(),
  client_profile_id: z.string().uuid().optional().nullable(),
});

// POST /api/booking
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de la requête invalide (JSON attendu)." }, { status: 400 });
  }

  const parsed = CreateBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données de réservation invalides.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;

  if (new Date(input.ends_at) <= new Date(input.starts_at)) {
    return NextResponse.json({ error: "ends_at doit être postérieur à starts_at." }, { status: 400 });
  }

  try {
    const booking = await createBooking(input);

    // Emails + Google Calendar en arrière-plan (non-bloquant)
    void (async () => {
      try {
        await sendBookingEmails(booking);
      } catch (err) {
        console.error("[api/booking] email send failed:", err);
      }

      try {
        const [coaches, offers] = await Promise.all([loadCoaches(), loadOffers()]);
        const coach = coaches.find((c) => c.osProfileId === booking.coach_id);
        const offer = offers.find((o) => o.id === booking.offer_id);

        if (coach?.osProfileId) {
          const eventId = await createCalendarEvent(
            coach.osProfileId,
            booking,
            coach.name,
            offer?.name ?? booking.offer_id,
          );

          if (eventId) {
            const admin = getSupabaseAdmin();
            await admin
              .from("bookings")
              .update({ google_event_id: eventId })
              .eq("id", booking.id);
          }
        }
      } catch (err) {
        console.error("[api/booking] google calendar create failed:", err);
      }
    })();

    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur interne.";

    if (message.includes("Créneau déjà réservé") || message.includes("chevauchement")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    if (
      message.includes("Créneau indisponible") ||
      message.includes("l'avance") ||
      message.includes("jours")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error("[api/booking] POST error:", err);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
