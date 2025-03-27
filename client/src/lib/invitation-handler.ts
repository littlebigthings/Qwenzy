import { supabase } from './supabase';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Function to validate UUID format
function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

// Get deployment URL using Replit domain
const getDeploymentUrl = () => {
  if (typeof window === "undefined") return "localhost";

  // Check if we're on Replit deployment
  if (window.location.hostname.endsWith(".replit.app")) {
    return window.location.origin;
  } else {
    return "http://localhost:3000";
  }
};

/**
 * Sends an invitation email to the specified email address
 * @param email - The email address to send the invitation to
 * @param organizationName - The name of the organization
 * @param inviterName - The name of the person sending the invitation
 * @param inviterEmail - Email of the person sending the invitation
 * @param organizationId - The ID of the organization
 * @param inviterId - ID of the user sending the invitation (optional)
 * @returns Promise resolving to success or error
 */
export async function sendInvitationEmail(
  email: string, 
  organizationName: string,
  inviterName: string,
  inviterEmail: string,
  organizationId: string,
  inviterId?: string
) {
  try {
    const deploymentUrl = getDeploymentUrl();
    // Include inviter ID if available, otherwise mark as 'none'
    const inviterParam = inviterId ? inviterId : 'none';
    const signupUrl = `${deploymentUrl}/register?invitation=true&organization=${organizationId}&ib=${inviterParam}&email=${encodeURIComponent(email)}`;
    
    // First, save the invitation to the database
    const { error: insertError } = await supabase
      .from("invitations")
      .insert({
        organization_id: organizationId,
        email: email,
        invited_by: inviterEmail,
        auto_join: true,
        accepted: false
      });
      
    if (insertError) {
      console.error("Error inserting invitation:", insertError);
      // Continue anyway to try sending email
    }
    
    // Since we don't have a dedicated email service set up, we'll use Supabase Auth's password reset
    // functionality as a way to send emails with custom links to our users
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: signupUrl
    });
    
    if (error) {
      console.log(error.message);
      throw new Error(error.message);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
    return { 
      success: false, 
      error: error.message || "Failed to send invitation email. Please try again later."
    };
  }
}

/**
 * Checks if a user was invited to an organization
 * @param email Email address to check
 * @param organizationId Organization ID to check
 * @returns Promise resolving to invitation status
 */
export async function checkInvitation(email: string, organizationId: string) {
  try {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('email', email)
      .eq('organization_id', organizationId)
      .eq('accepted', false)
      .single();
    
    if (error) {
      return { exists: false };
    }
    
    return { exists: true, invitation: data };
  } catch (error) {
    console.error("Error checking invitation:", error);
    return { exists: false };
  }
}

/**
 * Marks an invitation as accepted
 * @param email Email address of the invitation
 * @param organizationId Organization ID of the invitation
 * @returns Promise resolving to success or error
 */
export async function markInvitationAsAccepted(email: string, organizationId: string) {
  try {
    const { error } = await supabase
      .from('invitations')
      .update({ accepted: true })
      .eq('email', email)
      .eq('organization_id', organizationId);
    
    if (error) {
      throw new Error(error.message);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Error marking invitation as accepted:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Gets inviter information by user ID
 * @param userId User ID of the inviter
 * @returns Promise resolving to inviter information or error
 */
export async function getInviterInfo(userId: string) {
  try {
    // Validate UUID format before querying Supabase
    if (!isValidUUID(userId)) {
      console.error("Invalid UUID format for user ID:", userId);
      return { success: false, error: "Invalid user ID format" };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.log(error.message);
      throw new Error(error.message);
    }
    
    return { success: true, email: data?.email };
  } catch (error: any) {
    console.error("Error getting inviter info:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Adds an invitation to the database
 * @param email Invitee email address
 * @param organizationId Organization ID
 * @param invitedBy Email of the inviter
 * @returns Promise resolving to success or error
 */
export async function addInvitation(email: string, organizationId: string, invitedBy: string) {
  try {
    // Ensure organizationId is a valid UUID
    if (!isValidUUID(organizationId)) {
      console.error("Invalid UUID format for organization ID:", organizationId);
      return { success: false, error: "Invalid organization ID format" };
    }

    const { error } = await supabase
      .from('invitations')
      .insert({
        organization_id: organizationId,
        email: email,
        invited_by: invitedBy,
        auto_join: true,
        accepted: false
      });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Error adding invitation:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if user has active invitations
 * @param email User's email address
 * @returns Promise resolving to invitation information or false
 */
export async function checkUserInvitations(email: string) {
  try {
    const { data, error } = await supabase
      .from('invitations')
      .select('organization_id, invited_by')
      .eq('email', email)
      .eq('accepted', false)
      .limit(1);
    
    if (error || !data || data.length === 0) {
      return { hasInvitation: false };
    }
    
    return { 
      hasInvitation: true, 
      organizationId: data[0].organization_id,
      invitedBy: data[0].invited_by
    };
  } catch (error) {
    console.error("Error checking user invitations:", error);
    return { hasInvitation: false };
  }
}
