import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useLocation } from 'wouter'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const [, setLocation] = useLocation()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event)
      setUser(session?.user ?? null)
      if (event === 'SIGNED_IN') {
        setLocation('/')
      }
    })

    return () => subscription.unsubscribe()
  }, [setLocation])

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

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + '/login'
        }
      })
      if (error) throw error
      toast({
        title: "Check your email",
        description: "We've sent you a verification link. Please check your inbox (and spam folder) to verify your account."
      })
    } catch (error: any) {
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
        redirectTo: window.location.origin + '/login'
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
    signIn,
    signUp,
    signOut,
    resetPassword
  }
}