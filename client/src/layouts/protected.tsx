import { ReactNode, useEffect } from "react"
import { useAuthContext } from "@/providers/auth-provider"
import { Redirect, useLocation } from "wouter"
import { Loader2 } from "lucide-react"

type ProtectedProps = {
  children: ReactNode
}

export function Protected({ children }: ProtectedProps) {
  const { user, loading, hasOrganization } = useAuthContext()
  const [location] = useLocation()

  // Always show login page if no user
  if (!user) {
    return <Redirect to="/login" />
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
    )
  }

  // Handle organization setup routing
  if (!hasOrganization) {
    // If not on organization selection or setup page, redirect to organization selection
    if (location !== '/organization-selection' && location !== '/organization-setup') {
      return <Redirect to="/organization-selection" />
    }
  } else if (location === '/organization-selection') {
    // If user already has an organization and is on organization selection page, redirect to home
    return <Redirect to="/" />
  }

  return <>{children}</>
}
