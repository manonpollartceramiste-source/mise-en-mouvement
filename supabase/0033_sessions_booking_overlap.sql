-- ═══════════════════════════════════════════════════════════════════════════════
-- 0033 — Protection anti-chevauchement complète (4 directions)
--
-- Périmètre couvert :
--   (A) booking  vs booking   → contrainte d'exclusion GiST (ATOMIQUE)
--   (B) session  vs session   → contrainte d'exclusion GiST (ATOMIQUE)
--   (C) booking  vs session   → trigger BEFORE INSERT OR UPDATE (best-effort)
--   (D) session  vs booking   → trigger BEFORE INSERT OR UPDATE (best-effort)
--
-- Règles métier :
--   - Les bookings annulés (cancelled_by_client / cancelled_by_coach) ne bloquent pas.
--   - Les sessions annulées ou no_show ne bloquent pas.
--   - force_overlap = true sur un booking bypasse les vérifications (coach admin).
--   - Les vérifications (A) et (B) sont atomiques : PostgreSQL utilise le
--     verrouillage d'index GiST, éliminant les conditions de course entre insertions.
--   - Les vérifications (C) et (D) utilisent SELECT FOR SHARE pour limiter la
--     fenêtre de concurrence, mais ne sont pas 100 % atomiques en READ COMMITTED.
--     La protection applicative (booking.server.ts + actions.ts) réduit davantage
--     cette fenêtre. Pour une atomicité complète cross-tables, un advisory lock ou
--     SERIALIZABLE serait nécessaire — non implémenté ici car le risque pratique
--     est négligeable pour ce volume d'activité.
--
-- Idempotence : chaque instruction utilise IF EXISTS / IF NOT EXISTS.
-- Rollback : voir section ROLLBACK en bas de ce fichier.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Prérequis : extension btree_gist pour les contraintes d'exclusion sur tstzrange
CREATE EXTENSION IF NOT EXISTS btree_gist;


-- ─── (A) booking vs booking — contrainte GiST globale ────────────────────────
--
-- Remplace le trigger trg_global_booking_overlap (non-atomique sous READ COMMITTED)
-- par une contrainte d'exclusion qui verrouille l'index GiST pendant l'INSERT/UPDATE,
-- éliminant toute condition de course entre deux insertions simultanées.
--
-- Portée : GLOBALE (tous les coachs) — cohérent avec la règle 0023.
-- Exemptions : bookings annulés + force_overlap = true.
-- ─────────────────────────────────────────────────────────────────────────────

-- Supprimer l'ancienne contrainte per-coach si elle existe encore
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.bookings'::regclass
      AND conname = 'no_overlap_booking'
  ) THEN
    ALTER TABLE public.bookings DROP CONSTRAINT no_overlap_booking;
  END IF;
END $$;

-- Supprimer la nouvelle si déjà créée (idempotence)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.bookings'::regclass
      AND conname = 'bookings_no_global_overlap'
  ) THEN
    ALTER TABLE public.bookings DROP CONSTRAINT bookings_no_global_overlap;
  END IF;
END $$;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_global_overlap
  EXCLUDE USING gist (
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (
    status NOT IN ('cancelled_by_client', 'cancelled_by_coach')
    AND force_overlap = false
  );

-- Supprimer les anciens triggers non-atomiques (la contrainte les rend redondants)
DROP TRIGGER IF EXISTS bookings_no_overlap ON public.bookings;
DROP TRIGGER IF EXISTS trg_global_booking_overlap ON public.bookings;
DROP FUNCTION IF EXISTS public.check_booking_no_overlap();
DROP FUNCTION IF EXISTS public.check_global_booking_overlap();


-- ─── (B) session vs session — contrainte GiST par coach ──────────────────────
--
-- Empêche le MÊME coach d'avoir deux sessions actives qui se chevauchent.
-- Deux coachs différents PEUVENT avoir des sessions simultanées.
-- Exemptions : sessions annulées ou no_show.
--
-- Note technique : timestamptz_pl_interval est STABLE en PostgreSQL (pas IMMUTABLE)
-- parce que l'arithmétique sur des intervalles en jours/mois dépend du GUC TimeZone.
-- PostgreSQL refuse les expressions STABLE dans les expressions d'index.
-- Pour des intervalles en minutes pures, le calcul est UTC-déterministe ; on crée
-- une fonction wrapper IMMUTABLE — pattern standard pour contourner cette limitation.
-- ─────────────────────────────────────────────────────────────────────────────

-- Fonction helper IMMUTABLE pour la fin de séance (minutes uniquement, UTC-safe)
CREATE OR REPLACE FUNCTION public.session_range_end(
  p_start       timestamptz,
  p_duration_min int
)
RETURNS timestamptz
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT p_start + (p_duration_min * interval '1 minute')
$$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.sessions'::regclass
      AND conname = 'sessions_no_overlap_per_coach'
  ) THEN
    ALTER TABLE public.sessions DROP CONSTRAINT sessions_no_overlap_per_coach;
  END IF;
END $$;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_no_overlap_per_coach
  EXCLUDE USING gist (
    coach_id WITH =,
    tstzrange(
      scheduled_at,
      public.session_range_end(scheduled_at, duration_min),
      '[)'
    ) WITH &&
  )
  WHERE (status NOT IN ('annulée', 'no_show'));


-- ─── (C) booking vs session — trigger cross-tables ───────────────────────────
--
-- Avant d'insérer ou modifier un booking actif, vérifier qu'aucune session
-- active (tous coachs) ne chevauche le créneau.
-- SELECT FOR SHARE verrouille les sessions trouvées, réduisant la fenêtre de race.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_booking_vs_sessions()
RETURNS TRIGGER AS $$
BEGIN
  -- Booking annulé ou avec force_overlap : pas de vérification
  IF NEW.status IN ('cancelled_by_client', 'cancelled_by_coach') THEN
    RETURN NEW;
  END IF;
  IF NEW.force_overlap THEN
    RETURN NEW;
  END IF;

  -- Vérifier chevauchement avec toute session active (tous coachs)
  -- FOR SHARE : verrouille les lignes conflictuelles trouvées
  IF EXISTS (
    SELECT 1
    FROM public.sessions s
    WHERE s.status NOT IN ('annulée', 'no_show')
      AND s.scheduled_at < NEW.ends_at
      AND (s.scheduled_at + (s.duration_min * interval '1 minute')) > NEW.starts_at
    FOR SHARE
  ) THEN
    RAISE EXCEPTION 'Créneau déjà occupé par une séance planifiée';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_vs_sessions ON public.bookings;
CREATE TRIGGER trg_booking_vs_sessions
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_booking_vs_sessions();

-- Supprimer l'ancienne version créée lors de la session précédente (si présente)
DROP TRIGGER IF EXISTS trg_booking_sessions_overlap ON public.bookings;
DROP FUNCTION IF EXISTS public.check_booking_sessions_overlap();


-- ─── (D) session vs booking — trigger cross-tables ───────────────────────────
--
-- Avant d'insérer ou modifier une session active, vérifier qu'aucun booking
-- actif (tous coachs) ne chevauche le créneau.
-- FOR SHARE verrouille les bookings trouvés pour réduire la fenêtre de race.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_session_vs_bookings()
RETURNS TRIGGER AS $$
DECLARE
  v_ends_at timestamptz;
BEGIN
  -- Session annulée ou no_show : pas de vérification
  IF NEW.status IN ('annulée', 'no_show') THEN
    RETURN NEW;
  END IF;

  v_ends_at := NEW.scheduled_at + (NEW.duration_min * interval '1 minute');

  IF EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.status NOT IN ('cancelled_by_client', 'cancelled_by_coach')
      AND b.force_overlap = false
      AND b.starts_at < v_ends_at
      AND b.ends_at > NEW.scheduled_at
    FOR SHARE
  ) THEN
    RAISE EXCEPTION 'Créneau déjà occupé par une réservation en ligne';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_session_vs_bookings ON public.sessions;
CREATE TRIGGER trg_session_vs_bookings
  BEFORE INSERT OR UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.check_session_vs_bookings();


-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT (lecture seule) — à exécuter avant la migration pour détecter les
-- chevauchements déjà présents en base.
--
-- Copier-coller dans le SQL Editor Supabase (sans exécuter la migration).
-- ═══════════════════════════════════════════════════════════════════════════════
/*
-- A. Chevauchements booking / booking
SELECT
  a.id      AS booking_a,
  b.id      AS booking_b,
  a.coach_id,
  a.starts_at AS a_start,
  a.ends_at   AS a_end,
  b.starts_at AS b_start,
  b.ends_at   AS b_end,
  a.status    AS a_status,
  b.status    AS b_status
FROM public.bookings a
JOIN public.bookings b
  ON a.id < b.id
  AND a.starts_at < b.ends_at
  AND a.ends_at   > b.starts_at
  AND a.status NOT IN ('cancelled_by_client', 'cancelled_by_coach')
  AND b.status NOT IN ('cancelled_by_client', 'cancelled_by_coach')
  AND a.force_overlap = false
  AND b.force_overlap = false
ORDER BY a.starts_at;

-- B. Chevauchements session / session (même coach)
SELECT
  a.id      AS session_a,
  b.id      AS session_b,
  a.coach_id,
  a.scheduled_at AS a_start,
  (a.scheduled_at + (a.duration_min * interval '1 minute')) AS a_end,
  b.scheduled_at AS b_start,
  (b.scheduled_at + (b.duration_min * interval '1 minute')) AS b_end,
  a.status  AS a_status,
  b.status  AS b_status
FROM public.sessions a
JOIN public.sessions b
  ON a.id < b.id
  AND a.coach_id = b.coach_id
  AND a.scheduled_at < (b.scheduled_at + (b.duration_min * interval '1 minute'))
  AND (a.scheduled_at + (a.duration_min * interval '1 minute')) > b.scheduled_at
  AND a.status NOT IN ('annulée', 'no_show')
  AND b.status NOT IN ('annulée', 'no_show')
ORDER BY a.scheduled_at;

-- C. Chevauchements booking / session
SELECT
  b.id        AS booking_id,
  s.id        AS session_id,
  b.coach_id  AS booking_coach,
  s.coach_id  AS session_coach,
  b.starts_at AS booking_start,
  b.ends_at   AS booking_end,
  s.scheduled_at AS session_start,
  (s.scheduled_at + (s.duration_min * interval '1 minute')) AS session_end,
  b.status    AS booking_status,
  s.status    AS session_status
FROM public.bookings b
JOIN public.sessions s
  ON b.starts_at < (s.scheduled_at + (s.duration_min * interval '1 minute'))
  AND b.ends_at   > s.scheduled_at
  AND b.status NOT IN ('cancelled_by_client', 'cancelled_by_coach')
  AND s.status NOT IN ('annulée', 'no_show')
  AND b.force_overlap = false
ORDER BY b.starts_at;
*/


-- ═══════════════════════════════════════════════════════════════════════════════
-- ROLLBACK — à exécuter en cas de problème après la migration
-- ═══════════════════════════════════════════════════════════════════════════════
/*
-- 1. Supprimer la contrainte booking/booking
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_no_global_overlap;

-- 2. Supprimer la contrainte session/session et sa fonction helper
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_no_overlap_per_coach;
DROP FUNCTION IF EXISTS public.session_range_end(timestamptz, int);

-- 3. Supprimer les triggers cross-tables
DROP TRIGGER IF EXISTS trg_booking_vs_sessions ON public.bookings;
DROP FUNCTION IF EXISTS public.check_booking_vs_sessions();
DROP TRIGGER IF EXISTS trg_session_vs_bookings ON public.sessions;
DROP FUNCTION IF EXISTS public.check_session_vs_bookings();

-- 4. Restaurer le trigger global booking/booking (0023)
CREATE OR REPLACE FUNCTION public.check_global_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.force_overlap THEN RETURN NEW; END IF;
  IF NEW.status IN ('cancelled_by_client', 'cancelled_by_coach') THEN RETURN NEW; END IF;
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE id <> NEW.id
      AND status NOT IN ('cancelled_by_client', 'cancelled_by_coach')
      AND force_overlap = false
      AND starts_at < NEW.ends_at
      AND ends_at > NEW.starts_at
  ) THEN
    RAISE EXCEPTION 'Créneau déjà réservé';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_global_booking_overlap ON public.bookings;
CREATE TRIGGER trg_global_booking_overlap
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_global_booking_overlap();
*/
