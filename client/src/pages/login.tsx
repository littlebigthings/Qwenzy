import { useAuth } from "@/hooks/use-auth"
import { AuthForm } from "@/components/auth-form"
import { Link } from "wouter"

export default function Login() {
  const { signIn } = useAuth()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent mb-2">
          Qwenzy
        </h1>
      </div>
      <AuthForm mode="login" onSubmit={async ({ email, password }) => {
        await signIn(email, password)
      }} />
      <div className="mt-4 text-sm text-gray-600">
        <Link href="/register" className="text-blue-600 hover:underline">
          Don't have an account? Sign up
        </Link>
        <span className="mx-2">•</span>
        <Link href="/reset-password" className="text-blue-600 hover:underline">
          Forgot password?
        </Link>
      </div>
    </div>
  )
}
