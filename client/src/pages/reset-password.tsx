import { useState } from 'react'
import { useLocation } from 'wouter'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import logo from "../assets/logo.png"
import { BackgroundPattern } from "@/components/background-pattern"

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [, setLocation] = useLocation()
  const { toast } = useToast()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match')
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      toast({
        title: "Success",
        description: "Your password has been updated successfully"
      })

      // Redirect to login
      setLocation('/login')

    } catch (error: any) {
      console.error('Reset password error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to reset password"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#f8fafc]">
      <BackgroundPattern />

      <div className="relative z-10 w-full max-w-md text-center mb-8">
        <img 
          src={logo} 
          alt="Qwenzy" 
          className="h-8 mx-auto mb-8"
        />
      </div>

      <Card className="relative z-10 w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-900">Reset Password</h2>
          <p className="text-base text-gray-600 mt-2">
            Enter your new password
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-6">
          <Input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 px-4 rounded-md border-gray-200 focus:border-[#407c87] focus:ring-[#407c87]"
            required
          />

          <Input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-12 px-4 rounded-md border-gray-200 focus:border-[#407c87] focus:ring-[#407c87]"
            required
          />

          <Button
            type="submit"
            className="w-full h-12 bg-[#407c87] hover:bg-[#386d77] text-white font-medium rounded-md"
            disabled={loading}
          >
            Set new Password
          </Button>
        </form>

        <div className="mt-6 text-sm text-center">
          <button 
            onClick={() => setLocation('/login')}
            className="text-[#407c87] hover:text-[#386d77] font-medium"
          >
            Back to log in
          </button>
        </div>
      </Card>
    </div>
  )
}