import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  // Get the deployment URL using Replit domain
  const getRedirectUrl = () => {
    if (typeof window === "undefined") return "";

    // Check if we're on Replit deployment
    if (window.location.hostname.endsWith(".replit.app")) {
      return window.location.origin;
    } else {
      return "http://localhost:3000";
    }
  };

  useEffect(() => {
    console.log("[useAuth] Hook initializing...");

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log("[useAuth] Initial session check:", {
        hasSession: !!session,
        userEmail: session?.user?.email,
        error: error?.message,
        timestamp: new Date().toISOString(),
      });

      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[useAuth] Auth state changed:", {
        event,
        userEmail: session?.user?.email,
        timestamp: new Date().toISOString(),
      });

      setUser(session?.user ?? null);

      if (event === "SIGNED_IN") {
        console.log("[useAuth] Sign in successful, redirecting to home");
        setLocation("/");
      } else if (event === "SIGNED_OUT") {
        console.log("[useAuth] Sign out detected, redirecting to login");
        setLocation("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [setLocation]);

  const signIn = async (email: string, password: string) => {
    try {
      console.log("[useAuth] Starting sign in process:", {
        email,
        hasPassword: !!password,
        timestamp: new Date().toISOString(),
      });

      setLoading(true);

      // Check credentials
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      // First check if email exists
      const {
        data: { users },
        error: usersError,
      } = await supabase.auth.admin.listUsers({
        filter: {
          email: email,
        },
      });

      if (usersError) throw usersError;

      if (!users || users.length === 0) {
        throw new Error("Email address is not registered");
      }

      // Attempt sign in
      console.log("[useAuth] Calling Supabase auth.signInWithPassword...");
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log("[useAuth] Sign in response:", {
        success: !error,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        error: error?.message,
        timestamp: new Date().toISOString(),
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Password is incorrect");
        }
        throw error;
      }

      if (!data?.user) {
        throw new Error("No user data received after successful sign in");
      }
    } catch (error: any) {
      console.error("[useAuth] Sign in error:", {
        message: error.message,
        code: error.code,
        status: error.status,
        timestamp: new Date().toISOString(),
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log(
        "[useAuth] Starting sign up with redirect URL:",
        getRedirectUrl(),
      );

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${getRedirectUrl()}/verify-email`,
        },
      });

      if (error) throw error;

      if (data?.user?.identities?.length === 0) {
        throw new Error("Email already registered. Please sign in instead.");
      }

      return data.user;
    } catch (error: any) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    signIn,
    signUp,
  };
}
