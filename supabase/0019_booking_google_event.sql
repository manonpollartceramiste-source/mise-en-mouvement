-- 0019 — Ajout google_event_id sur les réservations
-- Stocke l'identifiant de l'événement Google Calendar créé pour chaque réservation.
-- À exécuter une seule fois dans le SQL Editor Supabase.

alter table public.bookings
  add column if not exists google_event_id text;
