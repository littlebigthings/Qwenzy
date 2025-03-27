import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Link, useLocation } from "wouter"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import logo from "../assets/logo.png"
import { BackgroundPattern } from "@/components/background-pattern"
import { useVerificationStore } from "@/lib/verification-store"
import { supabase } from "@/lib/supabase"
import { getInviterInfo, addInvitation } from "@/lib/invitation-handler"

export default function Register() {
  const { signUp } = useAuth()
  const [, setLocation] = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isInvitation, setIsInvitation] = useState(false)
  const [invitationOrgId, setInvitationOrgId] = useState<string | null>(null)
  const [inviterId, setInviterId] = useState<string | null>(null)
  const setEmail = useVerificationStore(state => state.setEmail)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false
  })
  
  // Check for invitation parameters in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const invitation = searchParams.get('invitation');
    const email = searchParams.get('email');
    const orgId = searchParams.get('organization');
    const ib = searchParams.get('ib'); // inviter ID/reference
    
    if (invitation === 'true' && orgId) {
      setIsInvitation(true);
      setInvitationOrgId(orgId);
      
      if (email) {
        setFormData(prev => ({
          ...prev,
          email
        }));
      }
      
      if (ib && ib !== 'none') {
        setInviterId(ib);
      }
    }
  }, []);
  
  // Handle case when user is invited by another user (with user ID)
  useEffect(() => {
    const handleInviterLookup = async () => {
      if (isInvitation && invitationOrgId && inviterId && formData.email) {
        try {
          console.log("Looking up inviter profile for ID:", inviterId);
          
          // Get inviter's email using helper function
          const inviterResponse = await getInviterInfo(inviterId);
            
          if (!inviterResponse.success) {
            console.error("Error fetching inviter info:", inviterResponse.error);
            return;
          }
          
          const inviterEmail = inviterResponse.email;
          if (inviterEmail) {
            console.log("Found inviter email:", inviterEmail);
            
            // Add invitation to database using helper function
            const addResult = await addInvitation(formData.email, invitationOrgId, inviterEmail);
            
            if (!addResult.success) {
              console.error("Error creating invitation:", addResult.error);
            } else {
              console.log("Created/updated invitation in database");
            }
          }
        } catch (error) {
          console.error("Error in inviter lookup:", error);
        }
      }
    };
    
    handleInviterLookup();
  }, [isInvitation, invitationOrgId, inviterId, formData.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      setError("")

      if (!formData.email || !formData.password) {
        throw new Error("All fields are required")
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords do not match")
      }

      if (!formData.acceptTerms) {
        throw new Error("You must accept the terms and privacy policy")
      }

      // Store the email in verification store so it can be accessed on the verify page
      setEmail(formData.email)
      
      await signUp(formData.email, formData.password)
      
      // Pass invitation parameters directly in the URL
      if (isInvitation && invitationOrgId) {
        setLocation(`/verify-email?invitation=true&organization=${invitationOrgId}`)
      } else {
        setLocation('/verify-email')
      }

    } catch (error: any) {
      console.error('Registration error:', error)
      setError(error.message)
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
          <h2 className="text-2xl font-semibold text-gray-900">Welcome to Qwenzy!</h2>
          <p className="text-base text-gray-600 mt-2">
            Use an organization email and create a password to easily collaborate with teammates
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-md bg-red-50 text-red-500 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input
                type="email"
                placeholder="example@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-12 px-4 rounded-md border-gray-200 focus:border-[#407c87] focus:ring-[#407c87]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter password</label>
              <Input
                type="password"
                placeholder="••••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="h-12 px-4 rounded-md border-gray-200 focus:border-[#407c87] focus:ring-[#407c87]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <Input
                type="password"
                placeholder="••••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="h-12 px-4 rounded-md border-gray-200 focus:border-[#407c87] focus:ring-[#407c87]"
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 mt-6">
            <Checkbox
              id="terms"
              checked={formData.acceptTerms}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, acceptTerms: checked as boolean })
              }
              className="border-gray-300 rounded"
            />
            <label htmlFor="terms" className="text-sm text-gray-600">
              I agree to{" "}
              <Link href="/privacy" className="text-[#407c87] hover:text-[#386d77] font-medium">
                privacy policy
              </Link>
              {" & "}
              <Link href="/terms" className="text-[#407c87] hover:text-[#386d77] font-medium">
                terms
              </Link>
            </label>
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-[#407c87] hover:bg-[#386d77] text-white font-medium rounded-md mt-6"
            disabled={loading}
          >
            Sign up
          </Button>
        </form>

        <div className="mt-6 text-sm text-center">
          <span className="text-gray-600">Already have an account? </span>
          <Link href="/login" className="text-[#407c87] hover:text-[#386d77] font-medium">
            Log in
          </Link>
        </div>
      </Card>
    </div>
  )
}
