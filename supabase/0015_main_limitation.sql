-- Migration 0015 : champ "limitation principale actuelle" (texte libre du coach)
ALTER TABLE movement_assessments
  ADD COLUMN IF NOT EXISTS main_limitation TEXT;
