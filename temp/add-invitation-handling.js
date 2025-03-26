const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join('client', 'src', 'components', 'onboarding-flow.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find where to insert our code - after the first useEffect block
const firstUseEffectPattern = /useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[\s*user\s*\]\s*\);/;
const match = content.match(firstUseEffectPattern);

if (match) {
  // Add our new useEffect after the first one
  const invitationHandlingCode = `

  // Handle invited user flow
  useEffect(() => {
    if (isInvitation && invitationOrgId && user) {
      // For invited users, we should skip directly to profile setup
      const loadInvitedOrganization = async () => {
        try {
          setLoading(true);
          
          // First check if the user is already a member
          const { data: memberships, error: membershipError } = await supabase
            .from("organization_members")
            .select("organization_id")
            .eq("user_id", user.id)
            .eq("organization_id", invitationOrgId)
            .maybeSingle();
            
          if (membershipError) {
            console.error("Error checking membership:", membershipError);
            return;
          }
          
          // If already a member, proceed normally
          if (memberships) {
            return;
          }
          
          // Get the organization data
          const { data: org, error } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", invitationOrgId)
            .single();
            
          if (error) {
            console.error("Error loading invited organization:", error);
            return;
          }
          
          // Set the organization in state
          setOrganization(org);
          
          // Create the user's membership to this organization
          const { error: insertError } = await supabase
            .from("organization_members")
            .insert({
              user_id: user.id,
              organization_id: invitationOrgId,
              role: "member"
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
          
          // Mark the invitation as accepted
          if (user.email) {
            await markInvitationAsAccepted(user.email, invitationOrgId);
          }
          
        } catch (error) {
          console.error("Error in invitation flow:", error);
        } finally {
          setLoading(false);
        }
      };
      
      loadInvitedOrganization();
    }
  }, [user, isInvitation, invitationOrgId]);`;

  content = content.replace(match[0], match[0] + invitationHandlingCode);
  
  // Write the modified content back to the file
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully added invitation handling code');
} else {
  console.error('Could not find the first useEffect block');
}
