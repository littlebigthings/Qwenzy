import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasOrganization, setHasOrganization] = useState<boolean>(false);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    console.log("[useAuth] hasOrganization changed:", hasOrganization);
  }, [hasOrganization]);
  
  useEffect(() => {
    console.log("[useAuth] Hook initializing...");

    // Get initial session and check organization status
    const initializeAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      console.log("[useAuth] Initial session check:", {
        hasSession: !!session,
        userEmail: session?.user?.email,
        error: error?.message,
        timestamp: new Date().toISOString(),
      });

      if (session?.user) {
        const { data: memberships } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', session.user.id)
          .limit(1);

        const hasOrg = memberships && memberships.length > 0;
        setHasOrganization(hasOrg);
        console.log("[useAuth] Organization status:", { hasOrganization: hasOrg });
      }

      setUser(session?.user ?? null);
      setLoading(false);

      // Handle redirects after checking organization status
      // if (
      //   session?.user &&
      //   location !== "/organization-selection" &&
      //   location !== "/organization-setup" &&
      //   location !== "/profile-setup" &&
      //   location !== "/"
      // ) {
      //   setLocation("/organization-selection");
      // }
    };

    initializeAuth();

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

      // Debounce navigation on sign in/up
      if (
        (event === "SIGNED_IN" || event === "SIGNED_UP") &&
        location !== "/organization-selection" &&
        location !== "/organization-setup" &&
        location !== "/profile-setup"
      ) {
        console.log(
          "[useAuth] Sign in/up successful, redirecting to organization selection",
        );
        // setTimeout(() => setLocation("/organization-selection"), 100);
      } else if (event === "SIGNED_OUT") {
        console.log("[useAuth] Sign out detected, redirecting to login");
        setLocation("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [setLocation, location]);

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
    hasOrganization,
    setHasOrganization,
    signIn,
    signUp,
  };
}
