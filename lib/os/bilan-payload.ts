import type { AssessmentTestEntry, MovementAssessment } from "./types";

// Payload attendu par les Server Actions (miroir du type privé dans actions.ts)
export type AssessmentPayload = Omit<
  MovementAssessment,
  "id" | "coach_id" | "created_at" | "updated_at"
>;

export type ZonePriority = "forte" | "surveillance" | "ras";
export type ZonePriorityMap = Record<string, ZonePriority>;
export type Tests = Record<string, AssessmentTestEntry>;
export type BoolMap = Record<string, boolean>;

// État React du formulaire — diffère d'AssessmentPayload :
// - les champs texte utilisent "" plutôt que null
// - les champs JSONB sont toujours des objets (jamais null)
export type FormState = {
  client_id: string;
  assessed_at: string;
  sexe: "femme" | "homme" | null;
  age: number | null;
  energy_score: number | null;
  stress_score: number | null;
  sleep_score: number | null;
  pain_score: number | null;
  weight_kg: number | null;
  fat_pct: number | null;
  muscle_pct: number | null;
  water_pct: number | null;
  bone_mass_kg: number | null;
  visceral_fat: number | null;
  bmr_kcal: number | null;
  metabolic_age: number | null;
  seg_arm_right_kg: number | null;
  seg_arm_left_kg: number | null;
  seg_leg_right_kg: number | null;
  seg_leg_left_kg: number | null;
  seg_trunk_kg: number | null;
  main_goal: string;
  concrete_goal: string;
  old_injuries: string;
  operations: string;
  work_type: "assis" | "debout" | "physique" | "mixte" | null;
  sport_practiced: string;
  activity_level: string;
  sitting_hours_per_day: number | null;
  pain_zones: string;
  mobility_score: number | null;
  stability_score: number | null;
  posture_score: number | null;
  coordination_score: number | null;
  movement_tests: Tests;
  daily_limitations: BoolMap;
  recommendations: BoolMap;
  zone_priorities: ZonePriorityMap;
  axis_notes: Record<string, string>;
  // FABER test — migration 0034
  faber_left: "optimal" | "surveiller" | "ameliorer" | null;
  faber_right: "optimal" | "surveiller" | "ameliorer" | null;
  faber_note: string;
  // Knee to Wall — migration 0034
  ktw_left_cm: number | null;
  ktw_right_cm: number | null;
  frequency: "1x/semaine" | "2x/semaine" | "3x/semaine" | "4x/semaine" | "5x/semaine" | null;
  engagement:
    | "J'ai besoin d'être guidé(e) pour démarrer"
    | "Je suis prêt(e) à progresser régulièrement"
    | "Je suis pleinement engagé(e) dans ma transformation"
    | null;
  important_notes: string;
  next_action: string;
  pain_evolution: string;
  main_limitation: string;
};

// Convertit l'état du formulaire React en payload prêt pour Supabase.
// Fonction pure — ne fait aucun appel réseau.
export function buildAssessmentPayload(form: FormState): AssessmentPayload {
  const {
    axis_notes,
    weight_kg, fat_pct, muscle_pct, water_pct,
    bone_mass_kg, visceral_fat, bmr_kcal, metabolic_age,
    seg_arm_right_kg, seg_arm_left_kg,
    seg_leg_right_kg, seg_leg_left_kg,
    seg_trunk_kg,
    zone_priorities,
    sexe, age,
    main_limitation,
    faber_left, faber_right, faber_note,
    ktw_left_cm, ktw_right_cm,
    ...restForm
  } = form;

  return {
    ...restForm,
    assessed_at: new Date(form.assessed_at).toISOString(),
    movement_tests: Object.keys(form.movement_tests).length ? form.movement_tests : null,
    daily_limitations: Object.keys(form.daily_limitations).length ? form.daily_limitations : null,
    recommendations: Object.keys(form.recommendations).length ? form.recommendations : null,
    main_goal: form.main_goal || null,
    concrete_goal: form.concrete_goal || null,
    old_injuries: form.old_injuries || null,
    operations: form.operations || null,
    sport_practiced: form.sport_practiced || null,
    activity_level: form.activity_level || null,
    pain_zones: form.pain_zones || null,
    important_notes: form.important_notes || null,
    next_action: form.next_action || null,
    pain_evolution: form.pain_evolution || null,
    motivation: null,
    // Migration 0008 — composition corporelle
    ...(weight_kg     != null ? { weight_kg     } : {}),
    ...(fat_pct       != null ? { fat_pct       } : {}),
    ...(muscle_pct    != null ? { muscle_pct    } : {}),
    ...(water_pct     != null ? { water_pct     } : {}),
    ...(bone_mass_kg  != null ? { bone_mass_kg  } : {}),
    ...(visceral_fat  != null ? { visceral_fat  } : {}),
    ...(bmr_kcal      != null ? { bmr_kcal      } : {}),
    ...(metabolic_age != null ? { metabolic_age } : {}),
    // Migration 0009 — zones prioritaires
    ...(Object.keys(zone_priorities).length > 0 ? { zone_priorities } : {}),
    // Migration 0010 — masse segmentaire
    ...(seg_arm_right_kg != null ? { seg_arm_right_kg } : {}),
    ...(seg_arm_left_kg  != null ? { seg_arm_left_kg  } : {}),
    ...(seg_leg_right_kg != null ? { seg_leg_right_kg } : {}),
    ...(seg_leg_left_kg  != null ? { seg_leg_left_kg  } : {}),
    ...(seg_trunk_kg     != null ? { seg_trunk_kg     } : {}),
    // Migration 0011 — notes par axe
    ...(Object.keys(axis_notes).length > 0 ? { axis_notes } : {}),
    // Migration 0014 — sexe et âge
    ...(sexe != null ? { sexe } : {}),
    ...(age  != null ? { age  } : {}),
    // Migration 0015 — limitation principale
    ...(main_limitation ? { main_limitation } : {}),
    // Migration 0034 — FABER test
    ...(faber_left  != null ? { faber_left  } : {}),
    ...(faber_right != null ? { faber_right } : {}),
    ...(faber_note  ? { faber_note  } : {}),
    // Migration 0034 — Knee to Wall
    ...(ktw_left_cm  != null ? { ktw_left_cm  } : {}),
    ...(ktw_right_cm != null ? { ktw_right_cm } : {}),
  } as AssessmentPayload;
}
