// ─────────────────────────────────────────────────────────────
// Cabinet OS — types partagés
// ─────────────────────────────────────────────────────────────

export type UserRole = "admin" | "coach" | "client";

export type Profile = {
  id: string;
  role: UserRole;
  roles: string[];
  coach_id: string | null;
  display_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  calcom_url: string | null;
  sumup_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SessionStatus = "planifiée" | "réalisée" | "annulée" | "no_show";

export type SessionPack = {
  id: string;
  client_id: string;
  coach_id: string;
  offer_id: string;
  offer_label: string;
  total: number;
  remaining: number;
  purchased_at: string;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Session = {
  id: string;
  client_id: string;
  coach_id: string;
  pack_id: string | null;
  offer_id: string | null;
  status: SessionStatus;
  scheduled_at: string;
  duration_min: number;
  location: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
};

export type Measure = {
  id: string;
  client_id: string;
  coach_id: string;
  session_id: string | null;
  measured_at: string;
  weight_kg: number | null;
  fat_pct: number | null;
  muscle_pct: number | null;
  water_pct: number | null;
  bone_mass_kg: number | null;
  visceral_fat: number | null;
  bmi: number | null;
  bmr_kcal: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  chest_cm: number | null;
  thigh_cm: number | null;
  arm_cm: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CoachNote = {
  id: string;
  client_id: string;
  coach_id: string;
  session_id: string | null;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type MovementTestType = "mobilité" | "force" | "cardio" | "équilibre" | "autre";

export type MovementTest = {
  id: string;
  client_id: string;
  coach_id: string;
  tested_at: string;
  test_name: string;
  test_type: MovementTestType;
  result: string;
  unit: string | null;
  notes: string | null;
  created_at: string;
};

export type GoalStatus = "actif" | "atteint" | "abandonné";

export type ClientGoal = {
  id: string;
  client_id: string;
  coach_id: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  target_date: string | null;
  achieved_at: string | null;
  created_at: string;
  updated_at: string;
};

// ─────────────────────────────────────────────────────────────
// Bilan Mouvement
// ─────────────────────────────────────────────────────────────

export type AssessmentTestEntry = {
  score: 0 | 1 | 2;
  score10?: number | null;
  observation: string;
  note: string;
  zone?: string;
};

export type MovementAssessment = {
  id: string;
  client_id: string;
  coach_id: string;
  assessed_at: string;
  energy_score: number | null;
  stress_score: number | null;
  sleep_score: number | null;
  pain_score: number | null;
  // Composition corporelle — migration 0008 (colonnes optionnelles)
  weight_kg?: number | null;
  fat_pct?: number | null;
  muscle_pct?: number | null;
  water_pct?: number | null;
  bone_mass_kg?: number | null;
  visceral_fat?: number | null;
  bmr_kcal?: number | null;
  metabolic_age?: number | null;
  // Masse musculaire segmentaire — migration 0010
  seg_arm_right_kg?: number | null;
  seg_arm_left_kg?: number | null;
  seg_leg_right_kg?: number | null;
  seg_leg_left_kg?: number | null;
  seg_trunk_kg?: number | null;
  main_goal: string | null;
  concrete_goal: string | null;
  old_injuries: string | null;
  operations: string | null;
  work_type: "assis" | "debout" | "physique" | "mixte" | null;
  sport_practiced: string | null;
  activity_level: string | null;
  sitting_hours_per_day: number | null;
  pain_zones: string | null;
  mobility_score: number | null;
  stability_score: number | null;
  strength_score: number | null;
  posture_score: number | null;
  coordination_score: number | null;
  movement_tests: Record<string, AssessmentTestEntry> | null;
  daily_limitations: Record<string, boolean> | null;
  recommendations: Record<string, boolean> | null;
  // Informations personnelles — migration 0014
  sexe?: "femme" | "homme" | null;
  age?: number | null;
  frequency: "1x/semaine" | "2x/semaine" | "3x/semaine" | "4x/semaine" | "5x/semaine" | null;
  motivation: "faible" | "moyenne" | "forte" | null;
  engagement:
    | "débutant" | "régulier" | "très motivé"
    | "J'ai besoin d'être guidé(e) pour démarrer"
    | "Je suis prêt(e) à progresser régulièrement"
    | "Je suis pleinement engagé(e) dans ma transformation"
    | null;
  important_notes: string | null;
  next_action: string | null;
  pain_evolution: string | null;
  // Zones prioritaires — migration 0009
  zone_priorities?: Record<string, "forte" | "surveillance" | "ras"> | null;
  // Notes par axe — migration 0011
  axis_notes?: Record<string, string> | null;
  created_at: string;
  updated_at: string;
};

export type MovementAssessmentWithClient = MovementAssessment & {
  client_display_name: string;
};

