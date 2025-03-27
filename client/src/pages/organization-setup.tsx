import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { OnboardingFlow } from "@/components/onboarding-flow"
import { Redirect, useLocation } from "wouter"
import { supabase } from "@/lib/supabase"

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
