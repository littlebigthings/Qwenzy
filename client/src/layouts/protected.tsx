import { ReactNode } from "react"
import { useAuthContext } from "@/providers/auth-provider"
import { Redirect, useLocation } from "wouter"
import { Loader2 } from "lucide-react"

type ProtectedProps = {
  children: ReactNode
}

export function Protected({ children }: ProtectedProps) {
  const { user, loading } = useAuthContext()
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

  // The organization setup page is accessible without any checks
  if (location === '/organization-setup') {
    return <>{children}</>
  }

  // All other protected routes require completed organization setup
  if (location !== '/organization-setup') {
    return <Redirect to="/organization-setup" />
  }

  return <>{children}</>
}