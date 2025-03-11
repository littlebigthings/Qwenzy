import { useAuth } from "@/hooks/use-auth"
import { OnboardingFlow } from "@/components/onboarding-flow"

export default function ProfileSetup() {
  const { user } = useAuth()

  if (!user) return null

  return <OnboardingFlow />
}