import { useState } from "react"
import { Link } from "wouter"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import logo from "../assets/logo.png"
import { BackgroundPattern } from "@/components/background-pattern"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isEmailSent, setIsEmailSent] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      setError("")
      console.log('[ForgotPassword] Sending reset password email to:', email)

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setIsEmailSent(true)

    } catch (error: any) {
      console.error('[ForgotPassword] Error:', error)
      setError(error.message || "Failed to send reset email")
    } finally {
      setLoading(false)
    }
  }

  if (isEmailSent) {
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
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">Email sent</h2>
            <p className="text-gray-600 mt-2">
              Check your email for the password reset link
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-[#407c87] hover:text-[#386d77] font-medium">
              Back to log in
            </Link>
          </div>
        </Card>
      </div>
    )
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
          <h2 className="text-2xl font-semibold text-gray-900">Forgot Password?</h2>
          <p className="text-base text-gray-600 mt-2">
            Enter your email, and we'll send you instructions to reset your password
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-6">
          {error && (
            <div className="p-4 rounded-md bg-red-50 text-red-500 text-sm">
              {error}
            </div>
          )}

          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 px-4 rounded-md border-gray-200 focus:border-[#407c87] focus:ring-[#407c87]"
            required
          />

          <Button
            type="submit"
            className="w-full h-12 bg-[#407c87] hover:bg-[#386d77] text-white font-medium rounded-md"
            disabled={loading}
          >
            Send Reset Link
          </Button>
        </form>

        <div className="mt-6 text-sm text-center">
          <Link href="/login" className="text-[#407c87] hover:text-[#386d77] font-medium">
            Back to log in
          </Link>
        </div>
      </Card>
    </div>
  )
}