-- ─────────────────────────────────────────────────────────────
-- 0010 — Masse musculaire segmentaire dans movement_assessments
-- ─────────────────────────────────────────────────────────────

ALTER TABLE movement_assessments
  ADD COLUMN IF NOT EXISTS seg_arm_right_kg  NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS seg_arm_left_kg   NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS seg_leg_right_kg  NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS seg_leg_left_kg   NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS seg_trunk_kg      NUMERIC(4,2);
