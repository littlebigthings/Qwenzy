import { ReactNode } from "react"
import { useAuthContext } from "@/providers/auth-provider"
import { Redirect, useLocation } from "wouter"
import { Loader2 } from "lucide-react"

type ProtectedProps = {
  children: ReactNode
}

export function Protected({ children }: ProtectedProps) {
  const { user, loading, hasProfile, hasOrganization } = useAuthContext()
  const [location] = useLocation()

  // Don't show loading state if we're already on a public route
  const isPublicRoute = ['/login', '/register', '/reset-password'].includes(location)

  if (loading && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Redirect to="/login" />
  }

  // If user is logged in but doesn't have a profile or organization
  // and they're not already on the profile setup page
  if ((!hasProfile || !hasOrganization) && location !== '/profile-setup') {
    return <Redirect to="/profile-setup" />
  }

  return <>{children}</>
}