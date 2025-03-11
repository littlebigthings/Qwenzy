import { useAuth } from "@/hooks/use-auth"
import { AuthForm } from "@/components/auth-form"
import { Link } from "wouter"
import { Card } from "@/components/ui/card"

export default function Register() {
  const { signUp } = useAuth()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent mb-2">
          Qwenzy
        </h1>
        <p className="text-sm text-gray-600">
          Create your account to get started
        </p>
      </div>
      <Card className="w-full max-w-md p-6">
        <AuthForm mode="register" onSubmit={async ({ email, password }) => {
          await signUp(email, password)
        }} />
        <div className="mt-4 text-sm text-gray-600 text-center">
          <Link href="/login" className="text-blue-600 hover:underline">
            Already have an account? Sign in
          </Link>
        </div>
      </Card>
      <div className="mt-4 text-sm text-gray-600 max-w-md text-center">
        <p>
          By signing up, you agree to receive a confirmation email to verify your account.
          Please check your email (including spam folder) after registration.
        </p>
      </div>
    </div>
  )
}