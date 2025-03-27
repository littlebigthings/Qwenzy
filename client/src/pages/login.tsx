import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { AuthForm } from "@/components/auth-form";
import { BackgroundPattern } from "@/components/background-pattern";

export default function Login() {
  const { user, loading, signIn } = useAuth();
  const [, setLocation] = useLocation();
  const [error, setError] = useState("");
  
  // Check for invitation parameters
  useEffect(() => {
    // We don't need to store these here - they'll be handled by useAuth after login
    // We just log them for debugging purposes
    const searchParams = new URLSearchParams(window.location.search);
    const invitation = searchParams.get('invitation');
    const orgId = searchParams.get('organization');

    if (invitation === 'true' && orgId) {
      console.log("[LoginPage] Invitation detected:", { orgId });
    }
  }, []);

  useEffect(() => {
    console.log("[LoginPage] Page mounted, auth state:", {
      hasUser: !!user,
      isLoading: loading,
      timestamp: new Date().toISOString(),
    })

    if (user) {
      console.log("[LoginPage] User already logged in, redirecting to home")
      setLocation("/")
    }
  }, [user, setLocation])

  const handleSubmit = async (data: { email: string; password: string }) => {
    try {
      setError("");
      await signIn(data.email, data.password);
      // Don't redirect here - let the useAuth hook handle it based on invitation status
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Invalid email or password");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden">
      <BackgroundPattern />
      <div className="w-full max-w-md z-10 p-6 bg-white/90 backdrop-blur-sm shadow-xl rounded-xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-primary">Welcome Back</h1>
          <p className="text-gray-600 mt-2">
            Sign in to your account to continue
          </p>
        </div>

        <AuthForm mode="login" onSubmit={handleSubmit} error={error} />

        <div className="mt-6 space-y-2">
          <p className="text-center text-sm">
            <Link href="/forgot-password" className="text-primary font-medium hover:underline">
              Forgot your password?
            </Link>
          </p>
          <p className="text-center text-sm">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
