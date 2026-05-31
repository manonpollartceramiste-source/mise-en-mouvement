-- ═══════════════════════════════════════════════════════════════
-- Fix : infinite recursion 42P17 sur la table profiles
--
-- Cause : les anciennes policies utilisaient des sous-requêtes
-- SELECT FROM public.profiles dans leurs clauses USING/WITH CHECK,
-- ce qui déclenche à nouveau les policies → boucle infinie.
--
-- Solution :
-- 1. Deux fonctions SECURITY DEFINER qui lisent profiles SANS
--    déclencher le RLS (elles tournent avec les droits du owner).
-- 2. Supprimer TOUTES les policies sur profiles (dynamic DROP).
-- 3. Recréer des policies qui ne contiennent AUCUN
--    "FROM profiles" dans leur corps — uniquement auth.uid() ou
--    un appel à nos fonctions SECURITY DEFINER.
-- ═══════════════════════════════════════════════════════════════


-- ── ÉTAPE 1 : Fonctions SECURITY DEFINER ────────────────────────
-- Ces fonctions lisent public.profiles avec les droits du propriétaire
-- (postgres), pas de l'appelant → bypass RLS → zéro récursion.

CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
  RETURNS text
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

-- Rendre les fonctions accessibles aux rôles Supabase
GRANT EXECUTE ON FUNCTION public.is_admin()      TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, anon, service_role;


-- ── ÉTAPE 2 : Supprimer TOUTES les policies de profiles ──────────
-- On utilise un bloc dynamique pour ne rien rater, peu importe le nom.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END
$$;


-- ── ÉTAPE 3 : Recréer les policies propres ───────────────────────
-- RÈGLE ABSOLUE : aucune clause USING/WITH CHECK ne contient
-- directement "FROM public.profiles". Seules les fonctions
-- SECURITY DEFINER ci-dessus sont autorisées à faire ce SELECT.

-- 1. Chaque utilisateur lit son propre profil
--    Condition : id = auth.uid()   → aucune sous-requête, aucune récursion.
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());


-- 2. Un coach lit les profils de ses clients
--    Condition : coach_id = auth.uid()  → aucune sous-requête.
--    Tout utilisateur dont l'id est le coach_id d'un profil peut le lire.
CREATE POLICY "profiles_select_coach_clients"
  ON public.profiles
  FOR SELECT
  USING (coach_id = auth.uid());


-- 3. Un admin lit tous les profils
--    is_admin() est SECURITY DEFINER → pas de récursion.
CREATE POLICY "profiles_select_admin"
  ON public.profiles
  FOR SELECT
  USING (public.is_admin());


-- 4. Chaque utilisateur modifie son propre profil
--    WITH CHECK utilise get_user_role() (SECURITY DEFINER) pour
--    empêcher l'auto-promotion de rôle, sans sous-requête récursive.
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role::text = public.get_user_role()
  );


-- 5. Un admin peut tout faire (SELECT / INSERT / UPDATE / DELETE)
--    is_admin() est SECURITY DEFINER → pas de récursion.
CREATE POLICY "profiles_all_admin"
  ON public.profiles
  FOR ALL
  USING (public.is_admin());


-- ── ÉTAPE 4 : Vérification ───────────────────────────────────────
-- Colle cette requête séparément pour confirmer les nouvelles policies.

SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;
