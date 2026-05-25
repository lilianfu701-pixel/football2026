-- ─────────────────────────────────────────────────────────────────────────────
-- 009_forum_storage.sql  —  Supabase Storage bucket for forum images
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create the bucket (public = images are publicly readable by URL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'forum-images',
  'forum-images',
  true,
  5242880,   -- 5 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS: anyone can read
CREATE POLICY "forum_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'forum-images');

-- 3. RLS: authenticated users can upload
CREATE POLICY "forum_images_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'forum-images'
    AND auth.role() = 'authenticated'
  );

-- 4. RLS: uploader can delete their own images
CREATE POLICY "forum_images_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'forum-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
