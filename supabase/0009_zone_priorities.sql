-- ─────────────────────────────────────────────────────────────
-- 0009 — Zones prioritaires dans movement_assessments
-- { cervicales: "forte"|"surveillance"|"ras", ... }
-- ─────────────────────────────────────────────────────────────

ALTER TABLE movement_assessments
  ADD COLUMN IF NOT EXISTS zone_priorities JSONB;
