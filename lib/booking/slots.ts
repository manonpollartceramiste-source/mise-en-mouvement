import type {
  AvailabilityRule,
  Unavailability,
  Booking,
  BookingSettings,
  TimeSlot,
} from './types';

/**
 * Convert a local date+time string to UTC Date.
 * e.g. parseLocalTime("2026-06-10", "09:00", "Europe/Paris") → 2026-06-10T07:00:00Z
 *
 * Algorithm: create a pivot Date treating the time as UTC, find what the target
 * timezone clock shows for that pivot, compute the offset, then apply it.
 * This correctly handles DST transitions.
 */
function parseLocalTime(dateStr: string, timeStr: string, tz: string): Date {
  const normalizedTime = timeStr.slice(0, 5); // "HH:MM" from "HH:MM:SS" or "HH:MM"
  const pivot = new Date(`${dateStr}T${normalizedTime}:00.000Z`);
  // Swedish locale returns "YYYY-MM-DD HH:MM:SS" format — ISO-compatible
  const localStr = pivot.toLocaleString('sv', { timeZone: tz });
  const pivotLocal = new Date(localStr.replace(' ', 'T') + '.000Z');
  const offsetMs = pivot.getTime() - pivotLocal.getTime();
  return new Date(pivot.getTime() + offsetMs);
}

function hasConflict(
  slotStart: Date,
  slotEnd: Date,
  unavailabilities: Unavailability[],
  bookings: Booking[],
  bufferMs: number,
): boolean {
  for (const u of unavailabilities) {
    const uStart = new Date(u.starts_at);
    const uEnd = new Date(u.ends_at);
    if (slotStart < uEnd && slotEnd > uStart) return true;
  }
  for (const b of bookings) {
    if (
      b.status === 'cancelled_by_client' ||
      b.status === 'cancelled_by_coach'
    )
      continue;
    const bStart = new Date(b.starts_at);
    const bEnd = new Date(new Date(b.ends_at).getTime() + bufferMs);
    if (slotStart < bEnd && slotEnd > bStart) return true;
  }
  return false;
}

export interface ComputeSlotsParams {
  rules: AvailabilityRule[];
  unavailabilities: Unavailability[];
  bookings: Booking[];
  settings: BookingSettings;
  fromDate: string; // "YYYY-MM-DD"
  toDate: string; // "YYYY-MM-DD"
  durationMin: number; // slot duration in minutes
}

export function computeSlots(params: ComputeSlotsParams): TimeSlot[] {
  const {
    rules,
    unavailabilities,
    bookings,
    settings,
    fromDate,
    toDate,
    durationMin,
  } = params;

  const tz = settings.timezone || 'Europe/Paris';
  const minNoticeMs = settings.min_notice_hours * 60 * 60 * 1000;
  const maxAdvanceMs = settings.max_advance_days * 24 * 60 * 60 * 1000;
  const bufferMs = settings.buffer_after_min * 60 * 1000;
  const slotMs = durationMin * 60 * 1000;

  const now = new Date();
  const earliest = new Date(now.getTime() + minNoticeMs);
  const latest = new Date(now.getTime() + maxAdvanceMs);

  const slots: TimeSlot[] = [];

  // Iterate UTC calendar days from fromDate to toDate inclusive
  const cur = new Date(fromDate + 'T00:00:00.000Z');
  const end = new Date(toDate + 'T00:00:00.000Z');

  while (cur <= end) {
    const dateStr = cur.toISOString().split('T')[0];

    // Use noon UTC to determine day of week safely across timezones
    const dayOfWeek = new Date(dateStr + 'T12:00:00Z').getUTCDay() as
      | 0
      | 1
      | 2
      | 3
      | 4
      | 5
      | 6;

    const dayRules = rules.filter(
      (r) => r.is_active && r.day_of_week === dayOfWeek,
    );

    for (const rule of dayRules) {
      const ruleStart = parseLocalTime(dateStr, rule.start_time, tz);
      const ruleEnd = parseLocalTime(dateStr, rule.end_time, tz);

      let slotStart = new Date(ruleStart);
      while (slotStart.getTime() + slotMs <= ruleEnd.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + slotMs);

        if (slotStart >= earliest && slotStart <= latest) {
          const available = !hasConflict(
            slotStart,
            slotEnd,
            unavailabilities,
            bookings,
            bufferMs,
          );
          slots.push({
            starts_at: slotStart.toISOString(),
            ends_at: slotEnd.toISOString(),
            available,
          });
        }

        slotStart = new Date(slotStart.getTime() + slotMs);
      }
    }

    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  // Sort chronologically, deduplicate by starts_at (multiple rules same day)
  slots.sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  // Deduplicate: if two rules produce the same slot start, merge (available wins)
  const deduped: TimeSlot[] = [];
  for (const slot of slots) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.starts_at === slot.starts_at) {
      if (slot.available) prev.available = true; // available wins
    } else {
      deduped.push({ ...slot });
    }
  }

  return deduped;
}
