import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Initialize and test connection
const testConnection = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    console.log('Supabase Connection Test:', error ? 'Failed' : 'Success')
    console.log('Current Session:', session ? 'Active' : 'None')
  } catch (err) {
    console.error('Supabase initialization error:', err)
  }
}

testConnection()