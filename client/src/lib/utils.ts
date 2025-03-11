import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function clearStorageAndReload() {
  // Clear all Supabase related storage
  localStorage.removeItem('supabase.auth.token')
  localStorage.removeItem('supabase.auth.refreshToken')
  localStorage.removeItem('supabase.auth.user')

  // Clear any other app-specific storage
  localStorage.clear()

  // Reload the page
  window.location.reload()
}