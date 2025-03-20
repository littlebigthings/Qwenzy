import { useAuth } from "@/hooks/use-auth"
import { ProfileSetupScreen } from "@/components/profile-setup-screen"
import { BackgroundPattern } from "@/components/background-pattern"

export default function ProfileSetup() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="min-h-screen relative">
      <BackgroundPattern />
      <div className="relative z-10 flex items-center justify-center min-h-screen py-12 px-4">
        <ProfileSetupScreen />
      </div>
    </div>
  )
}