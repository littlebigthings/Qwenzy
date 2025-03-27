import { useEffect, useState } from "react"
import { Link, useLocation } from "wouter"
import logo from "../assets/logo.png"
import { Button } from "@/components/ui/button"
import { BackgroundPattern } from "@/components/background-pattern"
import { useVerificationStore } from "@/lib/verification-store"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { checkInvitation, markInvitationAsAccepted } from "@/lib/invitation-handler"
import { useToast } from "@/hooks/use-toast"

export default function VerifyEmail() {
  const email = useVerificationStore(state => state.email)
  const { user } = useAuth()
  const { toast } = useToast()
  const [isInvitation, setIsInvitation] = useState(false)
  const [invitationOrgId, setInvitationOrgId] = useState<string | null>(null)
  const [inviterId, setInviterId] = useState<string | null>(null)
  const [processingInvitation, setProcessingInvitation] = useState(false)
  
  // Get invitation parameters from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const invitation = searchParams.get('invitation');
    const orgId = searchParams.get('organization');
    const ib = searchParams.get('ib'); // inviter ID/reference
    
    if (invitation === 'true' && orgId) {
      setIsInvitation(true);
      setInvitationOrgId(orgId);
      
      if (ib && ib !== 'none') {
        setInviterId(ib);
      }
    }
  }, []);
  
  // Check if user has verified email and handle invitation process
  useEffect(() => {
    const handleVerification = async () => {
      if (!user || !isInvitation || !invitationOrgId || processingInvitation) return;
      
      try {
        setProcessingInvitation(true);
        console.log("User verified email, processing invitation...");
        
        // Check if user exists in invitation database
        if (user.email) {
          const invitationExists = await checkInvitation(user.email, invitationOrgId);
          
          if (invitationExists) {
            console.log("Found invitation, marking as accepted");
            await markInvitationAsAccepted(user.email, invitationOrgId);
            
            // Store the invitation data in localStorage for the onboarding flow
            localStorage.setItem('invitation', 'true');
            localStorage.setItem('invitationOrgId', invitationOrgId);
            
            toast({
              title: "Invitation Accepted",
              description: "You've been successfully added to the organization!"
            });
          } else {
            console.log("No invitation found in database");
          }
        }
      } catch (error) {
        console.error("Error processing invitation:", error);
      } finally {
        setProcessingInvitation(false);
      }
    };
    
    handleVerification();
  }, [user, isInvitation, invitationOrgId, processingInvitation]);
  
  const handleResendLink = async () => {
    try {
      if (!email) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No email address found to resend verification"
        });
        return;
      }
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email
      });
      
      if (error) throw error;
      
      toast({
        title: "Verification Link Sent",
        description: "A new verification link has been sent to your email"
      });
    } catch (error: any) {
      console.error("Error resending verification:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to resend verification link"
      });
    }
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
          <Link 
            href={isInvitation && invitationOrgId 
              ? `/register?invitation=true&organization=${invitationOrgId}` 
              : "/register"
            } 
            className="text-[#407c87] hover:text-[#386d77] font-medium"
          >
            Sign up with a different email
          </Link>
        </div>
      </div>
    </div>
  )
}
