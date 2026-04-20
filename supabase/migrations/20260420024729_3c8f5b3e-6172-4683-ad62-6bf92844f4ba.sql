
-- Replace overly broad public SELECT on avatars with view-by-name only (no listing)
DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;

-- Public can view individual avatar files (read by URL works), but cannot LIST.
-- Supabase storage uses SELECT for both download and list. To prevent listing
-- while allowing public read of known URLs, we keep public files accessible via
-- the public CDN URL (which doesn't require RLS). We only allow SELECT to the
-- owner so the API list endpoint won't expose all files.
CREATE POLICY "Owners can list own avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can list all avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars' AND has_role(auth.uid(), 'admin'::app_role));
