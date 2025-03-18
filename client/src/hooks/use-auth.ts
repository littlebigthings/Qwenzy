import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

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

      // If user is authenticated, redirect to organization setup
      if (session?.user) {
        setLocation("/organization-setup");
      }
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

      if (event === "SIGNED_IN" || event === "SIGNED_UP") {
        console.log("[useAuth] Sign in/up successful, redirecting to organization setup");
        setLocation("/organization-setup");
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

      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (!data?.user) {
        throw new Error("No user data received after successful sign in");
      }

      return data.user;
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

  return {
    user,
    loading,
    signIn,
    signUp,
  };
}