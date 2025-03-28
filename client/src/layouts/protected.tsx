import { ReactNode, useEffect, useState } from "react";
import { useAuthContext } from "@/providers/auth-provider";
import { Redirect, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type ProtectedProps = {
  children: ReactNode;
};

export function Protected({ children }: ProtectedProps) {
  const { user, loading } = useAuthContext();
  const { hasOrganization } = useAuth();
  const [location] = useLocation();
  const [forceRender, setForceRender] = useState(0); // Forces a re-render when state changes

  console.log("Protected layout - Current location:", location);
  console.log("Protected layout - hasOrganization:", hasOrganization);

  useEffect(() => {
    console.log("🚀 Protected - Detected hasOrganization change:", hasOrganization);
    setForceRender((prev) => prev + 1); // Force re-render
  }, [hasOrganization]);

  // Always show login page if no user
  if (!user) {
    return <Redirect to="/login" />;
  }

  // Show loading only during initial auth check
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Special case for organization setup flow
  const isOnboardingPath =
    location === "/organization-setup" ||
    location === "/organization-selection" ||
    location === "/profile-setup";

  console.log("isOnboardingPath:", isOnboardingPath);
  console.log("hasOrganization:", hasOrganization);

  // If no organization and not on onboarding path, redirect to organization selection
  if (!hasOrganization && !isOnboardingPath) {
    console.log("Redirecting to organization selection");
    return <Redirect to="/organization-selection" />;
  }

  // If user has organization and is on organization selection, redirect to home
  if (hasOrganization && location === "/organization-selection") {
    console.log("Redirecting to home");
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}
