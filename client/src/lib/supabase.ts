import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

console.log('Initializing Supabase client with URL:', supabaseUrl)

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'qwenzy-auth-token',
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Log initial auth state
supabase.auth.getSession().then(({ data: { session } }) => {
  console.log('Initial Supabase session:', session?.user?.email || 'No session')
})