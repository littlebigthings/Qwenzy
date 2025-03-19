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

-- For the 'organisations' bucket
CREATE POLICY "Allow organization members to upload logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'organisations' AND 
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = auth.uid() 
    )
  );

CREATE POLICY "Allow organization members to update logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'organisations' AND 
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = auth.uid() 
    )
  );

CREATE POLICY "Allow public to view organization logos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'organisations');