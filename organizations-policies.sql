-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Enable organization creation for authenticated users" ON organizations;
DROP POLICY IF EXISTS "Enable read access for organization members" ON organizations;
DROP POLICY IF EXISTS "Enable update for organization members" ON organizations;

-- Policy for creating organizations (any authenticated user can create)
CREATE POLICY "Enable organization creation for authenticated users" ON organizations
  FOR INSERT TO public
  WITH CHECK (true);

-- Policy for reading organizations (members only)
CREATE POLICY "Enable read access for organization members" ON organizations
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Policy for updating organizations (owners only)
CREATE POLICY "Enable update for organization members" ON organizations
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.is_owner = true
    )
  );

-- Enable RLS on organization_members table
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable member creation" ON organization_members;
DROP POLICY IF EXISTS "Enable member read" ON organization_members;
DROP POLICY IF EXISTS "Enable member management" ON organization_members;

-- Allow creating memberships (during organization creation)
CREATE POLICY "Enable member creation" ON organization_members
  FOR INSERT TO public
  WITH CHECK (true);

-- Allow reading memberships (for organization members)
CREATE POLICY "Enable member read" ON organization_members
  FOR SELECT TO public
  USING (user_id = auth.uid());

-- Allow managing memberships (for organization owners)
CREATE POLICY "Enable member management" ON organization_members
  FOR ALL TO public
  USING (
    EXISTS (
      SELECT 1 FROM om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.is_owner = true
    )
  );

-- Make sure RLS is enabled on both tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;