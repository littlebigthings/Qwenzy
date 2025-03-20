-- Enable Row Level Security
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name)
SELECT 'avatars', 'avatars'
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars');

-- Create policy to allow authenticated users to upload their own avatars
CREATE POLICY insert_avatar ON storage.objects FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  bucket_id = 'avatars'
);

-- Create policy to allow authenticated users to update their own avatars
CREATE POLICY update_avatar ON storage.objects FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND
  bucket_id = 'avatars'
);

-- Create policy to allow viewing avatars
CREATE POLICY read_avatar ON storage.objects FOR SELECT 
USING (
  bucket_id = 'avatars'
);

-- Create policy to allow authenticated users to delete their own avatars
CREATE POLICY delete_avatar ON storage.objects FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND
  bucket_id = 'avatars'
);

-- Drop any existing policies with the same name to avoid conflicts
DROP POLICY IF EXISTS user_insert_avatar ON storage.objects;
DROP POLICY IF EXISTS user_select_avatar ON storage.objects;
DROP POLICY IF EXISTS user_update_avatar ON storage.objects;
DROP POLICY IF EXISTS user_delete_avatar ON storage.objects;

-- Create more specific policies for user avatar management
CREATE POLICY user_insert_avatar ON storage.objects FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY user_select_avatar ON storage.objects FOR SELECT 
USING (
  bucket_id = 'avatars'
);

CREATE POLICY user_update_avatar ON storage.objects FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY user_delete_avatar ON storage.objects FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);