-- Remove strength_score column: Force axis has been removed from the bilan mouvement
ALTER TABLE movement_assessments DROP COLUMN IF EXISTS strength_score;
