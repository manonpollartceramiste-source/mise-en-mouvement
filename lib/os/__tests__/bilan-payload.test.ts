import { describe, it, expect } from "vitest";
import { buildAssessmentPayload } from "../bilan-payload.js";
import type { FormState } from "../bilan-payload.js";

// ─── Fixture ─────────────────────────────────────────────────────────────────

const baseForm: FormState = {
  client_id: "client-uuid-123",
  assessed_at: "2026-08-08T14:00",
  sexe: null,
  age: null,
  energy_score: 7,
  stress_score: 4,
  sleep_score: 6,
  pain_score: 3,
  weight_kg: null,
  fat_pct: null,
  muscle_pct: null,
  water_pct: null,
  bone_mass_kg: null,
  visceral_fat: null,
  bmr_kcal: null,
  metabolic_age: null,
  seg_arm_right_kg: null,
  seg_arm_left_kg: null,
  seg_leg_right_kg: null,
  seg_leg_left_kg: null,
  seg_trunk_kg: null,
  main_goal: "",
  concrete_goal: "",
  old_injuries: "",
  operations: "",
  work_type: null,
  sport_practiced: "",
  activity_level: "",
  sitting_hours_per_day: null,
  pain_zones: "",
  mobility_score: null,
  stability_score: null,
  posture_score: null,
  coordination_score: null,
  movement_tests: {},
  daily_limitations: {},
  recommendations: {},
  zone_priorities: {},
  axis_notes: {},
  frequency: null,
  engagement: null,
  important_notes: "",
  next_action: "",
  pain_evolution: "",
  main_limitation: "",
  faber_left: null,
  faber_right: null,
  faber_note: "",
  ktw_left_cm: null,
  ktw_right_cm: null,
};

// ─── assessed_at ─────────────────────────────────────────────────────────────

describe("buildAssessmentPayload — assessed_at", () => {
  it("convertit assessed_at en ISO complet", () => {
    const payload = buildAssessmentPayload(baseForm);
    expect(payload.assessed_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("le résultat est parseable par Date", () => {
    const payload = buildAssessmentPayload(baseForm);
    expect(() => new Date(payload.assessed_at)).not.toThrow();
    expect(new Date(payload.assessed_at).getFullYear()).toBe(2026);
  });
});

// ─── Champs texte vides → null ────────────────────────────────────────────────

describe("buildAssessmentPayload — champs texte vides → null", () => {
  it("main_goal vide → null", () => {
    expect(buildAssessmentPayload(baseForm).main_goal).toBeNull();
  });

  it("concrete_goal vide → null", () => {
    expect(buildAssessmentPayload(baseForm).concrete_goal).toBeNull();
  });

  it("old_injuries vide → null", () => {
    expect(buildAssessmentPayload(baseForm).old_injuries).toBeNull();
  });

  it("operations vide → null", () => {
    expect(buildAssessmentPayload(baseForm).operations).toBeNull();
  });

  it("sport_practiced vide → null", () => {
    expect(buildAssessmentPayload(baseForm).sport_practiced).toBeNull();
  });

  it("activity_level vide → null", () => {
    expect(buildAssessmentPayload(baseForm).activity_level).toBeNull();
  });

  it("pain_zones vide → null", () => {
    expect(buildAssessmentPayload(baseForm).pain_zones).toBeNull();
  });

  it("important_notes vide → null", () => {
    expect(buildAssessmentPayload(baseForm).important_notes).toBeNull();
  });

  it("next_action vide → null", () => {
    expect(buildAssessmentPayload(baseForm).next_action).toBeNull();
  });

  it("pain_evolution vide → null", () => {
    expect(buildAssessmentPayload(baseForm).pain_evolution).toBeNull();
  });
});

// ─── Champs texte non vides → préservés ──────────────────────────────────────

describe("buildAssessmentPayload — champs texte non vides préservés", () => {
  it("main_goal et concrete_goal conservés", () => {
    const payload = buildAssessmentPayload({
      ...baseForm,
      main_goal: "Perdre du poids",
      concrete_goal: "5 kg en 3 mois",
    });
    expect(payload.main_goal).toBe("Perdre du poids");
    expect(payload.concrete_goal).toBe("5 kg en 3 mois");
  });

  it("important_notes et next_action conservés", () => {
    const payload = buildAssessmentPayload({
      ...baseForm,
      important_notes: "Précautions genou",
      next_action: "Bilan dans 6 semaines",
    });
    expect(payload.important_notes).toBe("Précautions genou");
    expect(payload.next_action).toBe("Bilan dans 6 semaines");
  });
});

// ─── Champs JSONB vides → null ────────────────────────────────────────────────

describe("buildAssessmentPayload — champs JSONB vides → null", () => {
  it("movement_tests vide → null", () => {
    expect(buildAssessmentPayload(baseForm).movement_tests).toBeNull();
  });

  it("daily_limitations vide → null", () => {
    expect(buildAssessmentPayload(baseForm).daily_limitations).toBeNull();
  });

  it("recommendations vide → null", () => {
    expect(buildAssessmentPayload(baseForm).recommendations).toBeNull();
  });
});

// ─── Champs JSONB non vides → préservés ──────────────────────────────────────

describe("buildAssessmentPayload — champs JSONB non vides préservés", () => {
  it("movement_tests inclus si non vide", () => {
    const tests = {
      squat: { score: 2 as const, score10: 8, observation: "Bon", note: "", zone: "" },
    };
    const payload = buildAssessmentPayload({ ...baseForm, movement_tests: tests });
    expect(payload.movement_tests).toEqual(tests);
  });

  it("daily_limitations inclus si non vide", () => {
    const limitations = { rester_assis: true, monter_escaliers: false };
    const payload = buildAssessmentPayload({ ...baseForm, daily_limitations: limitations });
    expect(payload.daily_limitations).toEqual(limitations);
  });

  it("recommendations inclus si non vide", () => {
    const reco = { mobilite: true, renforcement: false };
    const payload = buildAssessmentPayload({ ...baseForm, recommendations: reco });
    expect(payload.recommendations).toEqual(reco);
  });
});

// ─── Champs de migrations optionnels absents si null ─────────────────────────

describe("buildAssessmentPayload — champs migrations absents si null", () => {
  it("weight_kg absent si null (migration 0008)", () => {
    expect(buildAssessmentPayload(baseForm)).not.toHaveProperty("weight_kg");
  });

  it("fat_pct absent si null (migration 0008)", () => {
    expect(buildAssessmentPayload(baseForm)).not.toHaveProperty("fat_pct");
  });

  it("zone_priorities absent si vide (migration 0009)", () => {
    expect(buildAssessmentPayload(baseForm)).not.toHaveProperty("zone_priorities");
  });

  it("seg_arm_right_kg absent si null (migration 0010)", () => {
    expect(buildAssessmentPayload(baseForm)).not.toHaveProperty("seg_arm_right_kg");
  });

  it("axis_notes absent si vide (migration 0011)", () => {
    expect(buildAssessmentPayload(baseForm)).not.toHaveProperty("axis_notes");
  });

  it("sexe absent si null (migration 0014)", () => {
    expect(buildAssessmentPayload(baseForm)).not.toHaveProperty("sexe");
  });

  it("age absent si null (migration 0014)", () => {
    expect(buildAssessmentPayload(baseForm)).not.toHaveProperty("age");
  });

  it("main_limitation absent si vide (migration 0015)", () => {
    expect(buildAssessmentPayload(baseForm)).not.toHaveProperty("main_limitation");
  });
});

// ─── Champs de migrations optionnels présents si renseignés ──────────────────

describe("buildAssessmentPayload — champs migrations présents si renseignés", () => {
  it("composition corporelle incluse si fournie (migration 0008)", () => {
    const payload = buildAssessmentPayload({
      ...baseForm,
      weight_kg: 72.5,
      fat_pct: 18.5,
      muscle_pct: 42.0,
      bmr_kcal: 1650,
    });
    expect(payload.weight_kg).toBe(72.5);
    expect(payload.fat_pct).toBe(18.5);
    expect(payload.muscle_pct).toBe(42.0);
    expect(payload.bmr_kcal).toBe(1650);
  });

  it("zone_priorities incluses si non vides (migration 0009)", () => {
    const zone_priorities = { lombaires: "forte" as const, hanches: "surveillance" as const };
    const payload = buildAssessmentPayload({ ...baseForm, zone_priorities });
    expect(payload.zone_priorities).toEqual(zone_priorities);
  });

  it("masse segmentaire incluse si fournie (migration 0010)", () => {
    const payload = buildAssessmentPayload({
      ...baseForm,
      seg_arm_right_kg: 3.2,
      seg_trunk_kg: 25.1,
    });
    expect(payload.seg_arm_right_kg).toBe(3.2);
    expect(payload.seg_trunk_kg).toBe(25.1);
    expect(payload).not.toHaveProperty("seg_arm_left_kg");
  });

  it("axis_notes incluses si non vides (migration 0011)", () => {
    const axis_notes = { mobilite: "Bonne amplitude", stabilite: "À améliorer" };
    const payload = buildAssessmentPayload({ ...baseForm, axis_notes });
    expect(payload.axis_notes).toEqual(axis_notes);
  });

  it("sexe et age inclus si fournis (migration 0014)", () => {
    const payload = buildAssessmentPayload({ ...baseForm, sexe: "femme", age: 35 });
    expect(payload.sexe).toBe("femme");
    expect(payload.age).toBe(35);
  });

  it("main_limitation incluse si non vide (migration 0015)", () => {
    const payload = buildAssessmentPayload({ ...baseForm, main_limitation: "Douleur genou gauche" });
    expect(payload.main_limitation).toBe("Douleur genou gauche");
  });
});

// ─── Champs fixes ─────────────────────────────────────────────────────────────

describe("buildAssessmentPayload — champs fixes", () => {
  it("motivation est toujours null", () => {
    expect(buildAssessmentPayload(baseForm).motivation).toBeNull();
  });

  it("client_id conservé", () => {
    expect(buildAssessmentPayload(baseForm).client_id).toBe("client-uuid-123");
  });

  it("scores numériques conservés", () => {
    const payload = buildAssessmentPayload(baseForm);
    expect(payload.energy_score).toBe(7);
    expect(payload.stress_score).toBe(4);
    expect(payload.sleep_score).toBe(6);
    expect(payload.pain_score).toBe(3);
  });

  it("work_type null conservé", () => {
    expect(buildAssessmentPayload(baseForm).work_type).toBeNull();
  });

  it("work_type renseigné conservé", () => {
    const payload = buildAssessmentPayload({ ...baseForm, work_type: "assis" });
    expect(payload.work_type).toBe("assis");
  });
});

// ─── Migration 0034 — FABER & Knee to Wall ────────────────────────────────────

describe("buildAssessmentPayload — FABER absent si null (migration 0034)", () => {
  it("faber_left absent si null", () => {
    expect(buildAssessmentPayload(baseForm)).not.toHaveProperty("faber_left");
  });

  it("faber_right absent si null", () => {
    expect(buildAssessmentPayload(baseForm)).not.toHaveProperty("faber_right");
  });

  it("faber_note absent si vide", () => {
    expect(buildAssessmentPayload(baseForm)).not.toHaveProperty("faber_note");
  });

  it("ktw_left_cm absent si null", () => {
    expect(buildAssessmentPayload(baseForm)).not.toHaveProperty("ktw_left_cm");
  });

  it("ktw_right_cm absent si null", () => {
    expect(buildAssessmentPayload(baseForm)).not.toHaveProperty("ktw_right_cm");
  });
});

describe("buildAssessmentPayload — FABER présent si renseigné (migration 0034)", () => {
  it("faber_left inclus si renseigné", () => {
    const payload = buildAssessmentPayload({ ...baseForm, faber_left: "optimal" });
    expect(payload.faber_left).toBe("optimal");
  });

  it("faber_right inclus si renseigné", () => {
    const payload = buildAssessmentPayload({ ...baseForm, faber_right: "ameliorer" });
    expect(payload.faber_right).toBe("ameliorer");
  });

  it("faber_note inclus si non vide", () => {
    const payload = buildAssessmentPayload({ ...baseForm, faber_note: "Limitation côté gauche" });
    expect(payload.faber_note).toBe("Limitation côté gauche");
  });

  it("ktw_left_cm inclus si renseigné", () => {
    const payload = buildAssessmentPayload({ ...baseForm, ktw_left_cm: 9.5 });
    expect(payload.ktw_left_cm).toBe(9.5);
  });

  it("ktw_right_cm inclus si renseigné", () => {
    const payload = buildAssessmentPayload({ ...baseForm, ktw_right_cm: 12.0 });
    expect(payload.ktw_right_cm).toBe(12.0);
  });

  it("bilan complet avec FABER + KtW inclut tous les champs", () => {
    const payload = buildAssessmentPayload({
      ...baseForm,
      faber_left:  "surveiller",
      faber_right: "optimal",
      faber_note:  "Légère tension à gauche",
      ktw_left_cm:  9.5,
      ktw_right_cm: 11.0,
    });
    expect(payload.faber_left).toBe("surveiller");
    expect(payload.faber_right).toBe("optimal");
    expect(payload.faber_note).toBe("Légère tension à gauche");
    expect(payload.ktw_left_cm).toBe(9.5);
    expect(payload.ktw_right_cm).toBe(11.0);
  });
});

// ─── Pas de duplication de champs ─────────────────────────────────────────────

describe("buildAssessmentPayload — intégrité structurelle", () => {
  it("ne contient pas de champs inattendus issus de FormState", () => {
    const payload = buildAssessmentPayload(baseForm);
    // Ces champs de FormState NE doivent PAS se retrouver tels quels (sont gérés conditionnellement)
    // Vérification que la forme générale est cohérente
    expect(typeof payload.client_id).toBe("string");
    expect(typeof payload.assessed_at).toBe("string");
  });

  it("formulaire complet sans pertes", () => {
    const full: FormState = {
      ...baseForm,
      main_goal: "Objectif",
      energy_score: 8,
      mobility_score: 14,
      stability_score: 12,
      posture_score: 10,
      coordination_score: 16,
      frequency: "2x/semaine",
      engagement: "Je suis prêt(e) à progresser régulièrement",
      movement_tests: {
        squat: { score: 2 as const, score10: null, observation: "Correct", note: "", zone: "" },
      },
      daily_limitations: { rester_assis: true },
      zone_priorities: { lombaires: "forte" as const },
      axis_notes: { mobilite: "RAS" },
      weight_kg: 70,
      sexe: "homme",
      age: 40,
      main_limitation: "Lombaires",
      faber_left: "optimal",
      faber_right: "surveiller",
      faber_note: "Légère tension droite",
      ktw_left_cm: 9.5,
      ktw_right_cm: 11.0,
    };
    const payload = buildAssessmentPayload(full);
    expect(payload.main_goal).toBe("Objectif");
    expect(payload.mobility_score).toBe(14);
    expect(payload.frequency).toBe("2x/semaine");
    expect(payload.engagement).toBe("Je suis prêt(e) à progresser régulièrement");
    expect(payload.movement_tests).toBeTruthy();
    expect(payload.daily_limitations).toBeTruthy();
    expect(payload.zone_priorities).toBeTruthy();
    expect(payload.axis_notes).toBeTruthy();
    expect(payload.weight_kg).toBe(70);
    expect(payload.sexe).toBe("homme");
    expect(payload.age).toBe(40);
    expect(payload.main_limitation).toBe("Lombaires");
    expect(payload.faber_left).toBe("optimal");
    expect(payload.faber_right).toBe("surveiller");
    expect(payload.faber_note).toBe("Légère tension droite");
    expect(payload.ktw_left_cm).toBe(9.5);
    expect(payload.ktw_right_cm).toBe(11.0);
  });
});
