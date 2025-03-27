import { supabase } from "@/lib/supabase";

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
