import "server-only";

import { getResend, EMAIL_FROM, CABINET_ADDRESS, CABINET_ADMIN_EMAIL } from "./resend";
import {
  clientConfirmationEmail,
  coachNotificationEmail,
  coachCancellationEmail,
  coachModificationEmail,
  coachTestEmail,
  type BookingEmailData,
} from "./templates";
import { loadCoaches } from "@/lib/content/coaches.server";
import { loadOffers } from "@/lib/content/offers.server";
import type { Booking } from "@/lib/booking/types";
import type { Coach } from "@/lib/content/coaches";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function buildEmailData(booking: Booking): Promise<{
  data: BookingEmailData;
  notificationRecipient: string | null;
}> {
  const [coaches, offers] = await Promise.all([loadCoaches(), loadOffers()]);

  const coach = coaches.find((c) => c.osProfileId === booking.coach_id);
  const offer = offers.find((o) => o.id === booking.offer_id);

  // notification_email → email OS → CABINET_ADMIN_EMAIL
  const notificationRecipient =
    coach?.notification_email?.trim() ||
    coach?.email?.trim() ||
    CABINET_ADMIN_EMAIL ||
    null;

  const data: BookingEmailData = {
    clientName: booking.client_name,
    clientEmail: booking.client_email,
    clientPhone: booking.client_phone ?? null,
    clientNotes: booking.client_notes ?? null,
    coachName: coach?.name ?? "Votre coach",
    // Email affiché dans l'email client (lien de contact) — priorité : proEmail, email, admin
    coachEmail: coach?.proEmail || coach?.email || CABINET_ADMIN_EMAIL,
    offerName: offer?.name ?? booking.offer_id,
    offerDuration: offer?.duration ?? null,
    startsAt: booking.starts_at,
    endsAt: booking.ends_at,
    cabinetAddress: CABINET_ADDRESS,
    paymentMethod: booking.payment_method,
  };

  return { data, notificationRecipient };
}

// ─── Public functions ─────────────────────────────────────────────────────────

/** Envoi initial : confirmation au client + notification au coach. */
export async function sendBookingEmails(booking: Booking): Promise<void> {
  const { data, notificationRecipient } = await buildEmailData(booking);

  const resend = getResend();
  const clientTpl = clientConfirmationEmail(data);
  const coachTpl = coachNotificationEmail(data);

  const sends: Promise<unknown>[] = [
    resend.emails.send({
      from: EMAIL_FROM,
      to: booking.client_email,
      subject: clientTpl.subject,
      html: clientTpl.html,
    }),
  ];

  if (notificationRecipient) {
    sends.push(
      resend.emails.send({
        from: EMAIL_FROM,
        to: notificationRecipient,
        subject: coachTpl.subject,
        html: coachTpl.html,
      }),
    );
  }

  await Promise.all(sends);
}

/** Notification d'annulation au coach. */
export async function sendBookingCancellationToCoach(
  booking: Booking,
  cancelledBy: "client" | "coach" | "admin" = "client",
): Promise<void> {
  const { data, notificationRecipient } = await buildEmailData(booking);
  if (!notificationRecipient) return;

  const resend = getResend();
  const tpl = coachCancellationEmail(data, cancelledBy);

  await resend.emails.send({
    from: EMAIL_FROM,
    to: notificationRecipient,
    subject: tpl.subject,
    html: tpl.html,
  });
}

/** Notification de modification au coach. */
export async function sendBookingModificationToCoach(
  booking: Booking,
  changeLabel: string,
): Promise<void> {
  const { data, notificationRecipient } = await buildEmailData(booking);
  if (!notificationRecipient) return;

  const resend = getResend();
  const tpl = coachModificationEmail(data, changeLabel);

  await resend.emails.send({
    from: EMAIL_FROM,
    to: notificationRecipient,
    subject: tpl.subject,
    html: tpl.html,
  });
}

/** Email de test pour vérifier la configuration de notification d'un coach. */
export async function sendCoachTestEmail(coach: Coach): Promise<void> {
  const recipient =
    coach.notification_email?.trim() ||
    coach.email?.trim() ||
    CABINET_ADMIN_EMAIL;

  if (!recipient) throw new Error("Aucun email de notification configuré pour ce coach.");

  const resend = getResend();
  const tpl = coachTestEmail(coach.name, recipient);

  await resend.emails.send({
    from: EMAIL_FROM,
    to: recipient,
    subject: tpl.subject,
    html: tpl.html,
  });
}
