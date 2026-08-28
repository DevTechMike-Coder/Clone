-- 1. Create or Update Storage Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('posts', 'posts', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 2. Drop Existing Policies (Ensures Idempotent Execution)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

DROP POLICY IF EXISTS "Post images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own posts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own posts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own posts" ON storage.objects;

-- 3. RLS Policies: 'avatars' Bucket
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. RLS Policies: 'posts' Bucket
CREATE POLICY "Post images are publicly accessible"
ON storage.objects FOR SELECT
USING ( bucket_id = 'posts' );

CREATE POLICY "Users can upload their own posts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'posts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own posts"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'posts' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'posts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own posts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'posts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
