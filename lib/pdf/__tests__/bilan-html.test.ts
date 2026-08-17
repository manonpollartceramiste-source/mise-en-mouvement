import { describe, it, expect } from "vitest";
import { generateBilanHtml, type BilanPdfData } from "../bilan-html.js";

// ─── Fixture minimale ─────────────────────────────────────────────────────────

const base: BilanPdfData = {
  clientName: "Marie Dupont",
  sexe: null,
  age: null,
  cabinetName: "Cabinet Test",
  logoSrc: "",
  hasCustomLogo: false,
  contactLine: "",
  addressLine: "",
  dateStr: "8 août 2026",
  total: 40,
  axes: [
    { label: "Mobilité",     value: 10, max: 20 },
    { label: "Stabilité",    value: 10, max: 20 },
    { label: "Posture",      value: 10, max: 20 },
    { label: "Coordination", value: 10, max: 20 },
  ],
  activeLim: [],
  activeRec: [],
  topPriorities: [],
  tests: [],
  energyScore: null,
  stressScore: null,
  sleepScore: null,
  painScore: null,
  workType: null,
  sportPracticed: null,
  sittingHoursPerDay: null,
  painZones: null,
  frequency: null,
  motivation: null,
  engagement: null,
  mainGoal: null,
  concreteGoal: null,
  nextAction: null,
  importantNotes: null,
  painEvolution: null,
  oldInjuries: null,
  operations: null,
  coachName: "Coach Test",
  coachRole: null,
  coachPhotoSrc: null,
  qrCodeDataUrl: null,
  bodyComposition: null,
  zonePriorities: null,
  bodyMapUrl: "",
};

// ─── Tests FABER & Knee to Wall (migration 0034) ──────────────────────────────

describe("generateBilanHtml — FABER & Knee to Wall (migration 0034)", () => {

  it("n'inclut pas le bloc si tous les champs sont null", () => {
    const html = generateBilanHtml({
      ...base,
      faberLeft: null,
      faberRight: null,
      faberNote: null,
      ktwLeftCm: null,
      ktwRightCm: null,
    });
    expect(html).not.toContain("FABER");
    expect(html).not.toContain("Knee to Wall");
  });

  it("n'inclut pas le bloc si les champs sont absents (undefined — champs optionnels non fournis)", () => {
    const html = generateBilanHtml(base);
    expect(html).not.toContain("FABER");
    expect(html).not.toContain("Knee to Wall");
  });

  it("rend FABER gauche surveiller + droit ameliorer + note", () => {
    const html = generateBilanHtml({
      ...base,
      faberLeft: "surveiller",
      faberRight: "ameliorer",
      faberNote: "Légère douleur inguinale gauche",
    });
    expect(html).toContain("FABER");
    expect(html).toContain("À surveiller");
    expect(html).toContain("À améliorer");
    expect(html).toContain("Légère douleur inguinale gauche");
  });

  it("rend Knee to Wall avec mesures, différence et interprétation", () => {
    const html = generateBilanHtml({
      ...base,
      ktwLeftCm: 10.0,
      ktwRightCm: 7.0,
    });
    expect(html).toContain("Knee to Wall");
    expect(html).toContain("10,0");
    expect(html).toContain("7,0");
    expect(html).toContain("3,0");
    expect(html).toContain("Légère asymétrie");
  });

  it("rend FABER optimal des deux côtés sans note → Optimal", () => {
    const html = generateBilanHtml({
      ...base,
      faberLeft: "optimal",
      faberRight: "optimal",
    });
    expect(html).toContain("FABER");
    // Les deux badges "Optimal"
    const matches = (html.match(/Optimal/g) ?? []).length;
    expect(matches).toBeGreaterThanOrEqual(2);
  });

  it("rend KtW symétrique < 2 cm de diff → Symétrique", () => {
    const html = generateBilanHtml({
      ...base,
      ktwLeftCm: 9.0,
      ktwRightCm: 8.5,
    });
    expect(html).toContain("0,5");
    expect(html).toContain("Symétrique");
  });

  it("rend KtW asymétrie importante ≥ 4 cm de diff", () => {
    const html = generateBilanHtml({
      ...base,
      ktwLeftCm: 12.0,
      ktwRightCm: 7.0,
    });
    expect(html).toContain("5,0");
    expect(html).toContain("Asymétrie importante");
  });

  it("rend FABER + KtW combinés — scénario complet prod", () => {
    const html = generateBilanHtml({
      ...base,
      faberLeft: "surveiller",
      faberRight: "ameliorer",
      faberNote: "Légère douleur inguinale gauche",
      ktwLeftCm: 10.0,
      ktwRightCm: 7.0,
    });
    // FABER
    expect(html).toContain("FABER");
    expect(html).toContain("À surveiller");
    expect(html).toContain("À améliorer");
    expect(html).toContain("Légère douleur inguinale gauche");
    // KtW
    expect(html).toContain("Knee to Wall");
    expect(html).toContain("10,0");
    expect(html).toContain("7,0");
    expect(html).toContain("3,0");
    expect(html).toContain("Légère asymétrie");
    // Section globale — sec() uppercases le label
    expect(html).toContain("TESTS CLINIQUES");
  });

  it("rend uniquement la note FABER si seule faberNote est renseignée", () => {
    const html = generateBilanHtml({
      ...base,
      faberLeft: null,
      faberRight: null,
      faberNote: "Test noté sans résultat latéral",
    });
    expect(html).toContain("FABER");
    expect(html).toContain("Test noté sans résultat latéral");
    expect(html).not.toContain("Knee to Wall");
  });

  it("rend uniquement KtW gauche si côté droit null", () => {
    const html = generateBilanHtml({
      ...base,
      ktwLeftCm: 8.5,
      ktwRightCm: null,
    });
    expect(html).toContain("Knee to Wall");
    expect(html).toContain("8,5");
    // Pas de différence calculée si un côté manque
    expect(html).not.toContain("Légère asymétrie");
    expect(html).not.toContain("Symétrique");
  });
});
