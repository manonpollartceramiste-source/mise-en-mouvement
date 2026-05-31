-- ─────────────────────────────────────────────────────────────
-- 0004 — Table movement_assessments (Bilan Mouvement)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE movement_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Scores subjectifs /10
  energy_score      SMALLINT CHECK (energy_score IS NULL OR (energy_score BETWEEN 0 AND 10)),
  stress_score      SMALLINT CHECK (stress_score IS NULL OR (stress_score BETWEEN 0 AND 10)),
  sleep_score       SMALLINT CHECK (sleep_score  IS NULL OR (sleep_score  BETWEEN 0 AND 10)),
  pain_score        SMALLINT CHECK (pain_score   IS NULL OR (pain_score   BETWEEN 0 AND 10)),

  -- Mode de vie
  main_goal             TEXT,
  concrete_goal         TEXT,
  old_injuries          TEXT,
  operations            TEXT,
  work_type             TEXT CHECK (work_type IS NULL OR work_type IN ('assis','debout','physique','mixte')),
  sport_practiced       TEXT,
  activity_level        TEXT,
  sitting_hours_per_day SMALLINT,
  pain_zones            TEXT,

  -- Scores mouvement /20
  mobility_score    SMALLINT CHECK (mobility_score    IS NULL OR (mobility_score    BETWEEN 0 AND 20)),
  stability_score   SMALLINT CHECK (stability_score   IS NULL OR (stability_score   BETWEEN 0 AND 20)),
  strength_score    SMALLINT CHECK (strength_score    IS NULL OR (strength_score    BETWEEN 0 AND 20)),
  posture_score     SMALLINT CHECK (posture_score     IS NULL OR (posture_score     BETWEEN 0 AND 20)),
  coordination_score SMALLINT CHECK (coordination_score IS NULL OR (coordination_score BETWEEN 0 AND 20)),

  -- Tests mouvement (JSONB)
  -- { squat: {score:0|1|2, observation:string, note:string}, ... }
  movement_tests    JSONB,

  -- Limitations quotidiennes (JSONB boolean map)
  daily_limitations JSONB,

  -- Recommandations (JSONB boolean map)
  recommendations   JSONB,

  -- Programme
  frequency  TEXT CHECK (frequency  IS NULL OR frequency  IN ('1x/semaine','2x/semaine','3x/semaine')),
  motivation TEXT CHECK (motivation IS NULL OR motivation IN ('faible','moyenne','forte')),
  engagement TEXT CHECK (engagement IS NULL OR engagement IN ('débutant','régulier','très motivé')),

  -- Notes & suivi
  important_notes TEXT,
  next_action     TEXT,
  pain_evolution  TEXT,

  -- Signatures
  coach_signature  TEXT,
  client_signature TEXT,

  -- Photos (JSONB: { face, profil, squat, avant_apres })
  photos JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON movement_assessments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Index
CREATE INDEX idx_ma_client_id   ON movement_assessments(client_id);
CREATE INDEX idx_ma_coach_id    ON movement_assessments(coach_id);
CREATE INDEX idx_ma_assessed_at ON movement_assessments(assessed_at DESC);

-- RLS
ALTER TABLE movement_assessments ENABLE ROW LEVEL SECURITY;

-- Client : lecture de ses propres bilans
CREATE POLICY "client_read_own_assessments"
  ON movement_assessments FOR SELECT
  USING (client_id = auth.uid());

-- Coach : lecture / écriture de ses bilans
CREATE POLICY "coach_select_own_assessments"
  ON movement_assessments FOR SELECT
  USING (coach_id = auth.uid());

CREATE POLICY "coach_insert_assessments"
  ON movement_assessments FOR INSERT
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "coach_update_own_assessments"
  ON movement_assessments FOR UPDATE
  USING (coach_id = auth.uid());

CREATE POLICY "coach_delete_own_assessments"
  ON movement_assessments FOR DELETE
  USING (coach_id = auth.uid());

-- Admin : accès total
CREATE POLICY "admin_all_assessments"
  ON movement_assessments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
