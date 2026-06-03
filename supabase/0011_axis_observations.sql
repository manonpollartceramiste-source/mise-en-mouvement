-- ─────────────────────────────────────────────────────────────
-- 0011 — Observations par axe fonctionnel (JSONB)
-- { mobilite: "...", stabilite: "...", ... }
-- ─────────────────────────────────────────────────────────────

ALTER TABLE movement_assessments
  ADD COLUMN IF NOT EXISTS axis_notes JSONB;
