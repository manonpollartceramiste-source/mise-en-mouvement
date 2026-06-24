-- Médiathèque : ajout colonne status + correction RLS write policy

-- 1. Colonne status (draft → visible admin seulement, published → site public, archived → masqué)
ALTER TABLE public.media_library
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'published', 'archived'));

-- 2. Index sur status pour les requêtes filtrées
CREATE INDEX IF NOT EXISTS idx_media_status
  ON public.media_library(status);

CREATE INDEX IF NOT EXISTS idx_media_status_location
  ON public.media_library(status, site_location, sort_order);

-- 3. Corriger la RLS write policy :
--    - était : p.role = 'admin' uniquement
--    - devient : p.role = 'admin' OU 'admin' = ANY(p.roles)
--    En pratique, les fonctions admin utilisent getSupabaseAdmin() (service role)
--    qui bypasse totalement la RLS. Cette policy est une sécurité de secours.
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

-- 4. Médias existants (is_active = true) → published ; inactifs → archived
UPDATE public.media_library
  SET status = CASE
    WHEN is_active = true  THEN 'published'
    ELSE 'archived'
  END
WHERE status = 'draft';
