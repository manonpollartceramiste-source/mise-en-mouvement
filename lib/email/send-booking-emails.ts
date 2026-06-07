import "server-only";

import { getResend, EMAIL_FROM, CABINET_ADDRESS, CABINET_ADMIN_EMAIL } from "./resend";
import { clientConfirmationEmail, coachNotificationEmail, type BookingEmailData } from "./templates";
import { loadCoaches } from "@/lib/content/coaches.server";
import { loadOffers } from "@/lib/content/offers.server";
import type { Booking } from "@/lib/booking/types";

export async function sendBookingEmails(booking: Booking): Promise<void> {
  const [coaches, offers] = await Promise.all([loadCoaches(), loadOffers()]);

  const coach = coaches.find((c) => c.osProfileId === booking.coach_id);
  const offer = offers.find((o) => o.id === booking.offer_id);

  const data: BookingEmailData = {
    clientName: booking.client_name,
    clientEmail: booking.client_email,
    clientPhone: booking.client_phone ?? null,
    clientNotes: booking.client_notes ?? null,
    coachName: coach?.name ?? "Votre coach",
    coachEmail: coach?.email ?? CABINET_ADMIN_EMAIL,
    offerName: offer?.name ?? booking.offer_id,
    offerDuration: offer?.duration ?? null,
    startsAt: booking.starts_at,
    endsAt: booking.ends_at,
    cabinetAddress: CABINET_ADDRESS,
    paymentMethod: booking.payment_method,
  };

  const resend = getResend();

  const clientTpl = clientConfirmationEmail(data);
  const coachTpl = coachNotificationEmail(data);

  const coachRecipient = data.coachEmail || CABINET_ADMIN_EMAIL;

  await Promise.all([
    resend.emails.send({
      from: EMAIL_FROM,
      to: booking.client_email,
      subject: clientTpl.subject,
      html: clientTpl.html,
    }),
    ...(coachRecipient
      ? [
          resend.emails.send({
            from: EMAIL_FROM,
            to: coachRecipient,
            subject: coachTpl.subject,
            html: coachTpl.html,
          }),
        ]
      : []),
  ]);
}
