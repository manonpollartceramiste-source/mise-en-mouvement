-- ─────────────────────────────────────────────────────────────
-- 0034 — Tests FABER et Knee to Wall dans movement_assessments
-- ─────────────────────────────────────────────────────────────

ALTER TABLE movement_assessments
  -- FABER test (signe de Patrick) — résultat par côté
  ADD COLUMN IF NOT EXISTS faber_left  TEXT
    CHECK (faber_left  IS NULL OR faber_left  IN ('optimal','surveiller','ameliorer')),
  ADD COLUMN IF NOT EXISTS faber_right TEXT
    CHECK (faber_right IS NULL OR faber_right IN ('optimal','surveiller','ameliorer')),
  ADD COLUMN IF NOT EXISTS faber_note  TEXT,
  -- Knee to Wall — distance genou/mur en cm par jambe
  ADD COLUMN IF NOT EXISTS ktw_left_cm  NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS ktw_right_cm NUMERIC(5,1);
