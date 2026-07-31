import "server-only";

const BEIGE = "#f5f0e8";
const TAUPE = "#8b7355";
const INK = "#1a1612";
const MUTED = "#7a6f63";
const BORDER = "#e0d9ce";
const WHITE = "#ffffff";
const ACCENT = "#6b5a3e";

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatEuros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDateTime(isoString: string): { date: string; time: string } {
  const d = new Date(isoString);
  const date = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return { date: date.charAt(0).toUpperCase() + date.slice(1), time };
}

function emailWrapper(
  content: string,
  cabinetAddress = "Cabinet Mise en Mouvement, 2 place du Marché, 34560 Poussan",
): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mise en Mouvement</title>
</head>
<body style="margin:0;padding:0;background-color:${BEIGE};font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BEIGE};padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:${WHITE};border-radius:16px;overflow:hidden;border:1px solid ${BORDER};">
          <!-- Header -->
          <tr>
            <td style="background-color:${ACCENT};padding:32px 40px;text-align:center;">
              <p style="margin:0;font-family:Georgia,serif;font-size:22px;font-weight:400;color:${WHITE};letter-spacing:0.04em;">Mise en Mouvement</p>
              <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.7);letter-spacing:0.08em;text-transform:uppercase;">Cabinet de coaching sportif</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:${BEIGE};border-top:1px solid ${BORDER};padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:11px;color:${MUTED};">${cabinetAddress}</p>
              <p style="margin:6px 0 0;font-size:11px;color:${MUTED};">Cet email a été envoyé automatiquement suite à votre réservation.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type BookingEmailData = {
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  clientNotes: string | null;
  coachName: string;
  coachEmail: string;
  offerName: string;
  offerDuration: string | null;
  /** Montant total de l'offre en centimes d'euro, ou null si "sur devis". */
  offerTotalCents: number | null;
  /** UUID complet de la réservation. */
  bookingRef: string;
  /** Durée de la séance en minutes. */
  durationMin: number;
  startsAt: string;
  endsAt: string;
  cabinetAddress: string;
  paymentMethod: "online" | "cabinet" | null;
};

export function clientConfirmationEmail(data: BookingEmailData): {
  subject: string;
  html: string;
} {
  const { date, time } = formatDateTime(data.startsAt);
  const endTime = formatDateTime(data.endsAt).time;

  const paymentLine =
    data.paymentMethod === "online"
      ? `<tr><td style="padding:8px 0;font-size:14px;color:${MUTED};">Paiement</td><td style="padding:8px 0;font-size:14px;color:${INK};font-weight:600;">En ligne (SumUp)</td></tr>`
      : data.paymentMethod === "cabinet"
        ? `<tr><td style="padding:8px 0;font-size:14px;color:${MUTED};">Paiement</td><td style="padding:8px 0;font-size:14px;color:${INK};font-weight:600;">Au cabinet</td></tr>`
        : "";

  const content = `
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:${INK};">Réservation confirmée</h1>
    <p style="margin:0 0 32px;font-size:15px;color:${MUTED};line-height:1.6;">Bonjour ${data.clientName},<br/>votre séance avec <strong style="color:${INK};">${data.coachName}</strong> est bien enregistrée.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:12px;overflow:hidden;margin-bottom:32px;">
      <tr style="background-color:${BEIGE};">
        <td colspan="2" style="padding:14px 20px;font-size:11px;font-family:Arial,sans-serif;letter-spacing:0.08em;text-transform:uppercase;color:${TAUPE};font-weight:600;">Détails de votre séance</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};width:140px;">Prestation</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};font-weight:600;">${data.offerName}${data.offerDuration ? ` · ${data.offerDuration}` : ""}</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};background-color:${BEIGE};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};">Coach</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};font-weight:600;">${data.coachName}</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};">Date</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};font-weight:600;">${date}</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};background-color:${BEIGE};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};">Horaire</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};font-weight:600;">${time} – ${endTime}</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};">Lieu</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};">${data.cabinetAddress}</td>
      </tr>
      ${paymentLine ? `<tr style="border-top:1px solid ${BORDER};background-color:${BEIGE};">${paymentLine.replace("<tr>", "").replace("</tr>", "")}</tr>` : ""}
    </table>

    <p style="margin:0 0 12px;font-size:14px;color:${MUTED};line-height:1.6;">Une question ? Répondez à cet email ou contactez directement votre coach :</p>
    <p style="margin:0 0 32px;font-size:14px;color:${ACCENT};"><a href="mailto:${data.coachEmail}" style="color:${ACCENT};text-decoration:none;">${data.coachEmail}</a></p>

    <p style="margin:0;font-size:13px;color:${MUTED};font-style:italic;line-height:1.7;">À bientôt au cabinet,<br/><strong style="font-style:normal;color:${INK};">${data.coachName}</strong></p>
  `;

  return {
    subject: `Confirmation – ${data.offerName} avec ${data.coachName}`,
    html: emailWrapper(content, data.cabinetAddress),
  };
}

export function coachCancellationEmail(
  data: BookingEmailData,
  cancelledBy: "client" | "coach" | "admin" = "client",
): { subject: string; html: string } {
  const { date, time } = formatDateTime(data.startsAt);
  const endTime = formatDateTime(data.endsAt).time;
  const who =
    cancelledBy === "client"
      ? "par le client"
      : cancelledBy === "coach"
        ? "par vous"
        : "par l'administration";

  const content = `
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:${INK};">Réservation annulée</h1>
    <p style="margin:0 0 32px;font-size:15px;color:${MUTED};line-height:1.6;">La séance ci-dessous a été annulée <strong>${who}</strong>.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:12px;overflow:hidden;margin-bottom:32px;">
      <tr style="background-color:${BEIGE};">
        <td colspan="2" style="padding:14px 20px;font-size:11px;font-family:Arial,sans-serif;letter-spacing:0.08em;text-transform:uppercase;color:${TAUPE};font-weight:600;">Séance annulée</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};width:140px;">Prestation</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};font-weight:600;">${data.offerName}${data.offerDuration ? ` · ${data.offerDuration}` : ""}</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};background-color:${BEIGE};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};">Client</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};font-weight:600;">${data.clientName}</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};">Date</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};font-weight:600;">${date}</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};background-color:${BEIGE};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};">Horaire</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};font-weight:600;">${time} – ${endTime}</td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:${MUTED};line-height:1.7;">Cet email est envoyé automatiquement depuis le système de réservation.</p>
  `;

  return {
    subject: `Annulation — ${data.clientName} · ${data.offerName}`,
    html: emailWrapper(content, data.cabinetAddress),
  };
}

export function coachModificationEmail(
  data: BookingEmailData,
  changeLabel: string,
): { subject: string; html: string } {
  const { date, time } = formatDateTime(data.startsAt);
  const endTime = formatDateTime(data.endsAt).time;

  const content = `
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:${INK};">Réservation modifiée</h1>
    <p style="margin:0 0 32px;font-size:15px;color:${MUTED};line-height:1.6;">Une réservation a été modifiée : <strong>${changeLabel}</strong>.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:12px;overflow:hidden;margin-bottom:32px;">
      <tr style="background-color:${BEIGE};">
        <td colspan="2" style="padding:14px 20px;font-size:11px;font-family:Arial,sans-serif;letter-spacing:0.08em;text-transform:uppercase;color:${TAUPE};font-weight:600;">Séance</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};width:140px;">Prestation</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};font-weight:600;">${data.offerName}${data.offerDuration ? ` · ${data.offerDuration}` : ""}</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};background-color:${BEIGE};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};">Client</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};font-weight:600;">${data.clientName}</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};">Date</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};font-weight:600;">${date}</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};background-color:${BEIGE};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};">Horaire</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};font-weight:600;">${time} – ${endTime}</td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:${MUTED};line-height:1.7;">Cet email est envoyé automatiquement depuis le système de réservation.</p>
  `;

  return {
    subject: `Modification — ${data.clientName} · ${data.offerName}`,
    html: emailWrapper(content, data.cabinetAddress),
  };
}

export function coachTestEmail(coachName: string, notificationEmail: string): {
  subject: string;
  html: string;
} {
  const content = `
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:${INK};">Email de test</h1>
    <p style="margin:0 0 32px;font-size:15px;color:${MUTED};line-height:1.6;">Bonjour <strong>${coachName}</strong>,</p>
    <p style="margin:0 0 24px;font-size:15px;color:${MUTED};line-height:1.6;">
      Ceci est un email de test pour confirmer que vos notifications de réservation sont bien configurées.
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:${MUTED};padding:16px 20px;background-color:${BEIGE};border-radius:10px;border:1px solid ${BORDER};">
      Les futures notifications de réservation seront envoyées à :<br/>
      <strong style="color:${ACCENT};">${notificationEmail}</strong>
    </p>
    <p style="margin:0;font-size:13px;color:${MUTED};line-height:1.7;">Cet email a été déclenché depuis l'interface d'administration.</p>
  `;

  return {
    subject: "Test — Notifications de réservation",
    html: emailWrapper(content),
  };
}

export function coachNotificationEmail(data: BookingEmailData): {
  subject: string;
  html: string;
} {
  const { date, time } = formatDateTime(data.startsAt);
  const endTime = formatDateTime(data.endsAt).time;
  const ref = data.bookingRef.slice(0, 8).toUpperCase();

  const h = Math.floor(data.durationMin / 60);
  const m = data.durationMin % 60;
  const durationLabel =
    h > 0 && m > 0
      ? `${h}h${m.toString().padStart(2, "0")}`
      : h > 0
        ? `${h}h`
        : `${m} min`;

  const amountSuffix =
    data.offerTotalCents !== null ? ` — ${formatEuros(data.offerTotalCents)}` : "";
  const paymentLabel =
    data.paymentMethod === "cabinet"
      ? `Paiement prévu au cabinet${amountSuffix}`
      : data.paymentMethod === "online"
        ? `Paiement en ligne via SumUp sélectionné — paiement à vérifier dans SumUp${amountSuffix}`
        : "Moyen de paiement non précisé";

  const phoneLine = data.clientPhone
    ? `<tr style="border-top:1px solid ${BORDER};background-color:${BEIGE};"><td style="padding:12px 20px;font-size:14px;color:${MUTED};width:140px;">Téléphone</td><td style="padding:12px 20px;font-size:14px;color:${INK};"><a href="tel:${esc(data.clientPhone)}" style="color:${ACCENT};text-decoration:none;">${esc(data.clientPhone)}</a></td></tr>`
    : "";

  const notesLine = data.clientNotes
    ? `<tr style="border-top:1px solid ${BORDER};"><td style="padding:12px 20px;font-size:14px;color:${MUTED};">Notes</td><td style="padding:12px 20px;font-size:14px;color:${INK};font-style:italic;">${esc(data.clientNotes)}</td></tr>`
    : "";

  const content = `
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:${INK};">Nouvelle réservation</h1>
    <p style="margin:0 0 32px;font-size:15px;color:${MUTED};line-height:1.6;">Une nouvelle séance vient d'être réservée dans votre agenda.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:12px;overflow:hidden;margin-bottom:32px;">
      <tr style="background-color:${BEIGE};">
        <td colspan="2" style="padding:14px 20px;font-size:11px;font-family:Arial,sans-serif;letter-spacing:0.08em;text-transform:uppercase;color:${TAUPE};font-weight:600;">Rendez-vous</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};width:140px;">Prestation</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};font-weight:600;">${esc(data.offerName)}${data.offerDuration ? ` · ${esc(data.offerDuration)}` : ""}</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};background-color:${BEIGE};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};">Coach</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};font-weight:600;">${esc(data.coachName)}</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};">Date</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};font-weight:600;">${date}</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};background-color:${BEIGE};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};">Horaire</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};font-weight:600;">${time} – ${endTime}</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};">Durée</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};">${durationLabel}</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};background-color:${BEIGE};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};">Référence</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};font-family:monospace;">#${ref}</td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:12px;overflow:hidden;margin-bottom:32px;">
      <tr style="background-color:${BEIGE};">
        <td colspan="2" style="padding:14px 20px;font-size:11px;font-family:Arial,sans-serif;letter-spacing:0.08em;text-transform:uppercase;color:${TAUPE};font-weight:600;">Client</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};width:140px;">Nom</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};font-weight:600;"><a href="mailto:${esc(data.clientEmail)}" style="color:${INK};text-decoration:none;">${esc(data.clientName)}</a></td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};background-color:${BEIGE};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};">Email</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};"><a href="mailto:${esc(data.clientEmail)}" style="color:${ACCENT};text-decoration:none;">${esc(data.clientEmail)}</a></td>
      </tr>
      ${phoneLine}
      ${notesLine}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:12px;overflow:hidden;margin-bottom:32px;">
      <tr style="background-color:${BEIGE};">
        <td colspan="2" style="padding:14px 20px;font-size:11px;font-family:Arial,sans-serif;letter-spacing:0.08em;text-transform:uppercase;color:${TAUPE};font-weight:600;">Paiement</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};">
        <td style="padding:14px 20px;font-size:14px;color:${INK};">${paymentLabel}</td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:${MUTED};line-height:1.7;">Cet email est envoyé automatiquement depuis le système de réservation.</p>
  `;

  return {
    subject: `Nouvelle réservation — ${data.clientName} · ${data.offerName}`,
    html: emailWrapper(content, data.cabinetAddress),
  };
}

export function clientReminderEmail(data: BookingEmailData): {
  subject: string;
  html: string;
} {
  const { date, time } = formatDateTime(data.startsAt);
  const endTime = formatDateTime(data.endsAt).time;

  const content = `
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:${INK};">Rappel — votre séance demain</h1>
    <p style="margin:0 0 32px;font-size:15px;color:${MUTED};line-height:1.6;">Bonjour ${data.clientName},<br/>nous vous rappelons votre séance de demain avec <strong style="color:${INK};">${data.coachName}</strong>.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:12px;overflow:hidden;margin-bottom:32px;">
      <tr style="background-color:${BEIGE};">
        <td colspan="2" style="padding:14px 20px;font-size:11px;font-family:Arial,sans-serif;letter-spacing:0.08em;text-transform:uppercase;color:${TAUPE};font-weight:600;">Détails de votre séance</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};width:140px;">Prestation</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};font-weight:600;">${data.offerName}${data.offerDuration ? ` · ${data.offerDuration}` : ""}</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};background-color:${BEIGE};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};">Coach</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};font-weight:600;">${data.coachName}</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};">Date</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};font-weight:600;">${date}</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};background-color:${BEIGE};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};">Horaire</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};font-weight:600;">${time} – ${endTime}</td>
      </tr>
      <tr style="border-top:1px solid ${BORDER};">
        <td style="padding:12px 20px;font-size:14px;color:${MUTED};">Lieu</td>
        <td style="padding:12px 20px;font-size:14px;color:${INK};">${data.cabinetAddress}</td>
      </tr>
    </table>

    <p style="margin:0 0 12px;font-size:14px;color:${MUTED};line-height:1.6;">Une question ? Contactez directement votre coach :</p>
    <p style="margin:0 0 32px;font-size:14px;"><a href="mailto:${data.coachEmail}" style="color:${ACCENT};text-decoration:none;">${data.coachEmail}</a></p>

    <p style="margin:0;font-size:13px;color:${MUTED};font-style:italic;line-height:1.7;">À demain au cabinet,<br/><strong style="font-style:normal;color:${INK};">${data.coachName}</strong></p>
  `;

  return {
    subject: `Rappel — votre séance demain avec ${data.coachName}`,
    html: emailWrapper(content, data.cabinetAddress),
  };
}
