import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { OnboardingFlow } from "@/components/onboarding-flow"
import { OrganizationList } from "@/components/organization-list"
import { Redirect } from "wouter"
import { supabase } from "@/lib/supabase"

export default function OrganizationSetup() {
  const { user } = useAuth()
  const [hasOrganizations, setHasOrganizations] = useState<boolean | null>(null)

  useEffect(() => {
    const checkOrganizations = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .limit(1);

        if (error) throw error;
        setHasOrganizations(data && data.length > 0);
      } catch (error) {
        console.error('Error checking organizations:', error);
        setHasOrganizations(false);
      }
    };

    checkOrganizations();
  }, [user]);

  if (!user) {
    return <Redirect to="/login" />
  }

  // Show loading state while checking organizations
  if (hasOrganizations === null) {
    return null;
  }

  // If user has no organizations, show the organization list
  if (!hasOrganizations) {
    return <OrganizationList />;
  }

  // If user has organizations, show the onboarding flow
  return <OnboardingFlow />;
}