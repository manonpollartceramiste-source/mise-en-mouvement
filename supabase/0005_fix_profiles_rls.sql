-- ─────────────────────────────────────────────────────────────
-- 0005 — Fix RLS infinite recursion sur la table profiles
-- Erreur : 42P17 infinite recursion detected in policy for relation "profiles"
--
-- Cause : les policies profiles_select_admin, profiles_select_coach_clients,
-- profiles_all_admin et profiles_update_own font toutes un SELECT sur
-- public.profiles pour vérifier le rôle → PostgreSQL boucle infiniment.
--
-- Fix : deux fonctions SECURITY DEFINER qui bypasse le RLS quand elles
-- lisent profiles. Les policies les appellent au lieu de sous-requêter
-- profiles directement.
-- ─────────────────────────────────────────────────────────────


-- ── 1. Fonctions helper (SECURITY DEFINER = bypass RLS) ──────

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

-- Accès public pour les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.is_admin()     TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, anon;


-- ── 2. Supprimer les anciennes policies récursives ────────────

DROP POLICY IF EXISTS "profiles_select_own"            ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_coach_clients"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin"          ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"            ON public.profiles;
DROP POLICY IF EXISTS "profiles_all_admin"             ON public.profiles;


-- ── 3. Recréer les policies propres ──────────────────────────

-- Chaque utilisateur lit son propre profil
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- Un coach (ou toute personne dont l'id est le coach_id) lit les profils clients
-- Pas de sous-requête sur profiles — coach_id = auth.uid() suffit
CREATE POLICY "profiles_select_coach_clients"
  ON public.profiles FOR SELECT
  USING (coach_id = auth.uid());

-- L'admin lit tout — via is_admin() qui est SECURITY DEFINER, pas de récursion
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- Chaque utilisateur modifie son propre profil
-- WITH CHECK utilise get_user_role() (SECURITY DEFINER) pour empêcher l'auto-promotion
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role::text = public.get_user_role()
  );

-- L'admin peut tout faire — via is_admin(), pas de récursion
CREATE POLICY "profiles_all_admin"
  ON public.profiles FOR ALL
  USING (public.is_admin());
