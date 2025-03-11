import { ReactNode } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Redirect } from "wouter"

type ProtectedProps = {
  children: ReactNode
}

export function Protected({ children }: ProtectedProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Redirect to="/login" />
  }

  return <>{children}</>
}
