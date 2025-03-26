#!/bin/bash

# Update the organization-setup.tsx file
cat > client/src/pages/organization-setup.tsx << 'EOL'
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

  // Check for invitation parameters in URL or local storage
  useEffect(() => {
    // Check URL query parameters first
    const searchParams = new URLSearchParams(window.location.search);
    const invitation = searchParams.get('invitation');
    const orgId = searchParams.get('organization');
    
    if (invitation === 'true' && orgId) {
      setIsInvitation(true);
      setInvitationOrgId(orgId);
    } else {
      // Then check local storage
      const hasInvitation = localStorage.getItem('invitation') === 'true';
      const storedOrgId = localStorage.getItem('invitationOrgId');
      
      if (hasInvitation && storedOrgId) {
        setIsInvitation(true);
        setInvitationOrgId(storedOrgId);
        
        // Clear the invitation data from local storage so it doesn't persist
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
EOL

chmod +x temp/update-organization-setup.sh
./temp/update-organization-setup.sh
