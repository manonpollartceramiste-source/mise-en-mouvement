-- ─────────────────────────────────────────────────────────────
-- 0032 — Rappel client : colonnes reminder sur bookings
--
-- Additive. IF NOT EXISTS. Réversible : DROP COLUMN.
-- ─────────────────────────────────────────────────────────────

alter table public.bookings
  add column if not exists reminder_sent_at   timestamptz null,
  add column if not exists reminder_claimed_at timestamptz null;

-- Index partiel pour la requête du cron (ne couvre que les lignes sans rappel)
create index if not exists bookings_reminder_window_idx
  on public.bookings (starts_at)
  where reminder_sent_at is null;
