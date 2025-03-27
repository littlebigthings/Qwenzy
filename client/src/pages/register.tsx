import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AuthForm } from "@/components/auth-form";
import { useVerificationStore } from "@/lib/verification-store";
import { BackgroundPattern } from "@/components/background-pattern";
import { addUserInvitation } from "@/lib/check-invitation-status";

export default function Register() {
  const { signUp, loading } = useAuth();
  const [error, setError] = useState("");
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const setEmail = useVerificationStore((state) => state.setEmail);
  const [, setLocation] = useLocation();

  const handleSubmit = async (data: { email: string; password: string }) => {
    try {
      setError("");
      await signUp(data.email, data.password);
      
      // Check URL for invitation parameters
      const searchParams = new URLSearchParams(window.location.search);
      const invitation = searchParams.get('invitation');
      const orgId = searchParams.get('organization');
      
      // If there are invitation params, add to the database
      if (invitation === 'true' && orgId) {
        await addUserInvitation(data.email, orgId);
      }
      
      // Store email for verification page
      setEmail(data.email);
      setRegistrationComplete(true);
      
      // Show toast and redirect to verify email page
      toast({
        title: "Registration successful",
        description: "Please check your email to verify your account.",
      });
      
      // Redirect to verify email page
      setTimeout(() => {
        setLocation("/verify-email");
      }, 500);
    } catch (err: any) {
      console.error("Registration error:", err);
      
      if (err.message.includes("already registered")) {
        setError("Email already registered. Please sign in instead.");
      } else {
        setError(err.message || "Failed to register. Please try again.");
      }
    }
  };

  // If registration is complete, don't show form
  if (registrationComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center relative overflow-hidden">
        <BackgroundPattern />
        <div className="w-full max-w-md z-10 p-6 bg-white/90 backdrop-blur-sm shadow-xl rounded-xl space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-primary">Check Your Email</h1>
            <p className="text-gray-600 mt-2">
              We've sent a verification link to your email address.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden">
      <BackgroundPattern />
      <div className="w-full max-w-md z-10 p-6 bg-white/90 backdrop-blur-sm shadow-xl rounded-xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-primary">Create an Account</h1>
          <p className="text-gray-600 mt-2">
            Sign up to start using our platform
          </p>
        </div>

        <AuthForm mode="register" onSubmit={handleSubmit} error={error} />

        <p className="text-center mt-4 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
