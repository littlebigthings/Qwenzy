import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import { checkUserInvitations, addUserInvitation } from "@/lib/check-invitation-status";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasOrganization, setHasOrganization] = useState<boolean>(false);
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

      // If user is authenticated, check for invitations and redirect
      if (session?.user) {
        handleUserAuthentication(session.user);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[useAuth] Auth state changed:", {
        event,
        userEmail: session?.user?.email,
        timestamp: new Date().toISOString(),
      });

      setUser(session?.user ?? null);

      // Debounce navigation on sign in/up
      if ((event === "SIGNED_IN" || event === "SIGNED_UP") && location !== "/organization-setup") {
        console.log("[useAuth] Sign in/up successful");
        
        if (session?.user) {
          handleUserAuthentication(session.user);
        }
      } else if (event === "SIGNED_OUT") {
        console.log("[useAuth] Sign out detected, redirecting to login");
        setLocation("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [setLocation]);

  // Handle authenticated user - check for invitations
  const handleUserAuthentication = async (user: User) => {
    if (!user.email) return;
    
    try {
      // First check the URL for invitation parameters
      const searchParams = new URLSearchParams(window.location.search);
      const invitation = searchParams.get('invitation');
      const orgId = searchParams.get('organization');
      
      // If there are invitation params in the URL, add to the database
      if (invitation === 'true' && orgId) {
        await addUserInvitation(user.email, orgId);
      }
      
      // Check if the user has any invitations in the database
      const { hasInvitation, organizationId } = await checkUserInvitations(user.email);
      
      // Redirect with invitation params if the user has an invitation
      if (hasInvitation && organizationId) {
        setTimeout(() => setLocation(`/organization-setup?invitation=true&organization=${organizationId}`), 100);
      } else {
        setTimeout(() => setLocation("/organization-setup"), 100);
      }
    } catch (error) {
      console.error("[useAuth] Error handling user authentication:", error);
      setTimeout(() => setLocation("/organization-setup"), 100);
    }
  };

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
