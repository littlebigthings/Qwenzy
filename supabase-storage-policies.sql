-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Enable storage for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON storage.objects;

-- Simple policy for upload access
CREATE POLICY "Enable storage for authenticated users" ON storage.objects
  FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'organisations');

-- Simple policy for read access
CREATE POLICY "Enable read access for authenticated users" ON storage.objects
  FOR SELECT TO authenticated 
  USING (bucket_id = 'organisations');

-- Allow public read access for logos
CREATE POLICY "Allow public to view organization logos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'organisations');

-- For the 'avatars' bucket
CREATE POLICY "Allow users to upload their own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Allow users to update their own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Allow public to view avatars" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');