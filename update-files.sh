#!/bin/bash

# Update verify-email.tsx 
echo "Updating verify-email.tsx..."
sed -i 's/localStorage.setItem(.*invitation.*);/\/\/ No longer using localStorage/g' client/src/pages/verify-email.tsx
sed -i 's/localStorage.setItem(.*invitationOrgId.*);/\/\/ Storing in database directly/g' client/src/pages/verify-email.tsx

# Update onboarding-flow.tsx
echo "Updating onboarding-flow.tsx..."
cat > temp-onboarding.txt << 'ONBOARDING'
  // No longer checking localStorage - we'll get invitation data directly from props
ONBOARDING

sed -i '/\/\/ Check for invitation in localStorage/,/}, \[\]);/c\  // No longer checking localStorage - we get invitation data from props' client/src/components/onboarding-flow.tsx

# Update organization-setup.tsx to check for invitations in database
echo "Updating organization-setup.tsx..."
cat > check-invitations.txt << 'INVITATIONS'
  // Check if user has any active invitations in the database
  useEffect(() => {
    const checkUserInvitations = async () => {
      if (!user || isInvitation) return; // Skip if we already have invitation from URL or if no user
      
      try {
        // Query invitations table for the user's email
        const { data: invitations, error } = await supabase
          .from('invitations')
          .select('organization_id')
          .eq('email', user.email)
          .eq('accepted', false)
          .limit(1);
          
        if (error) {
          console.error("Error checking user invitations:", error);
          return;
        }
        
        // If there's an invitation, set the state
        if (invitations && invitations.length > 0) {
          console.log("Found invitation in database:", invitations[0].organization_id);
          setIsInvitation(true);
          setInvitationOrgId(invitations[0].organization_id);
        }
      } catch (error) {
        console.error("Error in invitation check:", error);
      }
    };
    
    checkUserInvitations();
  }, [user, isInvitation]);
INVITATIONS

# Insert after the first useEffect in organization-setup.tsx
sed -i '/}, \[location\]);/r check-invitations.txt' client/src/pages/organization-setup.tsx

# Add invitation marking code to organization membership check
cat > mark-invitation.txt << 'MARK'
        
        // If this is an invitation and the user now has an organization, mark the invitation as accepted
        if (isInvitation && invitationOrgId && memberships.length > 0 && user.email) {
          try {
            console.log("Marking invitation as accepted");
            await markInvitationAsAccepted(user.email, invitationOrgId);
          } catch (error) {
            console.error("Error marking invitation as accepted:", error);
          }
        }
MARK

# Insert before the closing of checkOrganizationMembership
sed -i '/console.log.*memberships.*);/r mark-invitation.txt' client/src/pages/organization-setup.tsx

# Add import for markInvitationAsAccepted to organization-setup.tsx
sed -i '5a import { markInvitationAsAccepted } from "@/lib/invitation-handler"' client/src/pages/organization-setup.tsx

