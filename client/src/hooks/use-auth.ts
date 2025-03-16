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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial auth check:', session?.user?.email)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      setUser(session?.user ?? null)

      if (event === 'SIGNED_IN') {
        console.log('User signed in:', session?.user?.email)
        setLocation('/')
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out')
        setLocation('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [setLocation])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      console.log('Attempting sign in:', email)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('Sign in error:', error)
        throw error
      }

      if (data?.user) {
        console.log('Sign in successful:', data.user.email)
        toast({
          title: "Success",
          description: "Successfully signed in!"
        })
      }

    } catch (error: any) {
      console.error('Sign in error:', error)
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