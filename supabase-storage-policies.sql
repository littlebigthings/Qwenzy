
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Enable storage for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view organization logos" ON storage.objects;

-- Allow authenticated users to upload to organizations bucket
CREATE POLICY "Enable organization logo uploads" ON storage.objects
  FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'organizations');

-- Allow authenticated users to read from organizations bucket  
CREATE POLICY "Enable organization logo reads" ON storage.objects
  FOR SELECT TO authenticated 
  USING (bucket_id = 'organizations');

-- Allow public access to view organization logos
CREATE POLICY "Public organization logo access" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'organizations');
