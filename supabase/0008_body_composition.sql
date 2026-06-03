-- ─────────────────────────────────────────────────────────────
-- 0008 — Composition corporelle dans movement_assessments
-- Ajout des colonnes impédancemétrie
-- ─────────────────────────────────────────────────────────────

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
