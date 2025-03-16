import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Supabase Configuration:', {
  url: supabaseUrl ? 'Present' : 'Missing',
  anonKey: supabaseAnonKey ? 'Present' : 'Missing'
})

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
    console.log('Testing Supabase connection...')

    // Test auth setup
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('Auth Session Check:', {
      success: !sessionError,
      error: sessionError?.message,
      hasSession: !!session,
      userEmail: session?.user?.email
    })

    // Test localStorage
    const testKey = 'supabase-test'
    try {
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      console.log('LocalStorage: Working')
    } catch (e) {
      console.error('LocalStorage Error:', e)
    }

  } catch (err) {
    console.error('Supabase initialization error:', err)
  }
}

testConnection()