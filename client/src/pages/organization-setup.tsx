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

  // Check for invitation parameters in URL or localStorage
  useEffect(() => {
    // Check URL query parameters first
    const searchParams = new URLSearchParams(window.location.search);
    const invitation = searchParams.get('invitation');
    const orgId = searchParams.get('organization');
    
    if (invitation === 'true' && orgId) {
      setIsInvitation(true);
      setInvitationOrgId(orgId);
    } else {
      // Then check localStorage for invitation data (set by verify-email.tsx)
      const storedInvitation = localStorage.getItem('invitation');
      const storedOrgId = localStorage.getItem('invitationOrgId');
      
      if (storedInvitation === 'true' && storedOrgId) {
        console.log("Found invitation in localStorage:", storedOrgId);
        setIsInvitation(true);
        setInvitationOrgId(storedOrgId);
        
        // Clear localStorage after reading to prevent persistence after onboarding
        localStorage.removeItem('invitation');
        localStorage.removeItem('invitationOrgId');
      }
    }
  }, [location]);

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
