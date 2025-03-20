import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from "lucide-react"

interface AuthContextType extends ReturnType<typeof useAuth> {
  hasOrganization?: boolean;
  setHasOrganization?: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [hasOrganization, setHasOrganization] = useState<boolean>(false)
  const auth = useAuth()

  useEffect(() => {
    // Mark as initialized after the first auth check
    if (!auth.loading) {
      setIsInitialized(true)
    }
  }, [auth.loading])

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider 
      value={{
        ...auth,
        hasOrganization,
        setHasOrganization
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}