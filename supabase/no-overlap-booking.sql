-- Anti-double-booking : contrainte d'exclusion DB-level
-- À exécuter une seule fois dans le SQL Editor Supabase
-- (Dashboard → SQL Editor → Nouvelle requête → Coller → Run)

-- 1. Active l'extension btree_gist (requise pour EXCLUSION sur types non-géométriques)
create extension if not exists btree_gist;

-- 2. Ajoute la contrainte d'exclusion sur la table bookings
--    Empêche deux réservations actives du même coach de se chevaucher.
--    Les réservations annulées (cancelled_by_client / cancelled_by_coach) sont exclues
--    de la contrainte via la clause WHERE.
alter table bookings
  add constraint no_overlap_booking
  exclude using gist (
    coach_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status not in ('cancelled_by_client', 'cancelled_by_coach'));
