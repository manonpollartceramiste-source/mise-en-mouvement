-- Médiathèque : colonnes manquantes (0021 jamais appliquée) + colonne status + RLS corrigée
--
-- Colonnes réelles en base avant cette migration :
--   id, title, description, file_url, file_type, category, is_active, sort_order,
--   created_at, updated_at
--
-- Cette migration ajoute :
--   site_location, usage_type, alt_text, caption  (manquantes depuis 0021)
--   status                                         (nouveau)

-- 1. Colonnes manquantes de 0021 (idempotent grâce à IF NOT EXISTS)
ALTER TABLE public.media_library
  ADD COLUMN IF NOT EXISTS site_location text NOT NULL DEFAULT 'footer-ambiance',
  ADD COLUMN IF NOT EXISTS usage_type    text NOT NULL DEFAULT 'image-principale',
  ADD COLUMN IF NOT EXISTS alt_text      text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS caption       text NOT NULL DEFAULT '';

-- 2. Migrer category → site_location pour les lignes existantes
UPDATE public.media_library
SET site_location = CASE category
  WHEN 'hero'       THEN 'hero'
  WHEN 'cabinet'    THEN 'cabinet'
  WHEN 'coach'      THEN 'coachs'
  WHEN 'seance'     THEN 'decouverte'
  WHEN 'temoignage' THEN 'temoignages'
  WHEN 'exercices'  THEN 'exercices'
  WHEN 'ambiance'   THEN 'footer-ambiance'
  ELSE 'footer-ambiance'
END
WHERE site_location = 'footer-ambiance';

-- 3. Colonne status
ALTER TABLE public.media_library
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'published', 'archived'));

-- 4. Médias existants actifs → published ; inactifs → archived
UPDATE public.media_library
SET status = CASE
  WHEN is_active = true THEN 'published'
  ELSE 'archived'
END
WHERE status = 'draft';

-- 5. Index (uniquement sur colonnes qui existent maintenant)
CREATE INDEX IF NOT EXISTS idx_media_site_location
  ON public.media_library(site_location);

CREATE INDEX IF NOT EXISTS idx_media_location_active
  ON public.media_library(site_location, is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_media_status
  ON public.media_library(status);

CREATE INDEX IF NOT EXISTS idx_media_status_location
  ON public.media_library(status, site_location, sort_order);

-- 6. Corriger la RLS write policy (role OU roles array)
DROP POLICY IF EXISTS "media_library_write_admin" ON public.media_library;
CREATE POLICY "media_library_write_admin"
  ON public.media_library FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role = 'admin'
          OR 'admin' = ANY(p.roles)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role = 'admin'
          OR 'admin' = ANY(p.roles)
        )
    )
  );
