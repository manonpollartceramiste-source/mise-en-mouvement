-- Ajoute storage_path pour suppression fiable sans parser l'URL publique
ALTER TABLE public.media_library
  ADD COLUMN IF NOT EXISTS storage_path text NOT NULL DEFAULT '';

-- Backfill depuis file_url pour les lignes existantes
-- Format URL Supabase : .../storage/v1/object/public/site-media/{path}
UPDATE public.media_library
SET storage_path = substring(file_url FROM '/site-media/(.+)$')
WHERE storage_path = '' AND file_url LIKE '%/site-media/%';
