import { describe, it, expect } from "vitest";
import { computeWeeklyOccurrences, hasInMemoryConflict } from "../recurring.js";

// ── Helpers ────────────────────────────────────────────────────────────────────

function parisHourOf(iso: string): number {
  const str = new Date(iso).toLocaleString("sv", { timeZone: "Europe/Paris" });
  return parseInt(str.split(" ")[1].slice(0, 2), 10);
}

function parisMinuteOf(iso: string): number {
  const str = new Date(iso).toLocaleString("sv", { timeZone: "Europe/Paris" });
  return parseInt(str.split(" ")[1].slice(3, 5), 10);
}

// Thursday 2026-08-13, 10:00 Paris (UTC+2 in summer) → 08:00 UTC
const THURSDAY_10H_PARIS_ISO = "2026-08-13T08:00:00.000Z";

// ── 1. computeWeeklyOccurrences — génération des occurrences ──────────────────

describe("computeWeeklyOccurrences — génération des occurrences", () => {
  it("génère les bonnes occurrences pour une série de 3 semaines", () => {
    const occs = computeWeeklyOccurrences({
      firstScheduledAtISO: THURSDAY_10H_PARIS_ISO,
      repeatUntilParisDate: "2026-08-27",
      durationMin: 60,
    });
    expect(occs).toHaveLength(3);
    expect(occs[0].parisDateStr).toBe("2026-08-13");
    expect(occs[1].parisDateStr).toBe("2026-08-20");
    expect(occs[2].parisDateStr).toBe("2026-08-27");
  });

  it("inclut le jour de repeat_until (borne inclusive)", () => {
    const occs = computeWeeklyOccurrences({
      firstScheduledAtISO: THURSDAY_10H_PARIS_ISO,
      repeatUntilParisDate: "2026-08-13",
      durationMin: 60,
    });
    expect(occs).toHaveLength(1);
    expect(occs[0].parisDateStr).toBe("2026-08-13");
  });

  it("n'inclut aucune occurrence si repeat_until < date de la première", () => {
    const occs = computeWeeklyOccurrences({
      firstScheduledAtISO: THURSDAY_10H_PARIS_ISO,
      repeatUntilParisDate: "2026-08-12", // avant le premier jeudi
      durationMin: 60,
    });
    expect(occs).toHaveLength(0);
  });

  it("toutes les occurrences sont le même jour de semaine (jeudi)", () => {
    const occs = computeWeeklyOccurrences({
      firstScheduledAtISO: THURSDAY_10H_PARIS_ISO,
      repeatUntilParisDate: "2026-11-30",
      durationMin: 60,
    });
    // All should be Thursday (day 4 in JS, 0=Sunday)
    for (const occ of occs) {
      const d = new Date(occ.parisDateStr + "T12:00:00Z");
      expect(d.getUTCDay()).toBe(4); // Thursday
    }
  });

  it("toutes les occurrences sont à 10h heure Paris (même en hiver)", () => {
    // Series crossing DST change (October 25, 2026 → switches from UTC+2 to UTC+1)
    // Thursday August 13 (summer, UTC+2) to Thursday November 26 (winter, UTC+1)
    const occs = computeWeeklyOccurrences({
      firstScheduledAtISO: THURSDAY_10H_PARIS_ISO,
      repeatUntilParisDate: "2026-11-26",
      durationMin: 60,
    });
    expect(occs.length).toBeGreaterThan(5);

    for (const occ of occs) {
      const hour = parisHourOf(occ.startsAt.toISOString());
      expect(hour).toBe(10); // Always 10h Paris
      const minute = parisMinuteOf(occ.startsAt.toISOString());
      expect(minute).toBe(0);
    }
  });

  it("série longue (~1 an) génère ~52 occurrences", () => {
    const occs = computeWeeklyOccurrences({
      firstScheduledAtISO: THURSDAY_10H_PARIS_ISO,
      repeatUntilParisDate: "2027-08-12",
      durationMin: 60,
    });
    expect(occs.length).toBeGreaterThanOrEqual(52);
    expect(occs.length).toBeLessThanOrEqual(53);
  });

  it("série courte (2 semaines seulement)", () => {
    const occs = computeWeeklyOccurrences({
      firstScheduledAtISO: THURSDAY_10H_PARIS_ISO,
      repeatUntilParisDate: "2026-08-20",
      durationMin: 60,
    });
    expect(occs).toHaveLength(2);
  });

  it("la durée est respectée pour chaque occurrence (endsAt = startsAt + durationMin)", () => {
    const occs = computeWeeklyOccurrences({
      firstScheduledAtISO: THURSDAY_10H_PARIS_ISO,
      repeatUntilParisDate: "2026-08-27",
      durationMin: 90,
    });
    for (const occ of occs) {
      const diff = occ.endsAt.getTime() - occ.startsAt.getTime();
      expect(diff).toBe(90 * 60 * 1000);
    }
  });

  it("les dates Paris sont exactement à 7 jours d'intervalle", () => {
    const occs = computeWeeklyOccurrences({
      firstScheduledAtISO: THURSDAY_10H_PARIS_ISO,
      repeatUntilParisDate: "2026-10-15",
      durationMin: 60,
    });
    for (let i = 1; i < occs.length; i++) {
      const prev = occs[i - 1].parisDateStr;
      const curr = occs[i].parisDateStr;
      const [py, pm, pd] = prev.split("-").map(Number);
      const [cy, cm, cd] = curr.split("-").map(Number);
      const diffMs = new Date(cy, cm - 1, cd).getTime() - new Date(py, pm - 1, pd).getTime();
      expect(diffMs).toBe(7 * 24 * 60 * 60 * 1000);
    }
  });

  it("série traversant le passage heure d'hiver → heure d'été (mars 2027)", () => {
    // Thursday February 18, 2027 at 10h Paris (UTC+1 in winter) → March 27 DST switch
    // 2027-02-18T10:00 CET = 2027-02-18T09:00Z
    const firstISO = "2027-02-18T09:00:00.000Z";
    const occs = computeWeeklyOccurrences({
      firstScheduledAtISO: firstISO,
      repeatUntilParisDate: "2027-04-15",
      durationMin: 60,
    });
    // After DST switch (March 28), UTC offset changes from +1 to +2
    // All occurrences should still be at 10h Paris
    for (const occ of occs) {
      expect(parisHourOf(occ.startsAt.toISOString())).toBe(10);
    }
  });
});

// ── 2. hasInMemoryConflict — détection de conflits ────────────────────────────

describe("hasInMemoryConflict — conflits en mémoire", () => {
  const START_A = new Date("2026-08-13T08:00:00Z"); // 10:00 Paris
  const END_A   = new Date("2026-08-13T09:00:00Z"); // 11:00 Paris

  it("pas de conflit quand sessions et bookings sont vides", () => {
    const { conflict } = hasInMemoryConflict(START_A, END_A, [], []);
    expect(conflict).toBe(false);
  });

  it("conflit avec une session qui chevauche", () => {
    const sessions = [
      { scheduled_at: "2026-08-13T08:30:00Z", duration_min: 60 }, // 10h30–11h30 Paris
    ];
    const { conflict, reason } = hasInMemoryConflict(START_A, END_A, sessions, []);
    expect(conflict).toBe(true);
    expect(reason).toContain("séance");
  });

  it("pas de conflit avec une session adjacente (juste avant)", () => {
    const sessions = [
      { scheduled_at: "2026-08-13T07:00:00Z", duration_min: 60 }, // 09:00–10:00 Paris
    ];
    const { conflict } = hasInMemoryConflict(START_A, END_A, sessions, []);
    expect(conflict).toBe(false);
  });

  it("pas de conflit avec une session adjacente (juste après)", () => {
    const sessions = [
      { scheduled_at: "2026-08-13T09:00:00Z", duration_min: 60 }, // 11:00–12:00 Paris
    ];
    const { conflict } = hasInMemoryConflict(START_A, END_A, sessions, []);
    expect(conflict).toBe(false);
  });

  it("conflit avec un booking qui chevauche", () => {
    const bookings = [
      {
        starts_at: "2026-08-13T08:30:00Z",
        ends_at:   "2026-08-13T09:30:00Z",
        status: "confirmed" as const,
      },
    ];
    const { conflict, reason } = hasInMemoryConflict(START_A, END_A, [], bookings);
    expect(conflict).toBe(true);
    expect(reason).toContain("réservation");
  });

  it("pas de conflit avec un booking annulé (cancelled_by_client)", () => {
    const bookings = [
      {
        starts_at: "2026-08-13T08:00:00Z",
        ends_at:   "2026-08-13T09:00:00Z",
        status: "cancelled_by_client" as const,
      },
    ];
    const { conflict } = hasInMemoryConflict(START_A, END_A, [], bookings);
    expect(conflict).toBe(false);
  });

  it("pas de conflit avec un booking annulé (cancelled_by_coach)", () => {
    const bookings = [
      {
        starts_at: "2026-08-13T08:00:00Z",
        ends_at:   "2026-08-13T09:00:00Z",
        status: "cancelled_by_coach" as const,
      },
    ];
    const { conflict } = hasInMemoryConflict(START_A, END_A, [], bookings);
    expect(conflict).toBe(false);
  });

  it("une session annulée (annulée) ne bloque pas", () => {
    const sessions = [
      { scheduled_at: "2026-08-13T08:00:00Z", duration_min: 60, status: "annulée" },
    ];
    const { conflict } = hasInMemoryConflict(START_A, END_A, sessions, []);
    expect(conflict).toBe(false);
  });

  it("une session no_show ne bloque pas", () => {
    const sessions = [
      { scheduled_at: "2026-08-13T08:00:00Z", duration_min: 60, status: "no_show" },
    ];
    const { conflict } = hasInMemoryConflict(START_A, END_A, sessions, []);
    expect(conflict).toBe(false);
  });

  it("priorité session : signale conflit session en premier", () => {
    const sessions = [
      { scheduled_at: "2026-08-13T08:00:00Z", duration_min: 60 },
    ];
    const bookings = [
      { starts_at: "2026-08-13T08:00:00Z", ends_at: "2026-08-13T09:00:00Z", status: "confirmed" as const },
    ];
    const { conflict, reason } = hasInMemoryConflict(START_A, END_A, sessions, bookings);
    expect(conflict).toBe(true);
    // Reason should mention "séance" because sessions are checked first
    expect(reason).toContain("séance");
  });
});

// ── 3. Scénario de bout en bout — série avec conflit ──────────────────────────

describe("scénario complet — série avec 1 conflit", () => {
  it("identifie correctement les occurrences sans conflit et celles en conflit", () => {
    const occs = computeWeeklyOccurrences({
      firstScheduledAtISO: THURSDAY_10H_PARIS_ISO, // 2026-08-13
      repeatUntilParisDate: "2026-09-03",
      durationMin: 60,
    });
    // 4 occurrences: 08-13, 08-20, 08-27, 09-03
    expect(occs).toHaveLength(4);

    // Existing session conflicts with 3rd occurrence (2026-08-27)
    const existingSessions = [
      { scheduled_at: "2026-08-27T08:30:00Z", duration_min: 60 }, // overlaps 10h–11h Paris
    ];

    const results = occs.map((occ) => {
      const { conflict, reason } = hasInMemoryConflict(
        occ.startsAt,
        occ.endsAt,
        existingSessions,
        [],
      );
      return { date: occ.parisDateStr, conflict, reason };
    });

    expect(results[0].conflict).toBe(false); // 08-13 libre
    expect(results[1].conflict).toBe(false); // 08-20 libre
    expect(results[2].conflict).toBe(true);  // 08-27 conflit
    expect(results[2].reason).toContain("séance");
    expect(results[3].conflict).toBe(false); // 09-03 libre
  });
});
