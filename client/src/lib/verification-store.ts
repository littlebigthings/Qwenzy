import { create } from 'zustand'

type VerificationStore = {
  email: string
  setEmail: (email: string) => void
}

export const useVerificationStore = create<VerificationStore>((set) => ({
  email: '',
  setEmail: (email: string) => set({ email })
}))
