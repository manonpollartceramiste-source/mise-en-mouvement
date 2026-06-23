-- Calendrier partagé entre coachs
-- Problème: sessions_select_coach n'autorise que coach_id = auth.uid()
-- Fix: tout utilisateur avec le rôle coach/admin peut lire TOUTES les sessions

-- 1. Remplacer la policy SELECT sessions par une version partagée
DROP POLICY IF EXISTS "sessions_select_coach" ON public.sessions;
CREATE POLICY "sessions_select_coach"
  ON public.sessions FOR SELECT
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

-- 2. Mettre à jour sessions_all_admin pour inclure le check roles[]
DROP POLICY IF EXISTS "sessions_all_admin" ON public.sessions;
CREATE POLICY "sessions_all_admin"
  ON public.sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          'admin' = ANY(p.roles)
          OR p.role = 'admin'
        )
    )
  );

-- Note: les policies INSERT/UPDATE/DELETE restent inchangées:
-- sessions_insert_coach: coach_id = auth.uid() (chaque coach crée ses propres sessions)
-- sessions_update_coach: coach_id = auth.uid() (chaque coach modifie ses propres sessions)
-- Un admin peut tout faire via sessions_all_admin
