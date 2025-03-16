import { useAuth } from "@/hooks/use-auth";
import { AuthForm } from "@/components/auth-form";
import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import logo from "../assets/logo.png";
import { BackgroundPattern } from "@/components/background-pattern";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { signIn, user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    console.log('Login page mounted. Current auth state:', {
      hasUser: !!user,
      isLoading: loading
    });

    if (user) {
      console.log("User already logged in, redirecting to home");
      setLocation("/");
    }
  }, [user, setLocation]);

  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    if (loading) {
      console.log('Login attempted while loading, ignoring');
      return;
    }

    try {
      console.log("Login attempt starting for:", email);
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      await signIn(email, password);

      console.log("Login successful, redirecting...");
      toast({
        title: "Success",
        description: "Login successful!",
      });
      window.location.href = "/";

    } catch (error: any) {
      console.error("Login error details:", {
        message: error.message,
        code: error.code,
        status: error.status
      });

      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Failed to sign in. Please check your credentials and try again.",
      });
    }
  };

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
          <h2 className="text-2xl font-semibold text-gray-900">Welcome back!</h2>
          <p className="text-base text-gray-600 mt-2">
            Please sign in to your account
          </p>
        </div>

        <AuthForm mode="login" onSubmit={handleLogin} />

        <div className="mt-6 text-sm text-center">
          <span className="text-gray-600">New on our platform?</span>{" "}
          <Link href="/register" className="text-[#407c87] hover:text-[#386d77] font-medium">
            Create an account
          </Link>
        </div>
      </Card>
    </div>
  );
}