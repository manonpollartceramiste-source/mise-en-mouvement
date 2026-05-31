-- ============================================================
-- Cabinet OS — Sprint 2
-- Migration : 0004_profiles_links.sql
-- Ajoute les liens Cal.com et SumUp aux profils coachs
-- ============================================================

alter table public.profiles
  add column if not exists calcom_url text,
  add column if not exists sumup_url  text;
