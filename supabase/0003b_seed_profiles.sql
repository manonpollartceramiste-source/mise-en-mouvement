-- ============================================================
-- Cabinet OS — Création manuelle des premiers profils
-- À exécuter dans le SQL Editor Supabase
-- APRÈS avoir créé les utilisateurs dans Authentication > Users
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 1 : Créer les utilisateurs dans Supabase Auth
-- ────────────────────────────────────────────────────────────
-- Dashboard Supabase → Authentication → Users → Invite user
-- (ou Add user)
-- Créer chaque utilisateur avec son email et mot de passe.
-- Le trigger handle_new_user crée automatiquement un profil
-- avec le rôle 'client' par défaut.
-- ────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 2 : Promouvoir les admins
-- Remplacer les emails par les vrais emails créés en étape 1.
-- ────────────────────────────────────────────────────────────

update public.profiles
set
  role = 'admin',
  display_name = 'Manon Pollart',   -- à adapter
  updated_at = now()
where email = 'manonpollart.ceramiste@gmail.com';  -- remplacer

update public.profiles
set
  role = 'admin',
  display_name = 'Dorian Hébert',   -- à adapter
  updated_at = now()
where email = 'dorian34.hebert@gmail.com';  -- remplacer

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 3 : Promouvoir les coachs
-- ────────────────────────────────────────────────────────────

-- Dorian (coach sportif)
update public.profiles
set
  role = 'coach',
  display_name = 'Dorian Hébert',
  bio = 'Coach sportif & Entraîneur de handball. Reprise progressive et durable.',
  active = true,
  updated_at = now()
where email = 'dorian@mise-en-mouvement.fr';  -- remplacer par son vrai email Cabinet OS

-- Gregory (si besoin d'un compte Cabinet OS)
update public.profiles
set
  role = 'coach',
  display_name = 'Grégory Nadal',
  bio = 'Expert en réathlétisation & pilates.',
  active = true,
  updated_at = now()
where email = 'gregory@mise-en-mouvement.fr';  -- remplacer

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 4 : Rattacher un client à son coach référent
-- (après avoir créé le client via Supabase Auth)
-- ────────────────────────────────────────────────────────────

-- Exemple : attribuer client@example.com au coach Dorian
update public.profiles
set
  coach_id = (
    select id from public.profiles
    where email = 'dorian@mise-en-mouvement.fr'  -- email du coach
    limit 1
  ),
  display_name = 'Prénom Nom Client',  -- à adapter
  updated_at = now()
where email = 'client@example.com';  -- email du client

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 5 : Vérifier l'état des profils
-- ────────────────────────────────────────────────────────────

select
  id,
  role,
  display_name,
  email,
  active,
  coach_id,
  created_at
from public.profiles
order by role, display_name;

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 6 (optionnel) : Créer un pack de séances pour un client
-- ────────────────────────────────────────────────────────────

insert into public.session_packs (
  client_id,
  coach_id,
  offer_id,
  offer_label,
  total,
  remaining,
  purchased_at
)
values (
  (select id from public.profiles where email = 'client@example.com'),
  (select id from public.profiles where email = 'dorian@mise-en-mouvement.fr'),
  'carte-10',          -- id de l'offre dans lib/content/offers.ts
  'Carte 10 séances',
  10,
  10,
  now()
);

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 7 : Créer le questionnaire découverte d'un client
-- ────────────────────────────────────────────────────────────

insert into public.questionnaires (
  client_id,
  coach_id,
  status
)
values (
  (select id from public.profiles where email = 'client@example.com'),
  (select id from public.profiles where email = 'dorian@mise-en-mouvement.fr'),
  'en_attente'
);
