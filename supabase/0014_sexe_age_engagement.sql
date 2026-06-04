-- ─────────────────────────────────────────────────────────────
-- 0014 — Sexe, âge, fréquences 4x/5x, nouveaux libellés engagement
-- Sécurisé : IF NOT EXISTS / DROP … IF EXISTS — peut être rejoué
-- ─────────────────────────────────────────────────────────────

-- Sexe et âge du client
ALTER TABLE movement_assessments
  ADD COLUMN IF NOT EXISTS sexe TEXT CHECK (sexe IS NULL OR sexe IN ('femme', 'homme')),
  ADD COLUMN IF NOT EXISTS age  SMALLINT CHECK (age IS NULL OR (age BETWEEN 0 AND 120));

-- Étendre la contrainte frequency → 4x et 5x par semaine
ALTER TABLE movement_assessments
  DROP CONSTRAINT IF EXISTS movement_assessments_frequency_check;

ALTER TABLE movement_assessments
  ADD CONSTRAINT movement_assessments_frequency_check
  CHECK (frequency IS NULL OR frequency IN (
    '1x/semaine', '2x/semaine', '3x/semaine', '4x/semaine', '5x/semaine'
  ));

-- Étendre la contrainte engagement → nouveaux libellés premium
-- (les anciennes valeurs 'débutant', 'régulier', 'très motivé' restent valides)
ALTER TABLE movement_assessments
  DROP CONSTRAINT IF EXISTS movement_assessments_engagement_check;

ALTER TABLE movement_assessments
  ADD CONSTRAINT movement_assessments_engagement_check
  CHECK (engagement IS NULL OR engagement IN (
    'débutant', 'régulier', 'très motivé',
    'J''ai besoin d''être guidé(e) pour démarrer',
    'Je suis prêt(e) à progresser régulièrement',
    'Je suis pleinement engagé(e) dans ma transformation'
  ));
