-- ─────────────────────────────────────────────────────────────
-- 0012 — Toutes les colonnes ajoutées après la table initiale
-- Sécurisé : IF NOT EXISTS — peut être rejoué sans erreur
-- ─────────────────────────────────────────────────────────────

-- Migration 0008 — Composition corporelle (impédancemétrie)
ALTER TABLE movement_assessments
  ADD COLUMN IF NOT EXISTS weight_kg     NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS bmi           NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS fat_pct       NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS muscle_pct    NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS water_pct     NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS bone_mass_kg  NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS visceral_fat  NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS bmr_kcal      INTEGER,
  ADD COLUMN IF NOT EXISTS metabolic_age SMALLINT;

-- Migration 0009 — Zones prioritaires
ALTER TABLE movement_assessments
  ADD COLUMN IF NOT EXISTS zone_priorities JSONB;

-- Migration 0010 — Masse musculaire segmentaire
ALTER TABLE movement_assessments
  ADD COLUMN IF NOT EXISTS seg_arm_right_kg  NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS seg_arm_left_kg   NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS seg_leg_right_kg  NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS seg_leg_left_kg   NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS seg_trunk_kg      NUMERIC(4,2);

-- Migration 0011 — Notes par axe fonctionnel
ALTER TABLE movement_assessments
  ADD COLUMN IF NOT EXISTS axis_notes JSONB;
