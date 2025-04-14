import { ReactNode, useEffect, useState } from "react";
import { useAuthContext } from "@/providers/auth-provider";
import { Redirect, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getOnboardingStatusByUserId } from "@/lib/api";
import { log } from "console";

type ProtectedProps = {
  children: ReactNode;
};

export function Protected({ children }: ProtectedProps) {
  const { user, loading } = useAuthContext();
  const [location] = useLocation();
  const [onboardingStatus, setOnboardingStatus] = useState<null | { current_step: string }>(null);
  const [isLoadingOnboarding, setIsLoadingOnboarding] = useState(true);

  useEffect(() => {
    const fetchOnboarding = async () => {
      if (!user) return;

      try {
        const res = await getOnboardingStatusByUserId(user.id); 
        setOnboardingStatus(res);
      } catch (error) {
        console.error("Failed to fetch onboarding status:", error);
      } finally {
        setIsLoadingOnboarding(false);
      }
    };

    fetchOnboarding();
  }, [user]);

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (loading || isLoadingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!onboardingStatus && location !== "/organization-selection" && location!=="/organization-setup") {    
    return <Redirect to="/organization-selection" />;
  }  
  if(onboardingStatus && onboardingStatus?.current_step === "completed" && (location === "/organization-selection" || location === "/organization-setup")){
    return <Redirect to="/" />;
  }
  if (onboardingStatus && onboardingStatus?.current_step === "organization" && location !== "/organization-selection" && location!=="/organization-setup") {
    return <Redirect to="/organization-selection" />;
  }
  if (onboardingStatus && onboardingStatus?.current_step !== "completed" && onboardingStatus?.current_step !== "organization" && location !== "/organization-setup") {
    return <Redirect to="/organization-setup" />;
  }
  
  return <>{children}</>;
}
