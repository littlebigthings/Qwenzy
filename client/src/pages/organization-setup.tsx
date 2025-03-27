import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { OnboardingFlow } from "@/components/onboarding-flow"
import { Redirect, useLocation } from "wouter"
import { supabase } from "@/lib/supabase"
import { markInvitationAsAccepted, checkUserInvitations } from "@/lib/invitation-handler"

export default function OrganizationSetup() {
  const { user, hasOrganization, setHasOrganization } = useAuth()
  const [isInvitation, setIsInvitation] = useState(false);
  const [invitationOrgId, setInvitationOrgId] = useState<string | null>(null);
  const [location] = useLocation();

  // Check for invitation parameters in URL and DB
  useEffect(() => {
    const checkInvitations = async () => {
      // First check URL query parameters 
      const searchParams = new URLSearchParams(window.location.search);
      const invitation = searchParams.get('invitation');
      const orgId = searchParams.get('organization');
      
      if (invitation === 'true' && orgId) {
        setIsInvitation(true);
        setInvitationOrgId(orgId);
        return;
      }
      
      // If not in URL, check if user has active invitations in DB
      if (user?.email) {
        try {
          const invitationInfo = await checkUserInvitations(user.email);
          
          if (invitationInfo && invitationInfo.organizationId) {
            console.log("Found user invitation in database:", invitationInfo.organizationId);
            setIsInvitation(true);
            setInvitationOrgId(invitationInfo.organizationId);
          }
        } catch (error) {
          console.error("Error checking user invitations:", error);
        }
      }
    };
    
    checkInvitations();
  }, [location, user]);

  useEffect(() => {
    const checkOrganizationMembership = async () => {
      if (!user) return;

      try {
        const { data: memberships, error } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .limit(1);

        if (error) {
          console.error('Error checking organization membership:', error);
          return;
        }

        // Set hasOrganization to true if memberships array is not empty
        setHasOrganization(memberships.length > 0);
        
        console.log('Organization membership check:', { 
          hasOrganization: memberships.length > 0,
          memberships 
        });
        
        // If this is an invitation and the user now has an organization, mark the invitation as accepted
        if (isInvitation && invitationOrgId && memberships.length > 0 && user.email) {
          try {
            console.log("Marking invitation as accepted");
            await markInvitationAsAccepted(user.email, invitationOrgId);
          } catch (error) {
            console.error("Error marking invitation as accepted:", error);
          }
        }
      } catch (error) {
        console.error('Failed to check organization membership:', error);
      }
    };

    checkOrganizationMembership();
  }, [user, setHasOrganization]);

  if (!user) {
    return <Redirect to="/login" />
  }

  return <OnboardingFlow isInvitation={isInvitation} invitationOrgId={invitationOrgId} />
}
