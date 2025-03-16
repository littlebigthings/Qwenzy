import { Link } from "wouter"
import logo from "../assets/logo.png"
import { Button } from "@/components/ui/button"
import { BackgroundPattern } from "@/components/background-pattern"
import { useVerificationStore } from "@/lib/verification-store"

export default function VerifyEmail() {
  const email = useVerificationStore(state => state.email)
  const handleResendLink = async () => {
    // TODO: Implement resend verification logic
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative bg-[#f8fafc]">
      <BackgroundPattern />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md text-center mb-8">
        <img 
          src={logo} 
          alt="Qwenzy" 
          className="h-8 mx-auto mb-8"
        />
      </div>

      <div className="relative z-10 w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900">Verify your email</h2>
          <p className="text-base text-gray-600 mt-4">
            Account activation link sent to your email address:
            <br />
            <span className="font-medium text-gray-900 mt-2 block">{email}</span>
            <br />
            Please follow the link inside to continue.
          </p>
        </div>

        <div className="mt-8">
          <Button 
            onClick={handleResendLink}
            className="w-full h-12 bg-[#407c87] hover:bg-[#386d77] text-white font-medium rounded-md"
          >
            Resend link
          </Button>
        </div>

        <div className="mt-4 text-sm text-center">
          <span className="text-gray-600">Not your email?</span>{" "}
          <Link href="/register" className="text-[#407c87] hover:text-[#386d77] font-medium">
            Sign up with a different email
          </Link>
        </div>
      </div>
    </div>
  )
}