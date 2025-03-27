import { useEffect } from "react"
import { useAuthContext } from "@/providers/auth-provider"
import { OnboardingFlow } from "@/components/onboarding-flow"
import { Redirect } from "wouter"

export default function OrganizationSetup() {
  const { user } = useAuthContext()

  useEffect(() => {
    console.log("Organization Setup Page - Mounted");
  }, []);

  if (!user) {
    return <Redirect to="/login" />
  }

  console.log("Organization Setup Page - Rendering onboarding flow");
  return <OnboardingFlow />
}
