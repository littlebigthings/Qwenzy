-- Supabase Storage Policies for Avatar Uploads

-- First, enable Row Level Security on the storage.objects table if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create the avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)  -- Make it public so avatar images can be accessed without auth
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies with the same names to avoid conflicts
DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatar insert access for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Avatar update access for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete access for authenticated users" ON storage.objects;

-- Policy to allow anyone to read avatars (they're public)
CREATE POLICY "Public read access for avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Policy to allow authenticated users to upload their own avatars
CREATE POLICY "Avatar insert access for authenticated users"
ON storage.objects FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'avatars'
);

-- Policy to allow authenticated users to update their own avatars
CREATE POLICY "Avatar update access for authenticated users"
ON storage.objects FOR UPDATE
USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'avatars'
);

-- Policy to allow authenticated users to delete their own avatars
CREATE POLICY "Avatar delete access for authenticated users"
ON storage.objects FOR DELETE
USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'avatars'
);
