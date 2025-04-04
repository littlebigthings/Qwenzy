import { useEffect, useState } from "react";
import { useAuthContext } from "@/providers/auth-provider";
import { useAuth } from "@/hooks/use-auth";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { Redirect, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";

export default function OrganizationSetup() {
  const { hasOrganization, setHasOrganization } = useAuth();
  const { user } = useAuthContext();
  const [location] = useLocation();
  const [orgId, setOrgId] = useState<string | null>(null);

  // Check for invitation in URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const orgId = searchParams.get('org');
    setOrgId(orgId);
  }, []);

  // Check organization membership and update state
  useEffect(() => {
    const checkOrganizationMembership = async () => {
      if (!user) return;

      try {
        const { data: memberships, error } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id)
          .limit(1);

        if (error) {
          console.error("Error checking organization membership:", error);
          return;
        }

        const hasOrg = memberships && memberships.length > 0;
        console.log("Organization membership check:", { 
          hasOrganization: hasOrg,
          memberships,
          userId: user.id 
        });

        // Only update if the state needs to change
        if (hasOrg) {
          setHasOrganization(true);
        }
      } catch (error) {
        console.error("Failed to check organization membership:", error);
      }
    };

    checkOrganizationMembership();
  }, [user, setHasOrganization]);

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <OnboardingFlow orgId={orgId} />;
}