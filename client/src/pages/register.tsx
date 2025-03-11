import { useAuth } from "@/hooks/use-auth"
import { AuthForm } from "@/components/auth-form"
import { Link } from "wouter"

export default function Register() {
  const { signUp } = useAuth()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent mb-2">
          Qwenzy
        </h1>
      </div>
      <AuthForm mode="register" onSubmit={async ({ email, password }) => {
        await signUp(email, password)
      }} />
      <div className="mt-4 text-sm text-gray-600">
        <Link href="/login" className="text-blue-600 hover:underline">
          Already have an account? Sign in
        </Link>
      </div>
    </div>
  )
}
