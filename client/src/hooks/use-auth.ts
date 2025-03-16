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
    console.log('Initializing auth hook...')

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('Initial session check:', {
        hasSession: !!session,
        userEmail: session?.user?.email,
        error: error?.message
      })

      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', {
        event,
        userEmail: session?.user?.email,
        timestamp: new Date().toISOString()
      })

      setUser(session?.user ?? null)

      if (event === 'SIGNED_IN') {
        console.log('Sign in successful, redirecting to home')
        setLocation('/')
      } else if (event === 'SIGNED_OUT') {
        console.log('Sign out detected, redirecting to login')
        setLocation('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [setLocation])

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Starting sign in process for:', email)
      setLoading(true)

      // Check if we have the required data
      if (!email || !password) {
        throw new Error('Email and password are required')
      }

      // Attempt to sign in
      console.log('Calling Supabase auth.signInWithPassword...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      console.log('Sign in response:', {
        success: !error,
        hasUser: !!data?.user,
        error: error?.message,
        sessionStatus: data?.session ? 'Present' : 'Missing'
      })

      if (error) throw error

      if (data?.user) {
        console.log('Sign in successful for:', data.user.email)
        toast({
          title: "Success",
          description: "Successfully signed in!"
        })
      } else {
        throw new Error('No user data received after successful sign in')
      }

    } catch (error: any) {
      console.error('Sign in error:', {
        message: error.message,
        code: error.code,
        status: error.status
      })

      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to sign in"
      })
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      console.log('Starting sign up process for:', email)
      setLoading(true)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`
        }
      })

      console.log('Sign up response:', {
        success: !error,
        hasUser: !!data?.user,
        error: error?.message,
        identitiesLength: data?.user?.identities?.length
      })

      if (error) throw error

      if (data?.user) {
        if (data.user.identities?.length === 0) {
          throw new Error('Email already registered. Please sign in instead.')
        }

        console.log('Sign up successful:', data.user.email)
        toast({
          title: "Success",
          description: "Please check your email to verify your account."
        })
        return data.user
      }

    } catch (error: any) {
      console.error('Sign up error:', {
        message: error.message,
        code: error.code,
        status: error.status
      })

      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to sign up"
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
    signUp
  }
}