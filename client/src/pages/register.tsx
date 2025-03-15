import { useAuth } from "@/hooks/use-auth"
import { AuthForm } from "@/components/auth-form"
import { Link } from "wouter"
import { Card } from "@/components/ui/card"
import logo from "../assets/logo.png"
import bg from "../assets/bg.png"

export default function Register() {
  const { signUp } = useAuth()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#f8fafc]">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 bg-repeat opacity-5"
        style={{
          backgroundImage: `url(${bg})`,
          backgroundSize: '800px',
        }}
      />

      <div className="w-full max-w-md text-center mb-8">
        <img 
          src={logo} 
          alt="Qwenzy" 
          className="h-8 mx-auto mb-8"
        />
      </div>

      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-900">Welcome to Qwenzy</h2>
          <p className="text-base text-gray-600 mt-2">
            Use an organization email and create a password to easily collaborate with teammates
          </p>
        </div>

        <AuthForm mode="register" onSubmit={async ({ email, password }) => {
          await signUp(email, password)
        }} />

        <div className="mt-6 text-sm text-center">
          <p>
            Already have an account?{" "}
            <Link href="/login" className="text-[#407c87] hover:text-[#386d77] font-medium">
              Log in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}