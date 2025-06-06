import { useAuth } from "@/hooks/use-auth"
import { AuthForm } from "@/components/auth-form"
import { Link, useLocation } from "wouter"
import { Card } from "@/components/ui/card"
import logo from "../assets/logo.png"
import { BackgroundPattern } from "@/components/background-pattern"
import { useEffect, useState } from "react"

export default function Login() {
  const { signIn, user, loading } = useAuth()
  const [, setLocation] = useLocation()
  const [error, setError] = useState<string>("")

  useEffect(() => {
    console.log("[LoginPage] Page mounted, auth state:", {
      hasUser: !!user,
      isLoading: loading,
      timestamp: new Date().toISOString(),
    })

    if (user) {
      console.log("[LoginPage] User already logged in, redirecting to home")
      setLocation("/")
    }
  }, [user, setLocation])

  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    if (loading) {
      console.log("[LoginPage] Login attempted while loading, ignoring")
      return
    }

    try {
      setError("")
      console.log("[LoginPage] Login attempt started:", {
        email,
        timestamp: new Date().toISOString()
      })

      if (!email || !password) {
        throw new Error("Email and password are required")
      }

      console.log("[LoginPage] Calling signIn function")
      await signIn(email, password)

    } catch (error: any) {
      console.error("[LoginPage] Login error:", {
        message: error.message,
        code: error.code,
        status: error.status,
        timestamp: new Date().toISOString()
      })

      if (error.message.includes('not registered')) {
        setError("User not allowed")
      } else if (error.message.includes('incorrect')) {
        setError("Login failed")
      } else {
        setError(error.message)
      }
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
          <h2 className="text-2xl font-semibold text-gray-900">Welcome back!</h2>
          <p className="text-base text-gray-600 mt-2">
            Please sign in to your account
          </p>
        </div>

        <AuthForm mode="login" onSubmit={handleLogin} error={error} />

        <div className="mt-6 text-sm text-center">
          <span className="text-gray-600">New on our platform?</span>{" "}
          <Link href="/register" className="text-[#407c87] hover:text-[#386d77] font-medium">
            Create an account
          </Link>
        </div>
      </Card>
    </div>
  )
}