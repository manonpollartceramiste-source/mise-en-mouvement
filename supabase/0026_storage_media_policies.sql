-- Storage policies for bucket "site-media"
-- Public read (anon), admin write via service role (bypasses RLS anyway,
-- but explicit policies protect against accidental anon writes)

-- Enable RLS on storage.objects (idempotent)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. Public SELECT — anyone can read media files (images/videos on the site)
DROP POLICY IF EXISTS "site_media_public_read" ON storage.objects;
CREATE POLICY "site_media_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-media');

-- 2. Authenticated admin INSERT — only authenticated users can upload
--    (service role bypasses this; it exists as a safety net)
DROP POLICY IF EXISTS "site_media_admin_insert" ON storage.objects;
CREATE POLICY "site_media_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'site-media');

-- 3. Authenticated admin UPDATE
DROP POLICY IF EXISTS "site_media_admin_update" ON storage.objects;
CREATE POLICY "site_media_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'site-media');

-- 4. Authenticated admin DELETE
DROP POLICY IF EXISTS "site_media_admin_delete" ON storage.objects;
CREATE POLICY "site_media_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'site-media');
