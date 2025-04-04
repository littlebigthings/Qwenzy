// Script to modify onboarding-flow.tsx to handle orgId parameter
const fs = require('fs');
const path = require('path');

const filePath = path.join('client', 'src', 'components', 'onboarding-flow.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. First, add useEffect to handle orgId parameter
const pattern1 = `  // Handle invited user flow
  useEffect(() => {
    if (isInvitation && invitationOrgId !== "null" && user && invitationChecked) {`;

const replacement1 = `  // Handle orgId parameter similar to invitation flow
  useEffect(() => {
    if (orgId && user && invitationChecked && !isInvitation) {
      // For users with direct orgId parameter, skip to profile setup
      const handleDirectOrgId = async () => {
        try {
          setLoading(true);
          
          // First check if the user is already a member
          const { data: memberships, error: membershipError } = await supabase
            .from("organization_members")
            .select("organization_id")
            .eq("user_id", user.id)
            .eq("organization_id", orgId)
            .maybeSingle();
            
          if (membershipError) {
            console.error("Error checking membership:", membershipError);
          }
          
          // If already a member, proceed normally
          if (memberships) {
            setHasOrganization(true);
            return;
          }
          
          // Get the organization data
          const { data: org, error } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", orgId)
            .single();
            
          if (error) {
            console.error("Error loading organization:", error);
            return;
          }
          
          // Set the organization in state
          setOrganization(org);
          setHasOrganization(true);
          
          // Create the user's membership to this organization
          const { error: insertError } = await supabase
            .from("organization_members")
            .insert({
              user_id: user.id,
              organization_id: orgId,
              is_owner: false
            });
              
          if (insertError) {
            console.error("Error creating membership:", insertError);
            return;
          }
          
          // Set the current step to profile setup
          setCompletedSteps(["organization"]);
          setCurrentStep("profile");
          
          // Save progress
          await saveProgress("profile", ["organization"]);
          
        } catch (error) {
          console.error("Error in direct orgId flow:", error);
        } finally {
          setLoading(false);
        }
      };
      
      handleDirectOrgId();
    }
  }, [user, orgId, setHasOrganization, invitationChecked, isInvitation]);

  // Handle invited user flow
  useEffect(() => {
    if (isInvitation && invitationOrgId !== "null" && user && invitationChecked) {`;

content = content.replace(pattern1, replacement1);

// 2. Update profile form submission to consider orgId
const pattern2 = `      // For invited users, use the invitation org ID
      // Otherwise use the organization from state
      const orgId = isInvitation && invitationOrgId ? invitationOrgId : organization?.id;`;

const replacement2 = `      // For invited users, use the invitation org ID
      // For direct orgId parameter, use that
      // Otherwise use the organization from state
      let organizationId = organization?.id;
      if (isInvitation && invitationOrgId) {
        organizationId = invitationOrgId;
      } else if (orgId) {
        organizationId = orgId;
      }`;

content = content.replace(pattern2, replacement2);

// 3. Update the check for missing organization
const pattern3 = `      if (!orgId) throw new Error("Missing organization information");`;
const replacement3 = `      if (!organizationId) throw new Error("Missing organization information");`;
content = content.replace(pattern3, replacement3);

// 4. Update any remaining references to orgId variable in profile submission
content = content.replace(/\borgId\b/g, 'organizationId');

// 5. Write the file
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully modified onboarding-flow.tsx to handle orgId parameter');
