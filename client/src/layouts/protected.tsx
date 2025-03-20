import { ReactNode, useEffect } from "react"
import { useAuthContext } from "@/providers/auth-provider"
import { Redirect, useLocation } from "wouter"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

type ProtectedProps = {
  children: ReactNode
}

export function Protected({ children }: ProtectedProps) {
  const { user, loading, hasOrganization, setHasOrganization } = useAuthContext()
  const [location] = useLocation()

  // Check if user belongs to any organization
  useEffect(() => {
    const checkOrganizationMembership = async () => {
      if (!user) return;

      try {
        const { data: memberships, error } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking organization membership:', error);
        }

        setHasOrganization?.(!!memberships);
      } catch (error) {
        console.error('Failed to check organization membership:', error);
      }
    };

    checkOrganizationMembership();
  }, [user, setHasOrganization]);

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
    if (location !== '/organization-setup') {
      return <Redirect to="/organization-setup" />
    }
  } else if (location === '/organization-setup') {
    return <Redirect to="/" />
  }

  return <>{children}</>
}