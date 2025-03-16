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
    console.log('[useAuth] Hook initializing...')

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('[useAuth] Initial session check:', {
        hasSession: !!session,
        userEmail: session?.user?.email,
        error: error?.message,
        timestamp: new Date().toISOString()
      })

      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[useAuth] Auth state changed:', {
        event,
        userEmail: session?.user?.email,
        timestamp: new Date().toISOString()
      })

      setUser(session?.user ?? null)

      if (event === 'SIGNED_IN') {
        console.log('[useAuth] Sign in successful, redirecting to home')
        setLocation('/')
      } else if (event === 'SIGNED_OUT') {
        console.log('[useAuth] Sign out detected, redirecting to login')
        setLocation('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [setLocation])

  const signIn = async (email: string, password: string) => {
    try {
      console.log('[useAuth] Starting sign in process:', {
        email,
        hasPassword: !!password,
        timestamp: new Date().toISOString()
      })

      setLoading(true)

      // Check credentials
      if (!email || !password) {
        throw new Error('Email and password are required')
      }

      // Attempt sign in
      console.log('[useAuth] Calling Supabase auth.signInWithPassword...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      console.log('[useAuth] Sign in response:', {
        success: !error,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        error: error?.message,
        timestamp: new Date().toISOString()
      })

      if (error) throw error

      if (data?.user) {
        console.log('[useAuth] Successfully signed in user:', {
          email: data.user.email,
          id: data.user.id,
          timestamp: new Date().toISOString()
        })

        toast({
          title: "Success",
          description: "Successfully signed in!"
        })
      } else {
        throw new Error('No user data received after successful sign in')
      }

    } catch (error: any) {
      console.error('[useAuth] Sign in error:', {
        message: error.message,
        code: error.code,
        status: error.status,
        timestamp: new Date().toISOString()
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

  return {
    user,
    loading,
    signIn
  }
}