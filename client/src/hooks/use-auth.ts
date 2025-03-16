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
        checkUserStatus(session.user)
      } else {
        setLoading(false)
      }
    })

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      setUser(session?.user ?? null)

      if (session?.user) {
        checkUserStatus(session.user)
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

  const checkUserStatus = async (user: User) => {
    try {
      const domain = user.email?.split('@')[1]
      if (!domain) {
        throw new Error('Invalid email domain')
      }

      // Check for organization first
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('domain', domain)
        .single()

      if (orgError && orgError.code !== 'PGRST116') {
        console.error('Error checking organization:', orgError)
      }

      // Then check for profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error checking profile:', profileError)
      }

      const hasValidOrg = !!org
      const hasValidProfile = !!profile

      setHasOrganization(hasValidOrg)
      setHasProfile(hasValidProfile)

      setLoading(false)

      // Only redirect if we're on a path that requires these checks
      const currentPath = window.location.pathname
      if (!hasValidProfile || !hasValidOrg) {
        if (currentPath !== '/profile-setup') {
          setLocation('/profile-setup')
        }
      } else if (currentPath === '/profile-setup') {
        setLocation('/')
      }
    } catch (error) {
      console.error('Error checking user status:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to check user status"
      })
      setLoading(false)
    }
  }

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

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true)
      console.log('Signing up with:', email)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        }
      })

      if (error) throw error

      if (data?.user?.identities?.length === 0) {
        toast({
          title: "Email already registered",
          description: "This email is already registered. Please try logging in instead.",
          variant: "destructive"
        })
        setLocation('/login')
        return
      }

      toast({
        title: "Signup initiated",
        description: "Please check your email for the verification link."
      })
    } catch (error: any) {
      console.error('Sign up error:', error)
      toast({
        variant: "destructive",
        title: "Error signing up",
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setUser(null)
      setHasProfile(false)
      setHasOrganization(false)

      toast({
        title: "Signed out",
        description: "You have been successfully signed out."
      })
      setLocation('/login')
    } catch (error: any) {
      console.error('Sign out error:', error)
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message
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
    signIn,
    signUp,
    signOut
  }
}