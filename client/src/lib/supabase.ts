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
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: true
  }
})

// Log initial auth state (Replaced with onAuthStateChange)
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session ? 'User logged in' : 'No session')
  if (session?.user) {
    console.log('Logged in user:', session.user.email)
  }
})

// Test Supabase connection
supabase.from('profiles').select('count').then(() => {
  console.log('Successfully connected to Supabase')
}).catch(error => {
  console.error('Supabase connection error:', error)
})