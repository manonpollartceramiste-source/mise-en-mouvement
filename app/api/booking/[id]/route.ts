import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBookingById, updateBooking } from "@/lib/supabase/booking.server";
import { getSupabaseServer, isAuthorizedAdmin } from "@/lib/supabase/server";
import {
  sendBookingCancellationToCoach,
  sendBookingModificationToCoach,
} from "@/lib/email/send-booking-emails";
import {
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/google/calendar";
import { loadCoaches } from "@/lib/content/coaches.server";
import { loadOffers } from "@/lib/content/offers.server";

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

  let booking;
  try {
    booking = await getBookingById(id);
  } catch (err) {
    console.error("[api/booking/[id]] PATCH getBookingById error:", err);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }

  if (!booking) {
    return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  }

  const isAdmin = isAuthorizedAdmin(user.email);
  const isOwner = user.id === booking.coach_id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de la requête invalide (JSON attendu)." }, { status: 400 });
  }

  const parsed = UpdateBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const updated = await updateBooking(id, parsed.data);
    const isCancellation =
      updated.status === "cancelled_by_client" ||
      updated.status === "cancelled_by_coach";

    // Effets de bord en arrière-plan (non-bloquants)
    void (async () => {
      const [coaches, offers] = await Promise.all([loadCoaches(), loadOffers()]);
      const coach = coaches.find((c) => c.osProfileId === updated.coach_id);
      const offer = offers.find((o) => o.id === updated.offer_id);

      if (isCancellation) {
        // Supprimer l'événement Google Calendar
        if (updated.google_event_id && coach?.osProfileId) {
          try {
            await deleteCalendarEvent(coach.osProfileId, updated.google_event_id);
          } catch (err) {
            console.error("[api/booking/[id]] gcal delete failed:", err);
          }
        }

        // Email d'annulation au coach (seulement si annulé par le client)
        if (updated.status === "cancelled_by_client") {
          try {
            await sendBookingCancellationToCoach(updated, "client");
          } catch (err) {
            console.error("[api/booking/[id]] cancellation email failed:", err);
          }
        }
      } else {
        // Mettre à jour l'événement Google Calendar
        if (updated.google_event_id && coach?.osProfileId) {
          try {
            await updateCalendarEvent(
              coach.osProfileId,
              updated.google_event_id,
              updated,
              coach.name,
              offer?.name ?? updated.offer_id,
            );
          } catch (err) {
            console.error("[api/booking/[id]] gcal update failed:", err);
          }
        }

        // Email de modification au coach (si admin ou client fait le changement)
        if (isAdmin && parsed.data.status && parsed.data.status !== booking.status) {
          const statusLabels: Record<string, string> = {
            confirmed: "statut → Confirmée",
            completed: "statut → Terminée",
            no_show: "statut → Absence",
          };
          const label = statusLabels[parsed.data.status] ?? `statut → ${parsed.data.status}`;
          try {
            await sendBookingModificationToCoach(updated, label);
          } catch (err) {
            console.error("[api/booking/[id]] modification email failed:", err);
          }
        }
      }
    })();

    return NextResponse.json({ booking: updated });
  } catch (err) {
    console.error("[api/booking/[id]] PATCH updateBooking error:", err);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}

// ─── DELETE /api/booking/[id] ─────────────────────────────────────────────────

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let booking;
  try {
    booking = await getBookingById(id);
  } catch (err) {
    console.error("[api/booking/[id]] DELETE getBookingById error:", err);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }

  if (!booking) {
    return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  }

  const isAdmin = isAuthorizedAdmin(user.email);
  const isOwner = user.id === booking.coach_id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const cancelledBy = isAdmin ? "admin" : "coach";

  try {
    const updated = await updateBooking(id, { status: "cancelled_by_coach" });

    // Effets de bord en arrière-plan
    void (async () => {
      const [coaches, offers] = await Promise.all([loadCoaches(), loadOffers()]);
      const coach = coaches.find((c) => c.osProfileId === updated.coach_id);
      const offer = offers.find((o) => o.id === updated.offer_id);

      // Supprimer l'événement Google Calendar
      if (updated.google_event_id && coach?.osProfileId) {
        try {
          await deleteCalendarEvent(coach.osProfileId, updated.google_event_id);
        } catch (err) {
          console.error("[api/booking/[id]] gcal delete failed:", err);
        }
      }

      // Email d'annulation au coach (seulement si admin qui annule)
      if (cancelledBy === "admin") {
        try {
          await sendBookingCancellationToCoach(updated, "admin");
        } catch (err) {
          console.error("[api/booking/[id]] cancellation email failed:", err);
        }
      }
    })();

    return NextResponse.json({ booking: updated });
  } catch (err) {
    console.error("[api/booking/[id]] DELETE updateBooking error:", err);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
