import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

console.log('Initializing Supabase client with URL:', supabaseUrl)

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'qwenzy-auth-token',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

// Test Supabase connection and log initial auth state
const initializeSupabase = async () => {
  try {
    // Check initial session
    const { data: { session } } = await supabase.auth.getSession()
    console.log('Initial auth state:', session ? 'Logged in' : 'No session')

    if (session?.user) {
      console.log('User is authenticated:', session.user.email)
    }
  } catch (error) {
    console.error('Supabase initialization error:', error)
  }
}

initializeSupabase()