import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useLocation } from 'wouter'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasProfile, setHasProfile] = useState<boolean>(false)
  const [hasOrganization, setHasOrganization] = useState<boolean>(false)
  const { toast } = useToast()
  const [, setLocation] = useLocation()

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email)
      setUser(session?.user ?? null)
      if (session?.user) {
        //checkUserStatus(session.user)  Removed - No replacement provided
      } else {
        setLoading(false)
      }
    })

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      setUser(session?.user ?? null)

      if (session?.user) {
        //checkUserStatus(session.user) Removed - No replacement provided
      } else {
        setLoading(false)
        setHasProfile(false)
        setHasOrganization(false)

        if (!['/login', '/register', '/reset-password'].includes(window.location.pathname)) {
          setLocation('/login')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [setLocation])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      console.log('Attempting to sign in with:', email)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      console.log('Sign in response:', { data, error })

      if (error) {
        console.error('Sign in error:', error)
        let errorMessage = "Invalid email or password"
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = "Invalid email or password. Please try again."
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage = "Please verify your email before logging in."
        }

        toast({
          variant: "destructive",
          title: "Login failed",
          description: errorMessage
        })
        return
      }

      if (data.user) {
        console.log('Successfully signed in user:', data.user.email)
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in."
        })
      }
    } catch (error: any) {
      console.error('Unexpected login error:', error)
      toast({
        variant: "destructive",
        title: "Login error",
        description: "An unexpected error occurred. Please try again."
      })
    } finally {
      setLoading(false)
    }
  }

  return {
    user,
    loading,
    hasProfile,
    hasOrganization,
    signIn
  }
}