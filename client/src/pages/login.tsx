import { useAuth } from "@/hooks/use-auth"
import { AuthForm } from "@/components/auth-form"
import { Link } from "wouter"

export default function Login() {
  const { signIn } = useAuth()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative bg-slate-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 grid grid-cols-6 gap-4 p-8 opacity-10">
        {Array(36).fill(null).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-slate-200" />
        ))}
      </div>

      <div className="w-full max-w-md text-center mb-8 relative">
        <img 
          src="/client/src/assets/logo.png" 
          alt="Qwenzy" 
          className="h-12 mx-auto"
        />
      </div>

      <div className="w-full max-w-md bg-white rounded-lg shadow-sm p-8 relative">
        <div className="text-center mb-8">
          <h2 className="text-xl font-medium text-gray-900">Welcome to Qwenzy!</h2>
          <p className="text-sm text-gray-500 mt-2">
            Please sign in to your account and start the adventure
          </p>
        </div>

        <AuthForm mode="login" onSubmit={async ({ email, password }) => {
          await signIn(email, password)
        }} />

        <div className="mt-6 text-sm text-center space-x-1">
          <span className="text-gray-500">New on our platform?</span>
          <Link href="/register" className="text-[#407c87] hover:underline font-medium">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  )
}