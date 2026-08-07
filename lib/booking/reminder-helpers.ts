// Fonctions pures du cron de rappel — aucune dépendance serveur, testables directement.

// 12h : fenêtre de rattrapage — absorbe les gaps GitHub Actions jusqu'à 14h sans rappel manqué.
// (Ancien: 22h — ne tolérait que 4h de gap avant de perdre définitivement des rappels.)
export const REMINDER_WINDOW_MIN_HOURS = 12;
export const REMINDER_WINDOW_MAX_HOURS = 26;
export const REMINDER_CLAIM_EXPIRY_MINUTES = 10;
export const REMINDER_LATE_BOOKING_MIN_HOURS = 6;

export function buildReminderWindow(now: Date): { windowStart: Date; windowEnd: Date } {
  return {
    windowStart: new Date(now.getTime() + REMINDER_WINDOW_MIN_HOURS * 60 * 60 * 1000),
    windowEnd:   new Date(now.getTime() + REMINDER_WINDOW_MAX_HOURS * 60 * 60 * 1000),
  };
}

export function claimCutoff(now: Date): Date {
  return new Date(now.getTime() - REMINDER_CLAIM_EXPIRY_MINUTES * 60 * 1000);
}

export function lateBookingCutoff(now: Date): Date {
  return new Date(now.getTime() - REMINDER_LATE_BOOKING_MIN_HOURS * 60 * 60 * 1000);
}
