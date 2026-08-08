import { parseLocalTime } from "./slots";

export type RecurringOccurrence = {
  startsAt: Date;
  endsAt: Date;
  parisDateStr: string;
  parisTimeStr: string;
};

const MAX_OCCURRENCES = 104; // safety: 2 years

/**
 * Compute all weekly occurrences starting from firstScheduledAtISO (UTC),
 * repeating every 7 days at the same Paris clock time, until repeatUntil
 * (Paris "YYYY-MM-DD" date, inclusive).
 *
 * DST-safe: the Paris hour remains constant (e.g. "10:00") even when the
 * offset changes between summer and winter time.
 */
export function computeWeeklyOccurrences(params: {
  firstScheduledAtISO: string;
  repeatUntilParisDate: string;
  durationMin: number;
}): RecurringOccurrence[] {
  const { firstScheduledAtISO, repeatUntilParisDate, durationMin } = params;

  const firstStartsAt = new Date(firstScheduledAtISO);
  if (isNaN(firstStartsAt.getTime())) return [];

  // Extract the Paris date and time of the first occurrence
  const firstParisStr = firstStartsAt.toLocaleString("sv", {
    timeZone: "Europe/Paris",
  });
  const [firstParisDate, firstParisTimeFull] = firstParisStr.split(" ");
  const parisTimeStr = firstParisTimeFull.slice(0, 5); // "HH:MM"

  const occurrences: RecurringOccurrence[] = [];
  let currentParisDate = firstParisDate;
  let n = 0;

  while (n < MAX_OCCURRENCES) {
    if (currentParisDate > repeatUntilParisDate) break;

    const startsAt = parseLocalTime(currentParisDate, parisTimeStr, "Europe/Paris");
    const endsAt = new Date(startsAt.getTime() + durationMin * 60_000);

    occurrences.push({ startsAt, endsAt, parisDateStr: currentParisDate, parisTimeStr });

    // Advance 7 calendar days (local date arithmetic preserves day-of-week)
    const [y, m, d] = currentParisDate.split("-").map(Number);
    const next = new Date(y, m - 1, d + 7);
    currentParisDate = [
      next.getFullYear(),
      String(next.getMonth() + 1).padStart(2, "0"),
      String(next.getDate()).padStart(2, "0"),
    ].join("-");

    n++;
  }

  return occurrences;
}

/**
 * Check if [startsAt, endsAt[ overlaps any existing session or booking in memory.
 * Sessions: { scheduled_at: string; duration_min: number; status: string }
 * Bookings: { starts_at: string; ends_at: string; status: string }
 */
export function hasInMemoryConflict(
  startsAt: Date,
  endsAt: Date,
  sessions: Array<{ scheduled_at: string; duration_min: number; status?: string }>,
  bookings: Array<{ starts_at: string; ends_at: string; status?: string }>,
): { conflict: boolean; reason?: string } {
  for (const s of sessions) {
    if (s.status === "annulée" || s.status === "no_show") continue;
    const sStart = new Date(s.scheduled_at);
    const sEnd = new Date(sStart.getTime() + s.duration_min * 60_000);
    if (sStart < endsAt && sEnd > startsAt) {
      return { conflict: true, reason: "Conflit avec une séance existante" };
    }
  }
  for (const b of bookings) {
    if (
      b.status === "cancelled_by_client" ||
      b.status === "cancelled_by_coach"
    )
      continue;
    const bStart = new Date(b.starts_at);
    const bEnd = new Date(b.ends_at);
    if (bStart < endsAt && bEnd > startsAt) {
      return { conflict: true, reason: "Conflit avec une réservation en ligne" };
    }
  }
  return { conflict: false };
}
