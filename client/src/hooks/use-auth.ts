import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useLocation } from 'wouter'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasProfile, setHasProfile] = useState<boolean>(false)
  const { toast } = useToast()
  const [, setLocation] = useLocation()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, session)
      setUser(session?.user ?? null)

      if (session?.user) {
        // Check if user has a profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single()

        setHasProfile(!!profile)

        if (event === 'SIGNED_IN' && !profile) {
          setLocation('/profile-setup')
        } else if (event === 'SIGNED_IN') {
          setLocation('/')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [setLocation])

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            email_confirm_url: `${window.location.origin}/login`
          }
        }
      })

      if (error) throw error

      console.log('Signup response:', data)

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
        description: "We're setting up your account. Please check your email (including spam folder) for the verification link. This may take a few minutes."
      })

    } catch (error: any) {
      console.error('Signup error:', error)
      toast({
        variant: "destructive",
        title: "Error signing up",
        description: error.message
      })
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in."
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error signing in",
        description: error.message
      })
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast({
        title: "Signed out",
        description: "You have been successfully signed out."
      })
      setLocation('/login')
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message
      })
      throw error
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`
      })
      if (error) throw error
      toast({
        title: "Check your email",
        description: "If an account exists with this email, you will receive a password reset link."
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error resetting password",
        description: error.message
      })
      throw error
    } finally {
      setLoading(false)
    }
  }

  return {
    user,
    loading,
    hasProfile,
    signIn,
    signUp,
    signOut,
    resetPassword
  }
}