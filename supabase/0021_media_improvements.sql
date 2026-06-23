-- ─────────────────────────────────────────────────────────────
-- 0021 — Media library : site_location, usage_type, alt_text, caption
-- ─────────────────────────────────────────────────────────────

-- ── 1. Nouvelles colonnes ────────────────────────────────────

alter table public.media_library
  add column if not exists site_location text not null default 'footer-ambiance',
  add column if not exists usage_type    text not null default 'image-principale',
  add column if not exists alt_text      text not null default '',
  add column if not exists caption       text not null default '';

-- ── 2. Migrer category → site_location pour l'existant ──────

update public.media_library
set site_location = case category
  when 'hero'       then 'hero'
  when 'cabinet'    then 'cabinet'
  when 'coach'      then 'coachs'
  when 'seance'     then 'decouverte'
  when 'temoignage' then 'temoignages'
  when 'exercices'  then 'exercices'
  when 'ambiance'   then 'footer-ambiance'
  else 'footer-ambiance'
end
where site_location = 'footer-ambiance';

-- ── 3. Index ─────────────────────────────────────────────────

create index if not exists idx_media_site_location
  on public.media_library(site_location);

create index if not exists idx_media_location_active
  on public.media_library(site_location, is_active, sort_order);
