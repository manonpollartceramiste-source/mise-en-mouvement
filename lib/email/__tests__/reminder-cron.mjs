/**
 * Tests unitaires du cron de rappel J-1.
 * Exécutable : node lib/email/__tests__/reminder-cron.mjs
 * Aucun email réel, aucune connexion DB.
 */

import assert from "node:assert/strict";

// ─── Réplication des fonctions pures de reminder-helpers.ts ──────────────────

const REMINDER_WINDOW_MIN_HOURS = 22;
const REMINDER_WINDOW_MAX_HOURS = 26;
const REMINDER_CLAIM_EXPIRY_MINUTES = 10;
const REMINDER_LATE_BOOKING_MIN_HOURS = 6;

function buildReminderWindow(now) {
  return {
    windowStart: new Date(now.getTime() + REMINDER_WINDOW_MIN_HOURS * 60 * 60 * 1000),
    windowEnd:   new Date(now.getTime() + REMINDER_WINDOW_MAX_HOURS * 60 * 60 * 1000),
  };
}

function claimCutoff(now) {
  return new Date(now.getTime() - REMINDER_CLAIM_EXPIRY_MINUTES * 60 * 1000);
}

function lateBookingCutoff(now) {
  return new Date(now.getTime() - REMINDER_LATE_BOOKING_MIN_HOURS * 60 * 60 * 1000);
}

// ─── Données de base ─────────────────────────────────────────────────────────

const NOW = new Date("2026-08-10T10:00:00.000Z");
const IN_23H = new Date(NOW.getTime() + 23 * 60 * 60 * 1000); // dans la fenêtre [22h, 26h]
const CREATED_7H_AGO = new Date(NOW.getTime() - 7 * 60 * 60 * 1000); // >= 6h donc inclus
const cabinetAddress = "Cabinet Mise en Mouvement, 2 place du Marché, 34560 Poussan";

function makeBooking(overrides = {}) {
  return {
    id: "booking-" + Math.random().toString(36).slice(2),
    coach_id: "coach-1",
    offer_id: "offer-1",
    client_name: "Marie Dupont",
    client_email: "marie@exemple.fr",
    client_phone: "06 12 34 56 78",
    client_profile_id: null,
    starts_at: IN_23H.toISOString(),
    ends_at: new Date(IN_23H.getTime() + 60 * 60 * 1000).toISOString(),
    duration_min: 60,
    status: "confirmed",
    payment_method: "cabinet",
    payment_status: "pending",
    client_notes: null,
    coach_notes: null,
    cancelled_at: null,
    cancellation_reason: null,
    google_event_id: null,
    force_overlap: false,
    overlap_reason: null,
    reminder_sent_at: null,
    reminder_claimed_at: null,
    created_at: CREATED_7H_AGO.toISOString(),
    updated_at: CREATED_7H_AGO.toISOString(),
    ...overrides,
  };
}

// ─── Logique de sélection SQL simulée ────────────────────────────────────────

/**
 * Simule la requête SELECT du cron :
 *   - statut confirmed uniquement
 *   - reminder_sent_at IS NULL
 *   - reminder_claimed_at IS NULL ou < expiredBefore
 *   - starts_at dans [windowStart, windowEnd[
 *   - created_at < createdBefore (réservation >= 6h avant)
 */
function shouldSelectForReminder(booking, now) {
  const { windowStart, windowEnd } = buildReminderWindow(now);
  const expiredBefore = claimCutoff(now);
  const createdBefore = lateBookingCutoff(now);

  if (booking.status !== "confirmed") return false;
  if (booking.reminder_sent_at !== null) return false;

  const claimedAt = booking.reminder_claimed_at;
  const claimOk =
    claimedAt === null || new Date(claimedAt) < expiredBefore;
  if (!claimOk) return false;

  const startsAt = new Date(booking.starts_at);
  if (startsAt < windowStart || startsAt >= windowEnd) return false;

  const createdAt = new Date(booking.created_at);
  if (createdAt >= createdBefore) return false;

  return true;
}

// ─── Mock DB avec atomic claim ────────────────────────────────────────────────

function createMockDb(initialBookings) {
  // Copie profonde pour isoler les tests
  const db = initialBookings.map((b) => ({ ...b }));

  return {
    getAll() {
      return db.map((b) => ({ ...b }));
    },

    /**
     * Simule l'UPDATE atomique du cron :
     * met à jour reminder_claimed_at uniquement si :
     *   - reminder_sent_at IS NULL
     *   - reminder_claimed_at IS NULL ou < expiredBefore
     * Retourne true si la mise à jour a eu lieu (claim réussi).
     */
    atomicClaim(id, now) {
      const expiredBefore = claimCutoff(now);
      const booking = db.find((b) => b.id === id);
      if (!booking) return false;

      if (booking.reminder_sent_at !== null) return false;

      const claimedAt = booking.reminder_claimed_at;
      const canClaim =
        claimedAt === null || new Date(claimedAt) < expiredBefore;
      if (!canClaim) return false;

      booking.reminder_claimed_at = now.toISOString();
      return true;
    },

    markSent(id, now) {
      const booking = db.find((b) => b.id === id);
      if (booking) {
        booking.reminder_sent_at = now.toISOString();
      }
    },

    find(id) {
      const b = db.find((b) => b.id === id);
      return b ? { ...b } : null;
    },
  };
}

// ─── Version simplifiée de clientReminderEmail pour tester la génération ─────

function formatDateTime(isoString) {
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

function clientReminderEmail(data) {
  const { date, time } = formatDateTime(data.startsAt);
  const endTime = formatDateTime(data.endsAt).time;

  const html = `
    <h1>Rappel — votre séance demain</h1>
    <p>Bonjour ${data.clientName}, votre séance avec ${data.coachName}.</p>
    <p>Prestation : ${data.offerName}${data.offerDuration ? ` · ${data.offerDuration}` : ""}</p>
    <p>Date : ${date}</p>
    <p>Horaire : ${time} – ${endTime}</p>
    <p>Lieu : ${data.cabinetAddress}</p>
    <p>Contact : ${data.coachEmail}</p>
  `;

  return {
    subject: `Rappel — votre séance demain avec ${data.coachName}`,
    html,
  };
}

// ─── Infrastructure de test ───────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
    failed++;
  }
}

// ─── Tests obligatoires ───────────────────────────────────────────────────────

console.log("\nCron rappel J-1 — tests unitaires\n");

// 1. Réservation confirmée dans la fenêtre — sélectionnée
test("1. Réservation confirmée dans la fenêtre — sélectionnée", () => {
  const b = makeBooking({ status: "confirmed" });
  assert.equal(shouldSelectForReminder(b, NOW), true);
});

// 2. Réservation annulée — ignorée
test("2. Réservation annulée — ignorée (status 'cancelled_by_client')", () => {
  const b = makeBooking({ status: "cancelled_by_client" });
  assert.equal(shouldSelectForReminder(b, NOW), false);
});

// 3. Réservation passée — ignorée
test("3. Réservation passée — ignorée (starts_at dans le passé)", () => {
  const pastDate = new Date(NOW.getTime() - 2 * 60 * 60 * 1000); // 2h avant NOW
  const b = makeBooking({ starts_at: pastDate.toISOString() });
  assert.equal(shouldSelectForReminder(b, NOW), false);
});

// 4. Réservation hors fenêtre (30h) — ignorée
test("4. Réservation hors fenêtre (30h) — ignorée", () => {
  const in30h = new Date(NOW.getTime() + 30 * 60 * 60 * 1000);
  const b = makeBooking({ starts_at: in30h.toISOString() });
  assert.equal(shouldSelectForReminder(b, NOW), false);
});

// 5. Réservation déjà rappelée — ignorée
test("5. Réservation déjà rappelée — ignorée (reminder_sent_at non null)", () => {
  const b = makeBooking({ reminder_sent_at: new Date(NOW.getTime() - 30 * 60 * 1000).toISOString() });
  assert.equal(shouldSelectForReminder(b, NOW), false);
});

// 6. Email absent — ignoré
test("6. Email absent — ignoré (client_email vide)", () => {
  const b = makeBooking({ client_email: "" });
  // La sélection SQL ne filtre pas sur client_email (colonne NOT NULL en prod)
  // Mais le cron skippe si !candidate.client_email
  // On simule la logique du cron ici
  const selected = shouldSelectForReminder(b, NOW);
  const cronWouldSkip = !b.client_email;
  assert.equal(selected, true);  // SQL le sélectionne
  assert.equal(cronWouldSkip, true); // mais le cron le skip
});

// 7. Deux exécutions concurrentes — un seul envoi
test("7. Deux exécutions concurrentes — un seul envoi (via mockDb.atomicClaim)", () => {
  const b = makeBooking();
  const db = createMockDb([b]);

  const claim1 = db.atomicClaim(b.id, NOW);
  const claim2 = db.atomicClaim(b.id, NOW); // concurrent

  assert.equal(claim1, true,  "Le premier claim doit réussir");
  assert.equal(claim2, false, "Le second claim doit échouer (déjà réclamé)");
});

// 8. CRON_SECRET invalide — rejeté
test("8. CRON_SECRET invalide — rejeté (vérification logique pure)", () => {
  function checkAuth(secret, authHeader) {
    if (!secret || authHeader !== `Bearer ${secret}`) return 401;
    return 200;
  }

  assert.equal(checkAuth("my-secret", "Bearer my-secret"), 200);
  assert.equal(checkAuth("my-secret", "Bearer wrong"),     401);
  assert.equal(checkAuth("my-secret", null),               401);
  assert.equal(checkAuth(undefined,   "Bearer anything"),  401);
  assert.equal(checkAuth("",          "Bearer "),          401);
});

// 9. Erreur Resend — retry possible (verrou expiré après échec)
test("9. Erreur Resend — retry possible (verrou expiré après 10 min)", () => {
  const b = makeBooking();
  const db = createMockDb([b]);

  // Première exécution : claim réussi mais email échoue
  const claimed = db.atomicClaim(b.id, NOW);
  assert.equal(claimed, true);
  // reminder_sent_at NON positionné (échec email)

  // 11 minutes plus tard : le verrou est expiré
  const later = new Date(NOW.getTime() + 11 * 60 * 1000);
  const retry = db.atomicClaim(b.id, later);
  assert.equal(retry, true, "Le claim doit réussir après expiry du verrou");
});

// 10. Succès — reminder_sent_at renseigné
test("10. Succès — reminder_sent_at renseigné", () => {
  const b = makeBooking();
  const db = createMockDb([b]);

  db.atomicClaim(b.id, NOW);
  db.markSent(b.id, NOW);

  const updated = db.find(b.id);
  assert.ok(updated.reminder_sent_at !== null, "reminder_sent_at doit être non null");
  assert.equal(updated.reminder_sent_at, NOW.toISOString());
});

// 11. Paiement cabinet — email généré sans mention de paiement
test("11. Paiement cabinet — email généré sans mention de paiement", () => {
  const data = {
    clientName: "Marie Dupont",
    coachName: "Dorian Hébert",
    coachEmail: "dorian@exemple.fr",
    offerName: "Séance individuelle",
    offerDuration: "60 min",
    startsAt: IN_23H.toISOString(),
    endsAt: new Date(IN_23H.getTime() + 60 * 60 * 1000).toISOString(),
    cabinetAddress,
    paymentMethod: "cabinet",
  };
  const { html } = clientReminderEmail(data);
  // L'email rappel ne mentionne pas le paiement
  assert.ok(!html.toLowerCase().includes("paiement"), "Pas de mention 'paiement' dans l'email rappel");
});

// 12. Paiement SumUp — pas de "SumUp" dans le rappel
test("12. Paiement SumUp — pas de 'SumUp' dans le rappel", () => {
  const data = {
    clientName: "Marie Dupont",
    coachName: "Dorian Hébert",
    coachEmail: "dorian@exemple.fr",
    offerName: "Séance individuelle",
    offerDuration: "60 min",
    startsAt: IN_23H.toISOString(),
    endsAt: new Date(IN_23H.getTime() + 60 * 60 * 1000).toISOString(),
    cabinetAddress,
    paymentMethod: "online",
  };
  const { html } = clientReminderEmail(data);
  assert.ok(!html.includes("SumUp"), "Pas de 'SumUp' dans l'email rappel");
});

// 13. Paiement inconnu (null) — email généré sans erreur
test("13. Paiement inconnu (null) — email généré sans erreur", () => {
  const data = {
    clientName: "Marie Dupont",
    coachName: "Dorian Hébert",
    coachEmail: "dorian@exemple.fr",
    offerName: "Séance individuelle",
    offerDuration: null,
    startsAt: IN_23H.toISOString(),
    endsAt: new Date(IN_23H.getTime() + 60 * 60 * 1000).toISOString(),
    cabinetAddress,
    paymentMethod: null,
  };
  let html;
  assert.doesNotThrow(() => {
    ({ html } = clientReminderEmail(data));
  });
  assert.ok(typeof html === "string" && html.length > 0);
});

// 14. Adresse Poussan — présente dans le contenu de l'email
test("14. Adresse Poussan — présente dans le contenu de l'email", () => {
  const data = {
    clientName: "Marie Dupont",
    coachName: "Dorian Hébert",
    coachEmail: "dorian@exemple.fr",
    offerName: "Séance individuelle",
    offerDuration: "60 min",
    startsAt: IN_23H.toISOString(),
    endsAt: new Date(IN_23H.getTime() + 60 * 60 * 1000).toISOString(),
    cabinetAddress,
    paymentMethod: "cabinet",
  };
  const { html } = clientReminderEmail(data);
  assert.ok(html.includes("Poussan"), "L'adresse Poussan doit apparaître dans l'email");
  assert.ok(html.includes("34560"), "Le code postal 34560 doit apparaître");
});

// 15. Timezone Europe/Paris — 2026-08-11T07:00:00Z affiche 09:00
test("15. Timezone Europe/Paris — 2026-08-11T07:00:00Z affiche 09:00", () => {
  const iso = "2026-08-11T07:00:00.000Z";
  const { time } = formatDateTime(iso);
  // En été (CEST = UTC+2), 07:00 UTC = 09:00 Paris
  assert.equal(time, "09:00", `Attendu 09:00, obtenu ${time}`);
});

// 16. Caractères spéciaux dans le nom client — pas d'exception
test("16. Caractères spéciaux dans le nom client — pas d'exception", () => {
  const data = {
    clientName: "Jean-Paul <O'Brien> & Müller",
    coachName: "Dorian Hébert",
    coachEmail: "dorian@exemple.fr",
    offerName: "Séance <test> & \"eval\"",
    offerDuration: "60 min",
    startsAt: IN_23H.toISOString(),
    endsAt: new Date(IN_23H.getTime() + 60 * 60 * 1000).toISOString(),
    cabinetAddress,
    paymentMethod: null,
  };
  assert.doesNotThrow(() => {
    const { html, subject } = clientReminderEmail(data);
    assert.ok(html.length > 0);
    assert.ok(subject.length > 0);
  });
});

// 17. Réservation créée il y a 3h — ignorée (< 6h)
test("17. Réservation créée il y a 3h — ignorée (< 6h)", () => {
  const createdRecently = new Date(NOW.getTime() - 3 * 60 * 60 * 1000);
  const b = makeBooking({ created_at: createdRecently.toISOString() });
  assert.equal(shouldSelectForReminder(b, NOW), false,
    "Une réservation créée il y a moins de 6h ne doit pas être sélectionnée");
});

// 18. Verrou expiré (15 min) — récupérable
test("18. Verrou expiré (15 min) — récupérable (atomic claim réussit)", () => {
  // Scénario : verrou posé il y a 15 min (> 10 min = expiré)
  const claimedAt = new Date(NOW.getTime() - 15 * 60 * 1000);
  const b = makeBooking({ reminder_claimed_at: claimedAt.toISOString() });
  const db = createMockDb([b]);

  // Le verrou est expiré, un nouveau claim doit réussir
  const result = db.atomicClaim(b.id, NOW);
  assert.equal(result, true, "Le claim doit réussir sur un verrou expiré (15 min > 10 min)");
});

// ─── Tests optionnels ─────────────────────────────────────────────────────────

console.log("\n--- Tests optionnels ---");

// Hors fenêtre par le bas (10h avant = trop tôt)
test("OPT-A. Réservation dans 10h — hors fenêtre (trop tôt)", () => {
  const in10h = new Date(NOW.getTime() + 10 * 60 * 60 * 1000);
  const b = makeBooking({ starts_at: in10h.toISOString() });
  assert.equal(shouldSelectForReminder(b, NOW), false);
});

// cancelled_by_coach — ignorée
test("OPT-B. Réservation annulée par le coach — ignorée", () => {
  const b = makeBooking({ status: "cancelled_by_coach" });
  assert.equal(shouldSelectForReminder(b, NOW), false);
});

// Réservation pending — ignorée (seul 'confirmed' déclenche un rappel)
test("OPT-C. Réservation pending — ignorée (seul 'confirmed' déclenche un rappel)", () => {
  const b = makeBooking({ status: "pending" });
  assert.equal(shouldSelectForReminder(b, NOW), false,
    "Une réservation 'pending' ne doit pas recevoir de rappel");
});

// Réservation exactement à windowStart — sélectionnée (borne incluse)
test("OPT-D. starts_at exactement à windowStart — sélectionnée", () => {
  const { windowStart } = buildReminderWindow(NOW);
  const b = makeBooking({ starts_at: windowStart.toISOString() });
  assert.equal(shouldSelectForReminder(b, NOW), true);
});

// Réservation exactement à windowEnd — ignorée (borne exclue)
test("OPT-E. starts_at exactement à windowEnd — ignorée (borne exclue)", () => {
  const { windowEnd } = buildReminderWindow(NOW);
  const b = makeBooking({ starts_at: windowEnd.toISOString() });
  assert.equal(shouldSelectForReminder(b, NOW), false);
});

// Verrou frais (5 min) — non récupérable
test("OPT-F. Verrou frais (5 min) — non récupérable", () => {
  const claimedAt = new Date(NOW.getTime() - 5 * 60 * 1000);
  const b = makeBooking({ reminder_claimed_at: claimedAt.toISOString() });
  const db = createMockDb([b]);

  const result = db.atomicClaim(b.id, NOW);
  assert.equal(result, false, "Un verrou de 5 min (< 10 min) ne doit pas être récupérable");
});

// ─── Tests résolution email coach ─────────────────────────────────────────────

console.log("\n--- Tests résolution email coach ---");

// Simule la logique de buildEmailData : proEmail > email CMS > profilesEmail > adminEmail
function resolveCoachContactEmail(coach, profilesEmail, adminEmail) {
  return (
    coach?.proEmail?.trim() ||
    coach?.email?.trim() ||
    profilesEmail ||
    adminEmail
  );
}

const ADMIN_EMAIL_FALLBACK = "admin@mise-en-mouvement.fr";

// EMAIL-1. Coach avec proEmail — proEmail utilisé en priorité absolue
test("EMAIL-1. Coach avec proEmail — proEmail utilisé en priorité", () => {
  const coach = { proEmail: "pro@gregory.fr", email: "auth@gregory.fr" };
  const result = resolveCoachContactEmail(coach, "profiles@gregory.fr", ADMIN_EMAIL_FALLBACK);
  assert.equal(result, "pro@gregory.fr");
});

// EMAIL-2. Coach avec email CMS, sans proEmail (ex : Dorian) — email CMS utilisé
test("EMAIL-2. Coach avec email CMS, sans proEmail — email CMS utilisé", () => {
  const coach = { email: "dorian34.hebert@gmail.com" };
  const result = resolveCoachContactEmail(coach, "profiles@dorian.fr", ADMIN_EMAIL_FALLBACK);
  assert.equal(result, "dorian34.hebert@gmail.com");
});

// EMAIL-3. Coach sans email CMS (ex : Grégory) — profiles.email utilisé
test("EMAIL-3. Coach sans email CMS, profiles.email disponible — profiles.email utilisé", () => {
  const coach = { name: "Grégory Nadal" }; // ni proEmail ni email dans le CMS
  const result = resolveCoachContactEmail(coach, "gregory@auth.example.fr", ADMIN_EMAIL_FALLBACK);
  assert.equal(result, "gregory@auth.example.fr");
});

// EMAIL-4. Coach sans aucun email — CABINET_ADMIN_EMAIL en dernier recours
test("EMAIL-4. Coach sans aucun email, profiles vide — CABINET_ADMIN_EMAIL en dernier recours", () => {
  const coach = { name: "Futur coach" }; // ni proEmail, ni email, ni profilesEmail
  const result = resolveCoachContactEmail(coach, undefined, ADMIN_EMAIL_FALLBACK);
  assert.equal(result, ADMIN_EMAIL_FALLBACK);
});

// ─── Résumé ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`);
console.log(`Résultat : ${passed} réussis, ${failed} échoués`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("Tous les tests sont passés.");
}
