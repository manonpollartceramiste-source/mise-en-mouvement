-- Calendrier entièrement partagé : tout coach peut modifier et supprimer n'importe quelle séance
--
-- Règle métier : le calendrier est partagé entre tous les coachs.
--   - SELECT  : tout coach lit toutes les séances       (déjà fait en 0024)
--   - INSERT  : chaque coach crée sous son propre coach_id (inchangé)
--   - UPDATE  : tout coach peut modifier n'importe quelle séance  ← NOUVEAU
--   - DELETE  : tout coach peut supprimer n'importe quelle séance ← NOUVEAU
--   - ALL     : admin peut tout faire                   (inchangé)

-- 1. UPDATE : remplacer la policy coach_id = auth.uid() par une policy ouverte à tout coach
DROP POLICY IF EXISTS "sessions_update_coach" ON public.sessions;
CREATE POLICY "sessions_update_coach"
  ON public.sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          'coach' = ANY(p.roles)
          OR 'admin' = ANY(p.roles)
          OR p.role IN ('coach', 'admin')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          'coach' = ANY(p.roles)
          OR 'admin' = ANY(p.roles)
          OR p.role IN ('coach', 'admin')
        )
    )
  );

-- 2. DELETE : créer une policy permettant à tout coach de supprimer n'importe quelle séance
DROP POLICY IF EXISTS "sessions_delete_coach" ON public.sessions;
CREATE POLICY "sessions_delete_coach"
  ON public.sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          'coach' = ANY(p.roles)
          OR 'admin' = ANY(p.roles)
          OR p.role IN ('coach', 'admin')
        )
    )
  );
