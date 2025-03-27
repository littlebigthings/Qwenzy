import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { OnboardingFlow } from "@/components/onboarding-flow"
import { Redirect, useLocation } from "wouter"
import { supabase } from "@/lib/supabase"
import { markInvitationAsAccepted } from "@/lib/invitation-handler"

export default function OrganizationSetup() {
  const { user, hasOrganization, setHasOrganization } = useAuth()
  const [isInvitation, setIsInvitation] = useState(false);
  const [invitationOrgId, setInvitationOrgId] = useState<string | null>(null);
  const [location] = useLocation();

  // Check for invitation parameters in URL
  useEffect(() => {
    // Check URL query parameters
    const searchParams = new URLSearchParams(window.location.search);
    const invitation = searchParams.get('invitation');
    const orgId = searchParams.get('organization');
    
    if (invitation === 'true' && orgId) {
      setIsInvitation(true);
      setInvitationOrgId(orgId);
    }
  }, [location]);
  
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
  }, [user, setHasOrganization, isInvitation, invitationOrgId]);

  if (!user) {
    return <Redirect to="/login" />
  }

  return <OnboardingFlow isInvitation={isInvitation} invitationOrgId={invitationOrgId} />
}
