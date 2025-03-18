import { useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { OnboardingFlow } from "@/components/onboarding-flow"
import { Redirect } from "wouter"

export default function OrganizationSetup() {
  const { user } = useAuth()

  if (!user) {
    return <Redirect to="/login" />
  }

  return <OnboardingFlow />
}