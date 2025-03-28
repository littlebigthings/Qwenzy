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
  const [isInvitation, setIsInvitation] = useState(false);
  const [invitationOrgId, setInvitationOrgId] = useState<string | null>(null);
  
  // Check for invitation in URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const invitation = searchParams.get('invitation');
    const orgId = searchParams.get('organization');
    
    if (invitation === 'true' && orgId) {
      console.log("URL indicates invitation with org ID:", orgId);
      setIsInvitation(true);
      setInvitationOrgId(orgId);
    }
  }, []);
  
  // Check DB for invitation if not in URL
  useEffect(() => {
    const checkInvitation = async () => {
      if (!user?.email) return;
      
      try {
        const { data, error } = await supabase
          .from("invitations")
          .select("organization_id")
          .eq("email", user.email)
          .maybeSingle();
          
        if (error) {
          console.error("Error checking for invitation:", error);
          return;
        }
        
        if (data) {
          console.log("Found invitation in database:", data.organization_id);
          setIsInvitation(true);
          setInvitationOrgId(data.organization_id);
        }
      } catch (err) {
        console.error("Exception checking invitation:", err);
      }
    };
    
    if (!isInvitation) {
      checkInvitation();
    }
  }, [user?.email, isInvitation]);
  
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

        // Set hasOrganization to true if memberships array is not empty
        setHasOrganization(memberships.length > 0);

        console.log("Organization membership check:", {
          hasOrganization: memberships.length > 0,
          memberships,
        });
      } catch (error) {
        console.error("Failed to check organization membership:", error);
      }
    };

    checkOrganizationMembership();
  }, [user, setHasOrganization]);

  if (!user) {
    return <Redirect to="/login" />;
  }
  
  // Pass invitation information to the OnboardingFlow component
  return <OnboardingFlow />;
}
