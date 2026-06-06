/** Délai minimum de réservation à l'avance : 24 heures */
export const MIN_NOTICE_HOURS = 24;
const MIN_NOTICE_MS = MIN_NOTICE_HOURS * 60 * 60 * 1000;

/**
 * Retourne true si le créneau est à moins de MIN_NOTICE_HOURS de maintenant.
 * Utilisé côté client (handler Cal.com) ET serveur (confirmation page).
 */
export function isWithinMinNotice(
  startTime: string | Date | null | undefined,
): boolean {
  if (!startTime) return false;
  const start = new Date(startTime).getTime();
  if (isNaN(start)) return false;
  return start - Date.now() < MIN_NOTICE_MS;
}
