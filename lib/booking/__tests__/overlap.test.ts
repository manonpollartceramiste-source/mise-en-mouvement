import { describe, it, expect } from "vitest";
import { hasConflict, computeSlots } from "../slots.js";
import type {
  Booking,
  Unavailability,
  AvailabilityRule,
  BookingSettings,
} from "../types.js";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeBooking(
  startsAt: string,
  endsAt: string,
  status: Booking["status"] = "confirmed",
  coachId = "coach-a",
): Booking {
  return {
    id: `booking-${startsAt}`,
    coach_id: coachId,
    offer_id: "offer-1",
    client_name: "Test",
    client_email: "test@test.fr",
    client_phone: null,
    client_profile_id: null,
    starts_at: startsAt,
    ends_at: endsAt,
    duration_min: 60,
    status,
    payment_method: null,
    payment_status: null,
    client_notes: null,
    coach_notes: null,
    cancelled_at: null,
    cancellation_reason: null,
    google_event_id: null,
    force_overlap: false,
    overlap_reason: null,
    reminder_sent_at: null,
    reminder_claimed_at: null,
    created_at: startsAt,
    updated_at: startsAt,
  };
}

// Simulate a session-as-unavailability (as produced by getSessionsAsUnavailabilities)
function makeSessionUnavail(
  scheduledAt: string,
  durationMin: number,
  coachId = "coach-a",
): Unavailability {
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + durationMin * 60_000);
  return {
    id: `session-${scheduledAt}`,
    coach_id: coachId,
    starts_at: scheduledAt,
    ends_at: end.toISOString(),
    label: "Séance planifiée",
    is_all_day: false,
    created_at: scheduledAt,
  };
}

const NO_BUFFER = 0;

// ── 1. hasConflict — rule de chevauchement standard ──────────────────────────

describe("hasConflict — intervalle [start, end[", () => {
  it("détecte un chevauchement central (booking sur booking)", () => {
    // Booking 10:00–11:00 bloque le créneau 10:30–11:30
    const existing = makeBooking("2026-08-06T08:00:00Z", "2026-08-06T09:00:00Z");
    const slotStart = new Date("2026-08-06T08:30:00Z");
    const slotEnd = new Date("2026-08-06T09:30:00Z");
    expect(hasConflict(slotStart, slotEnd, [], [existing], NO_BUFFER)).toBe(true);
  });

  it("autorise un créneau adjacent (11:00–12:00 après 10:00–11:00)", () => {
    const existing = makeBooking("2026-08-06T08:00:00Z", "2026-08-06T09:00:00Z");
    const slotStart = new Date("2026-08-06T09:00:00Z");
    const slotEnd = new Date("2026-08-06T10:00:00Z");
    expect(hasConflict(slotStart, slotEnd, [], [existing], NO_BUFFER)).toBe(false);
  });

  it("un booking annulé (cancelled_by_client) ne bloque pas le créneau", () => {
    const cancelled = makeBooking(
      "2026-08-06T08:00:00Z",
      "2026-08-06T09:00:00Z",
      "cancelled_by_client",
    );
    const slotStart = new Date("2026-08-06T08:00:00Z");
    const slotEnd = new Date("2026-08-06T09:00:00Z");
    expect(hasConflict(slotStart, slotEnd, [], [cancelled], NO_BUFFER)).toBe(false);
  });

  it("un booking annulé (cancelled_by_coach) ne bloque pas le créneau", () => {
    const cancelled = makeBooking(
      "2026-08-06T08:00:00Z",
      "2026-08-06T09:00:00Z",
      "cancelled_by_coach",
    );
    const slotStart = new Date("2026-08-06T08:00:00Z");
    const slotEnd = new Date("2026-08-06T09:00:00Z");
    expect(hasConflict(slotStart, slotEnd, [], [cancelled], NO_BUFFER)).toBe(false);
  });

  it("un booking pending bloque le créneau", () => {
    const pending = makeBooking(
      "2026-08-06T08:00:00Z",
      "2026-08-06T09:00:00Z",
      "pending",
    );
    const slotStart = new Date("2026-08-06T08:00:00Z");
    const slotEnd = new Date("2026-08-06T09:00:00Z");
    expect(hasConflict(slotStart, slotEnd, [], [pending], NO_BUFFER)).toBe(true);
  });

  it("un booking completed bloque le créneau", () => {
    const completed = makeBooking(
      "2026-08-06T08:00:00Z",
      "2026-08-06T09:00:00Z",
      "completed",
    );
    const slotStart = new Date("2026-08-06T08:15:00Z");
    const slotEnd = new Date("2026-08-06T09:15:00Z");
    expect(hasConflict(slotStart, slotEnd, [], [completed], NO_BUFFER)).toBe(true);
  });
});

// ── 2. hasConflict — session comme unavailability (BUG PRINCIPAL) ─────────────

describe("hasConflict — session manuelles comme unavailabilities (fix bug principal)", () => {
  it("une session planifiée bloque le créneau public chevauché", () => {
    // Session 10h–11h Paris = 08:00–09:00 UTC en été
    const session = makeSessionUnavail("2026-08-06T08:00:00Z", 60);
    const slotStart = new Date("2026-08-06T08:30:00Z");
    const slotEnd = new Date("2026-08-06T09:30:00Z");
    expect(hasConflict(slotStart, slotEnd, [session], [], NO_BUFFER)).toBe(true);
  });

  it("une session planifiée ne bloque pas un créneau adjacent", () => {
    const session = makeSessionUnavail("2026-08-06T08:00:00Z", 60);
    const slotStart = new Date("2026-08-06T09:00:00Z");
    const slotEnd = new Date("2026-08-06T10:00:00Z");
    expect(hasConflict(slotStart, slotEnd, [session], [], NO_BUFFER)).toBe(false);
  });

  it("une session et un booking combinés bloquent correctement", () => {
    const session = makeSessionUnavail("2026-08-06T07:00:00Z", 60); // 07h-08h
    const booking = makeBooking("2026-08-06T09:00:00Z", "2026-08-06T10:00:00Z"); // 09h-10h

    const slotFreeAt8 = { start: new Date("2026-08-06T08:00:00Z"), end: new Date("2026-08-06T09:00:00Z") };
    const slotConflictAt8 = { start: new Date("2026-08-06T07:30:00Z"), end: new Date("2026-08-06T08:30:00Z") };
    const slotConflictAt9 = { start: new Date("2026-08-06T09:30:00Z"), end: new Date("2026-08-06T10:30:00Z") };

    expect(hasConflict(slotFreeAt8.start, slotFreeAt8.end, [session], [booking], NO_BUFFER)).toBe(false);
    expect(hasConflict(slotConflictAt8.start, slotConflictAt8.end, [session], [booking], NO_BUFFER)).toBe(true);
    expect(hasConflict(slotConflictAt9.start, slotConflictAt9.end, [session], [booking], NO_BUFFER)).toBe(true);
  });
});

// ── 3. hasConflict — buffer ────────────────────────────────────────────────────

describe("hasConflict — buffer après réservation", () => {
  it("le buffer bloque le créneau suivant", () => {
    const existing = makeBooking("2026-08-06T08:00:00Z", "2026-08-06T09:00:00Z");
    const bufferMs = 15 * 60 * 1000; // 15 min
    // Slot démarrant exactement à la fin du booking : doit être bloqué par le buffer
    const slotStart = new Date("2026-08-06T09:00:00Z");
    const slotEnd = new Date("2026-08-06T10:00:00Z");
    expect(hasConflict(slotStart, slotEnd, [], [existing], bufferMs)).toBe(true);
  });

  it("le slot après le buffer est libre", () => {
    const existing = makeBooking("2026-08-06T08:00:00Z", "2026-08-06T09:00:00Z");
    const bufferMs = 15 * 60 * 1000;
    // Slot démarrant après le buffer (09:15)
    const slotStart = new Date("2026-08-06T09:15:00Z");
    const slotEnd = new Date("2026-08-06T10:15:00Z");
    expect(hasConflict(slotStart, slotEnd, [], [existing], bufferMs)).toBe(false);
  });
});

// ── 4. computeSlots — slots bloqués correctement ─────────────────────────────

const BASE_SETTINGS: BookingSettings = {
  coach_id: "coach-a",
  min_notice_hours: 0,
  max_advance_days: 365,
  slot_duration_min: 60,
  buffer_after_min: 0,
  auto_confirm: true,
  timezone: "Europe/Paris",
};

// Règle disponible un mercredi (day_of_week=3), 08:00–12:00 Paris
const WEDNESDAY_RULE: AvailabilityRule = {
  id: "rule-1",
  coach_id: "coach-a",
  day_of_week: 3, // mercredi
  start_time: "08:00",
  end_time: "12:00",
  slot_duration_min: 60,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

// 2026-08-12 = mercredi (prochain mercredi après aujourd'hui 2026-08-06)
// Heure d'été UTC+2 : 08:00 Paris = 06:00Z, 09:00 Paris = 07:00Z
describe("computeSlots — scénarios de réservation", () => {
  it("créneau disponible quand aucun conflit", () => {
    const slots = computeSlots({
      rules: [WEDNESDAY_RULE],
      unavailabilities: [],
      bookings: [],
      settings: BASE_SETTINGS,
      fromDate: "2026-08-12",
      toDate: "2026-08-12",
      durationMin: 60,
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => s.available)).toBe(true);
  });

  it("créneau 08:00 bloqué par un booking existant", () => {
    // Booking 08:00–09:00 Paris = 06:00–07:00 UTC (heure d'été UTC+2)
    const booking = makeBooking("2026-08-12T06:00:00Z", "2026-08-12T07:00:00Z");
    const slots = computeSlots({
      rules: [WEDNESDAY_RULE],
      unavailabilities: [],
      bookings: [booking],
      settings: BASE_SETTINGS,
      fromDate: "2026-08-12",
      toDate: "2026-08-12",
      durationMin: 60,
    });
    const slot8h = slots.find((s) => s.starts_at === "2026-08-12T06:00:00.000Z");
    expect(slot8h).toBeDefined();
    expect(slot8h?.available).toBe(false);
  });

  it("créneau 08:00 bloqué par une session existante (bug principal corrigé)", () => {
    // Session 08:00–09:00 Paris = 06:00–07:00 UTC
    const sessionUnavail = makeSessionUnavail("2026-08-12T06:00:00Z", 60);
    const slots = computeSlots({
      rules: [WEDNESDAY_RULE],
      unavailabilities: [sessionUnavail],
      bookings: [],
      settings: BASE_SETTINGS,
      fromDate: "2026-08-12",
      toDate: "2026-08-12",
      durationMin: 60,
    });
    const slot8h = slots.find((s) => s.starts_at === "2026-08-12T06:00:00.000Z");
    expect(slot8h).toBeDefined();
    expect(slot8h?.available).toBe(false);
  });

  it("les créneaux non bloqués restent disponibles", () => {
    const booking = makeBooking("2026-08-12T06:00:00Z", "2026-08-12T07:00:00Z");
    const slots = computeSlots({
      rules: [WEDNESDAY_RULE],
      unavailabilities: [],
      bookings: [booking],
      settings: BASE_SETTINGS,
      fromDate: "2026-08-12",
      toDate: "2026-08-12",
      durationMin: 60,
    });
    // 09:00–10:00 Paris = 07:00Z doit être libre
    const slot9h = slots.find((s) => s.starts_at === "2026-08-12T07:00:00.000Z");
    expect(slot9h).toBeDefined();
    expect(slot9h?.available).toBe(true);
  });

  it("booking annulé ne bloque pas le créneau", () => {
    const cancelled = makeBooking(
      "2026-08-12T06:00:00Z",
      "2026-08-12T07:00:00Z",
      "cancelled_by_coach",
    );
    const slots = computeSlots({
      rules: [WEDNESDAY_RULE],
      unavailabilities: [],
      bookings: [cancelled],
      settings: BASE_SETTINGS,
      fromDate: "2026-08-12",
      toDate: "2026-08-12",
      durationMin: 60,
    });
    const slot8h = slots.find((s) => s.starts_at === "2026-08-12T06:00:00.000Z");
    expect(slot8h?.available).toBe(true);
  });
});

// ── 5. Affichage Paris — parisHourMinute ──────────────────────────────────────
// Cette fonction est définie dans CalendarClient.tsx (client component).
// On teste ici l'algorithme équivalent.

describe("parisHourMinute — conversion UTC → Paris", () => {
  function parisHourMinute(iso: string): { hours: number; minutes: number } {
    const d = new Date(iso);
    const parisStr = d.toLocaleString("sv", { timeZone: "Europe/Paris" });
    const [, timePart] = parisStr.split(" ");
    const [hStr, mStr] = timePart.split(":");
    return { hours: parseInt(hStr, 10), minutes: parseInt(mStr, 10) };
  }

  it("08:00 UTC = 10:00 Paris en été (UTC+2)", () => {
    const { hours, minutes } = parisHourMinute("2026-08-06T08:00:00Z");
    expect(hours).toBe(10);
    expect(minutes).toBe(0);
  });

  it("08:00 UTC = 09:00 Paris en hiver (UTC+1)", () => {
    const { hours, minutes } = parisHourMinute("2026-01-15T08:00:00Z");
    expect(hours).toBe(9);
    expect(minutes).toBe(0);
  });

  it("22:00 UTC = 00:00 Paris le lendemain en été", () => {
    const { hours } = parisHourMinute("2026-08-06T22:00:00Z");
    expect(hours).toBe(0);
  });

  it("heure d'hiver → heure d'été : 01:00 UTC le 29 mars 2026", () => {
    // 29 mars 2026 01:00 UTC = 02:00 CET = passage à CEST → 03:00 CEST
    // 01:00 UTC = 03:00 Paris (UTC+2 après passage)
    const { hours } = parisHourMinute("2026-03-29T01:00:00Z");
    expect(hours).toBe(3);
  });
});

// ── 6. Logique de chevauchement — règle exacte [start, end[ ──────────────────

describe("Règle de chevauchement — cas limites", () => {
  const A_START = "2026-08-06T08:00:00Z";
  const A_END   = "2026-08-06T09:00:00Z";

  it("chevauchement exact : mêmes bornes = conflit", () => {
    const b = makeBooking(A_START, A_END);
    const slotStart = new Date(A_START);
    const slotEnd = new Date(A_END);
    expect(hasConflict(slotStart, slotEnd, [], [b], 0)).toBe(true);
  });

  it("chevauchement partiel au début : conflit", () => {
    // Booking 09:00–10:00, slot 08:30–09:30 → chevauchent sur [09:00, 09:30]
    const b = makeBooking("2026-08-06T09:00:00Z", "2026-08-06T10:00:00Z");
    const slotStart = new Date("2026-08-06T08:30:00Z");
    const slotEnd   = new Date("2026-08-06T09:30:00Z");
    expect(hasConflict(slotStart, slotEnd, [], [b], 0)).toBe(true);
  });

  it("chevauchement partiel à la fin : conflit", () => {
    // Booking 08:00–09:00, slot 08:30–09:30 → chevauchent sur [08:30, 09:00]
    const b = makeBooking(A_START, A_END);
    const slotStart = new Date("2026-08-06T08:30:00Z");
    const slotEnd   = new Date("2026-08-06T09:30:00Z");
    expect(hasConflict(slotStart, slotEnd, [], [b], 0)).toBe(true);
  });

  it("slot entièrement contenu dans booking : conflit", () => {
    // Booking 08:00–10:00, slot 08:30–09:30
    const b = makeBooking(A_START, "2026-08-06T10:00:00Z");
    const slotStart = new Date("2026-08-06T08:30:00Z");
    const slotEnd   = new Date("2026-08-06T09:30:00Z");
    expect(hasConflict(slotStart, slotEnd, [], [b], 0)).toBe(true);
  });

  it("slot contient booking entièrement : conflit", () => {
    // Slot 07:00–10:00, booking 08:00–09:00
    const b = makeBooking(A_START, A_END);
    const slotStart = new Date("2026-08-06T07:00:00Z");
    const slotEnd   = new Date("2026-08-06T10:00:00Z");
    expect(hasConflict(slotStart, slotEnd, [], [b], 0)).toBe(true);
  });

  it("slot adjacent AVANT : pas de conflit", () => {
    // Booking 09:00–10:00, slot 08:00–09:00 → se touchent mais ne se chevauchent pas
    const b = makeBooking("2026-08-06T09:00:00Z", "2026-08-06T10:00:00Z");
    const slotStart = new Date(A_START);
    const slotEnd   = new Date("2026-08-06T09:00:00Z");
    expect(hasConflict(slotStart, slotEnd, [], [b], 0)).toBe(false);
  });

  it("slot adjacent APRÈS : pas de conflit", () => {
    // Booking 08:00–09:00, slot 09:00–10:00 → se touchent mais ne se chevauchent pas
    const b = makeBooking(A_START, A_END);
    const slotStart = new Date(A_END);
    const slotEnd   = new Date("2026-08-06T10:00:00Z");
    expect(hasConflict(slotStart, slotEnd, [], [b], 0)).toBe(false);
  });
});
