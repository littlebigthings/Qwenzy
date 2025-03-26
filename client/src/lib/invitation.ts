import { supabase } from './supabase';

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
 * @param organizationId - The ID of the organization
 * @returns Promise resolving to success or error
 */
export async function sendInvitationEmail(
  email: string, 
  organizationName: string,
  inviterName: string,
  organizationId: string
) {
  try {
    const deploymentUrl = getDeploymentUrl();
    const signupUrl = `${deploymentUrl}/register?invitation=true&email=${encodeURIComponent(email)}&organization=${organizationId}`;
    
    // Generate email content
    const emailSubject = `Invitation to join ${organizationName} on Qwenzy`;
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You've been invited to join ${organizationName}</h2>
        <p>${inviterName} has invited you to join their organization on Qwenzy.</p>
        <p>Click the button below to accept the invitation and create your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${signupUrl}" style="background-color: #407c87; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Accept Invitation
          </a>
        </div>
        <p>Or copy and paste this URL into your browser:</p>
        <p>${signupUrl}</p>
        <hr style="border: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #666; font-size: 12px;">
          If you weren't expecting this invitation, you can ignore this email.
        </p>
      </div>
    `;
    
    // Send email using Supabase's email service
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: signupUrl,
      data: {
        invitation: true,
        organizationId,
        organizationName,
        inviterName
      }
    });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
    return { success: false, error: error.message };
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
