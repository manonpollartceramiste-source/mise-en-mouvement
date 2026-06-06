import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getBookingById,
  updateBooking,
} from "@/lib/supabase/booking.server";
import {
  getSupabaseServer,
  isAuthorizedAdmin,
} from "@/lib/supabase/server";

const UpdateBookingSchema = z.object({
  status: z
    .enum([
      "pending",
      "confirmed",
      "cancelled_by_client",
      "cancelled_by_coach",
      "completed",
      "no_show",
    ])
    .optional(),
  coach_notes: z.string().max(1000).optional().nullable(),
  payment_status: z.enum(["pending", "paid", "refunded"]).optional(),
  payment_method: z.enum(["online", "cabinet"]).optional(),
  cancellation_reason: z.string().max(500).optional().nullable(),
});

type RouteContext = { params: Promise<{ id: string }> };

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getAuthenticatedUser() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// ─── PATCH /api/booking/[id] ──────────────────────────────────────────────────

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  // Fetch the booking
  let booking;
  try {
    booking = await getBookingById(id);
  } catch (err) {
    console.error("[api/booking/[id]] PATCH getBookingById error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 },
    );
  }

  if (!booking) {
    return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  }

  // Authorization: admin OR coach who owns the booking
  const isAdmin = isAuthorizedAdmin(user.email);
  const isOwner = user.id === booking.coach_id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de la requête invalide (JSON attendu)." },
      { status: 400 },
    );
  }

  const parsed = UpdateBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Données invalides.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const updated = await updateBooking(id, parsed.data);
    return NextResponse.json({ booking: updated });
  } catch (err) {
    console.error("[api/booking/[id]] PATCH updateBooking error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/booking/[id] ─────────────────────────────────────────────────

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  // Fetch the booking
  let booking;
  try {
    booking = await getBookingById(id);
  } catch (err) {
    console.error("[api/booking/[id]] DELETE getBookingById error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 },
    );
  }

  if (!booking) {
    return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  }

  // Authorization: admin OR coach who owns the booking
  const isAdmin = isAuthorizedAdmin(user.email);
  const isOwner = user.id === booking.coach_id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const updated = await updateBooking(id, {
      status: "cancelled_by_coach",
    });
    return NextResponse.json({ booking: updated });
  } catch (err) {
    console.error("[api/booking/[id]] DELETE updateBooking error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 },
    );
  }
}
