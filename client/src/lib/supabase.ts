import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'supabase.auth.token',
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
})

// Initialize and test connection
const testConnection = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    console.log('Supabase Connection Test:', error ? 'Failed' : 'Success')
    console.log('Current Session:', session ? 'Active' : 'None')
    if (session?.user) {
      console.log('Authenticated user:', session.user.email)
    }
  } catch (err) {
    console.error('Supabase initialization error:', err)
  }
}

testConnection()