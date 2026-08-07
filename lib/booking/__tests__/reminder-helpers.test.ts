import { describe, it, expect } from "vitest";
import {
  buildReminderWindow,
  claimCutoff,
  lateBookingCutoff,
  REMINDER_WINDOW_MIN_HOURS,
  REMINDER_WINDOW_MAX_HOURS,
  REMINDER_CLAIM_EXPIRY_MINUTES,
  REMINDER_LATE_BOOKING_MIN_HOURS,
} from "../reminder-helpers.js";

// ── Helpers ────────────────────────────────────────────────────────────────────

const NOW = new Date("2026-08-10T10:00:00.000Z");

function h(hours: number): Date {
  return new Date(NOW.getTime() + hours * 60 * 60 * 1000);
}

type BookingLike = {
  id: string;
  status: string;
  client_email: string;
  starts_at: string;
  created_at: string;
  reminder_sent_at: string | null;
  reminder_claimed_at: string | null;
};

function makeBooking(overrides: Partial<BookingLike> = {}): BookingLike {
  return {
    id: "booking-test",
    status: "confirmed",
    client_email: "client@test.fr",
    starts_at: h(24).toISOString(),
    created_at: h(-7).toISOString(),
    reminder_sent_at: null,
    reminder_claimed_at: null,
    ...overrides,
  };
}

// Réplique de la logique SELECT de app/api/cron/reminder/route.ts
function shouldSelectForReminder(booking: BookingLike, now: Date): boolean {
  const { windowStart, windowEnd } = buildReminderWindow(now);
  const expiredBefore = claimCutoff(now);
  const createdBefore = lateBookingCutoff(now);

  if (booking.status !== "confirmed") return false;
  if (booking.reminder_sent_at !== null) return false;

  const claimedAt = booking.reminder_claimed_at;
  const claimOk = claimedAt === null || new Date(claimedAt) < expiredBefore;
  if (!claimOk) return false;

  const startsAt = new Date(booking.starts_at);
  if (startsAt < windowStart || startsAt >= windowEnd) return false;

  const createdAt = new Date(booking.created_at);
  if (createdAt >= createdBefore) return false;

  return true;
}

// Mock DB avec atomic claim (réplique de l'UPDATE conditionnel Supabase)
function createMockDb(initialBookings: BookingLike[]) {
  const db = initialBookings.map((b) => ({ ...b }));

  return {
    atomicClaim(id: string, now: Date): boolean {
      const expiredBefore = claimCutoff(now);
      const booking = db.find((b) => b.id === id);
      if (!booking) return false;
      if (booking.reminder_sent_at !== null) return false;
      const claimedAt = booking.reminder_claimed_at;
      const canClaim = claimedAt === null || new Date(claimedAt) < expiredBefore;
      if (!canClaim) return false;
      booking.reminder_claimed_at = now.toISOString();
      return true;
    },
    markSent(id: string, now: Date): void {
      const b = db.find((b) => b.id === id);
      if (b) b.reminder_sent_at = now.toISOString();
    },
    find(id: string): BookingLike | null {
      return db.find((b) => b.id === id) ?? null;
    },
  };
}

// ── Scénarios requis ───────────────────────────────────────────────────────────

describe("cron/reminder — fenêtre de sélection", () => {
  it("1. run normal ~24h avant → rappel sélectionné", () => {
    // Cas nominal : booking 24h avant le run, bien dans [+12h, +26h]
    const b = makeBooking({ starts_at: h(24).toISOString() });
    expect(shouldSelectForReminder(b, NOW)).toBe(true);
  });

  it("2. trou de cron de 9h → rappel rattrapé par la fenêtre élargie", () => {
    // Scénario réel observé : le run à NOW-9h a échoué.
    // À ce moment, le booking était à +24h (bien dans la fenêtre).
    // Maintenant il est à +15h.
    // Ancienne fenêtre [+22h, +26h] : 15h < 22h → raté définitivement.
    // Nouvelle fenêtre [+12h, +26h] : 15h ∈ [12h, 26h] → rattrapé.
    const b = makeBooking({ starts_at: h(15).toISOString() });
    expect(shouldSelectForReminder(b, NOW)).toBe(true);
  });

  it("3. rendez-vous à moins de 12h → pas de rappel J-1 tardif", () => {
    // La borne basse protège contre les envois trop proches du RDV
    const b = makeBooking({ starts_at: h(10).toISOString() });
    expect(shouldSelectForReminder(b, NOW)).toBe(false);
  });

  it("4. rendez-vous à plus de 26h → pas encore dans la fenêtre", () => {
    // La borne haute empêche d'envoyer trop tôt (> J-1)
    const b = makeBooking({ starts_at: h(28).toISOString() });
    expect(shouldSelectForReminder(b, NOW)).toBe(false);
  });

  it("5. reminder_sent_at déjà rempli → aucun doublon", () => {
    const b = makeBooking({
      starts_at: h(20).toISOString(),
      reminder_sent_at: h(-1).toISOString(),
    });
    expect(shouldSelectForReminder(b, NOW)).toBe(false);
  });

  it("6. deux exécutions concurrentes → un seul envoi (atomic claim)", () => {
    const b = makeBooking({ starts_at: h(20).toISOString() });
    const db = createMockDb([b]);

    const claim1 = db.atomicClaim(b.id, NOW);
    const claim2 = db.atomicClaim(b.id, NOW);

    expect(claim1).toBe(true);
    expect(claim2).toBe(false);

    // Après markSent, aucun run suivant ne peut plus réclamer
    db.markSent(b.id, NOW);
    expect(db.atomicClaim(b.id, h(1))).toBe(false);
  });
});

describe("cron/reminder — filtre réservation tardive (created_at)", () => {
  it("booking créé il y a 3h → ignoré (< 6h, client vient de recevoir la confirmation)", () => {
    // La confirmation email est envoyée à la réservation. Si le RDV est déjà
    // dans la fenêtre, on évite un double envoi en excluant les bookings récents.
    const b = makeBooking({
      starts_at: h(20).toISOString(),
      created_at: h(-3).toISOString(),
    });
    expect(shouldSelectForReminder(b, NOW)).toBe(false);
  });

  it("booking créé il y a 7h → inclus (filtre 6h dépassé)", () => {
    const b = makeBooking({
      starts_at: h(20).toISOString(),
      created_at: h(-7).toISOString(),
    });
    expect(shouldSelectForReminder(b, NOW)).toBe(true);
  });

  it("booking créé exactement il y a 6h → toujours exclu (borne stricte)", () => {
    // created_at < now - 6h : 6h exact n'est pas strictement inférieur
    const b = makeBooking({
      starts_at: h(20).toISOString(),
      created_at: h(-6).toISOString(),
    });
    expect(shouldSelectForReminder(b, NOW)).toBe(false);
  });
});

describe("cron/reminder — statuts et anti-doublon", () => {
  it("statut cancelled_by_client → ignoré", () => {
    const b = makeBooking({ status: "cancelled_by_client" });
    expect(shouldSelectForReminder(b, NOW)).toBe(false);
  });

  it("statut pending → ignoré (seul 'confirmed' déclenche un rappel)", () => {
    const b = makeBooking({ status: "pending" });
    expect(shouldSelectForReminder(b, NOW)).toBe(false);
  });

  it("verrou frais (5 min) → non récupérable", () => {
    const b = makeBooking({
      starts_at: h(20).toISOString(),
      reminder_claimed_at: h(-5 / 60).toISOString(),
    });
    expect(shouldSelectForReminder(b, NOW)).toBe(false);
  });

  it("verrou expiré (15 min) → récupérable", () => {
    const b = makeBooking({
      starts_at: h(20).toISOString(),
      reminder_claimed_at: new Date(NOW.getTime() - 15 * 60 * 1000).toISOString(),
    });
    const db = createMockDb([b]);
    expect(db.atomicClaim(b.id, NOW)).toBe(true);
  });
});

describe("cron/reminder — constantes métier", () => {
  it("borne basse = 12h (absorbe les gaps GitHub Actions jusqu'à 14h)", () => {
    expect(REMINDER_WINDOW_MIN_HOURS).toBe(12);
  });

  it("borne haute = 26h", () => {
    expect(REMINDER_WINDOW_MAX_HOURS).toBe(26);
  });

  it("expiry du verrou = 10 min", () => {
    expect(REMINDER_CLAIM_EXPIRY_MINUTES).toBe(10);
  });

  it("filtre réservation tardive = 6h", () => {
    expect(REMINDER_LATE_BOOKING_MIN_HOURS).toBe(6);
  });

  it("buildReminderWindow produit une fenêtre de 14h", () => {
    const { windowStart, windowEnd } = buildReminderWindow(NOW);
    const widthHours = (windowEnd.getTime() - windowStart.getTime()) / 3_600_000;
    expect(widthHours).toBe(REMINDER_WINDOW_MAX_HOURS - REMINDER_WINDOW_MIN_HOURS);
    expect(widthHours).toBe(14);
  });
});
