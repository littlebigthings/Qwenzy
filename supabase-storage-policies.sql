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