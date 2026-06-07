import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createBooking } from "@/lib/supabase/booking.server";
import { sendBookingEmails } from "@/lib/email/send-booking-emails";

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
      {
        error: "Données de réservation invalides.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const input = parsed.data;

  // Basic sanity: ends_at must be after starts_at
  if (new Date(input.ends_at) <= new Date(input.starts_at)) {
    return NextResponse.json(
      { error: "ends_at doit être postérieur à starts_at." },
      { status: 400 },
    );
  }

  try {
    const booking = await createBooking(input);

    try {
      await sendBookingEmails(booking);
    } catch (emailErr) {
      console.error("[api/booking] email send failed:", emailErr);
    }

    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur interne.";

    if (
      message.includes("Créneau déjà réservé") ||
      message.includes("chevauchement")
    ) {
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
