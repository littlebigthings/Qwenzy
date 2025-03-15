import { useAuth } from "@/hooks/use-auth"
import { AuthForm } from "@/components/auth-form"
import { Link } from "wouter"
import logo from "../assets/logo.png"
import bg from "../assets/bg.png"

export default function Login() {
  const { signIn } = useAuth()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative bg-[#f8fafc]">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 bg-repeat opacity-5"
        style={{
          backgroundImage: `url(${bg})`,
          backgroundSize: '800px',
        }}
      />

      <div className="w-full max-w-md text-center mb-8 relative">
        <img 
          src={logo} 
          alt="Qwenzy" 
          className="h-8 mx-auto mb-8"
        />
      </div>

      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 relative">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-900">Welcome to Qwenzy!</h2>
          <p className="text-base text-gray-600 mt-2">
            Please sign in to your account and start the adventure
          </p>
        </div>

        <AuthForm mode="login" onSubmit={async ({ email, password }) => {
          await signIn(email, password)
        }} />

        <div className="mt-6 text-sm text-center space-x-1">
          <span className="text-gray-600">New on our platform?</span>
          <Link href="/register" className="text-[#407c87] hover:text-[#386d77] font-medium">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  )
}