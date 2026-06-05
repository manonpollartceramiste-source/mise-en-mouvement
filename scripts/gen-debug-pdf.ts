/**
 * Génère lib/pdf/_debug.html avec des données de test incluant les zones corporelles.
 * Usage : npx tsx scripts/gen-debug-pdf.ts
 */
import { writeFileSync } from "fs";
import { resolve } from "path";
import { generateBilanHtml, type BilanPdfData } from "../lib/pdf/bilan-html";

const mockData: BilanPdfData = {
  clientName: "Sophie Martin",
  sexe: "femme",
  age: 38,
  cabinetName: "Mise en Mouvement",
  logoSrc: "",
  hasCustomLogo: false,
  contactLine: "06 12 34 56 78 · contact@miseenmouvement.fr",
  addressLine: "12 rue des Acacias · 75017 Paris",
  dateStr: "5 juin 2026",
  total: 62,
  axes: [
    { label: "Mobilité",     value: 11, max: 20 },
    { label: "Stabilité",    value: 9,  max: 20 },
    { label: "Force",        value: 14, max: 20 },
    { label: "Posture",      value: 13, max: 20 },
    { label: "Coordination", value: 15, max: 20 },
  ],
  activeLim: ["Raideurs au réveil", "Douleurs liées au travail"],
  activeRec: ["Mobilité", "Renforcement", "Rééquilibrage postural"],
  topPriorities: ["Mobilité", "Renforcement", "Rééquilibrage postural"],
  tests: [
    { label: "Squat",                   score: 1, observation: "Genou droit en valgus" },
    { label: "Équilibre unipodal",       score: 0, observation: "Instabilité marquée côté gauche" },
    { label: "Bras au-dessus de la tête", score: 2 },
    { label: "Hip hinge",               score: 1, observation: "Compensation lombaire" },
  ],
  energyScore:        6,
  stressScore:        7,
  sleepScore:         5,
  painScore:          4,
  workType:           "Sédentaire (bureau)",
  sportPracticed:     "Yoga (1x/sem)",
  sittingHoursPerDay: 8,
  painZones:          "Épaules et bas du dos",
  frequency:          "2x/semaine",
  motivation:         "Retrouver de la souplesse et moins avoir mal au dos",
  engagement:         "Je suis prêt(e) à progresser régulièrement",
  mainGoal:           "Retrouver une mobilité fonctionnelle sans douleur",
  concreteGoal:       "Monter les escaliers sans douleur aux genoux",
  nextAction:         "Séance bilan mobilité épaule droite",
  importantNotes:     "Antécédent d'entorse de la cheville droite en 2019",
  painEvolution:      "Stabilisée",
  oldInjuries:        "Entorse cheville droite",
  operations:         null,
  mainLimitation:     "Mobilité limitée des épaules",
  coachName:          "Manon Pollart",
  coachRole:          "Coach mouvement",
  coachPhotoSrc:      null,
  qrCodeDataUrl:      null,
  bodyComposition: {
    weightKg:    62.4,
    fatPct:      27.3,
    musclePct:   35.1,
    waterPct:    52.8,
    boneMassKg:  2.4,
    visceralFat: 4,
    bmrKcal:     1380,
    metabolicAge: 34,
    segArmRight: 2.1,
    segArmLeft:  2.0,
    segLegRight: 8.6,
    segLegLeft:  8.4,
    segTrunk:    21.3,
  },
  // ── ZONES TEST : épaules=priorité, hanches=priorité, lombaires=surveillance ──
  zonePriorities: {
    epaules:   "forte",
    hanches:   "forte",
    lombaires: "surveillance",
    dos_haut:  "surveillance",
    genoux:    "surveillance",
  },
  bodyMapUrl: "http://localhost:3000/pdf-assets/body-map.png",
};

const html = generateBilanHtml(mockData, "coach");
const outPath = resolve(import.meta.dirname, "../lib/pdf/_debug.html");
writeFileSync(outPath, html, "utf-8");
console.log(`✓ _debug.html généré — ${html.length} caractères`);
console.log(`  → ${outPath}`);
console.log(`\nZones renseignées :`);
for (const [k, v] of Object.entries(mockData.zonePriorities!)) {
  console.log(`  ${k} = ${v}`);
}
