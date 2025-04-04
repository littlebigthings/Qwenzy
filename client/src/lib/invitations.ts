import { supabase } from "./supabase";

/**
 * Mark an invitation as accepted
 * @param email Email of the user who accepted the invitation
 * @param organizationId ID of the organization the user was invited to
 */
export async function markInvitationAsAccepted(email: string, organizationId: string): Promise<void> {
  if (!email || !organizationId) {
    console.error("Email or organizationId missing");
    return;
  }

  try {
    const { error } = await supabase
      .from("invitations")
      .update({ 
        status: "accepted", 
        accepted_at: new Date().toISOString()
      })
      .eq("email", email)
      .eq("organization_id", organizationId);

    if (error) throw error;
    
    console.log(`Invitation for ${email} to org ${organizationId} marked as accepted`);
  } catch (error) {
    console.error("Error marking invitation as accepted:", error);
  }
}

/**
 * Send invitations to multiple emails
 * @param emails Array of email addresses to invite
 * @param organizationId ID of the organization to invite to
 * @param inviterId ID of the user sending the invitation
 */
export async function sendInvitations(
  emails: string[], 
  organizationId: string, 
  inviterId: string
): Promise<{success: string[], failed: string[]}> {
  const results = {
    success: [] as string[],
    failed: [] as string[]
  };

  if (!emails.length || !organizationId || !inviterId) {
    console.error("Missing required parameters for sending invitations");
    return results;
  }

  const invitations = emails.map(email => ({
    email: email.trim().toLowerCase(),
    organization_id: organizationId,
    inviter_id: inviterId,
    status: "pending"
  }));

  try {
    const { data, error } = await supabase
      .from("invitations")
      .upsert(invitations, { 
        onConflict: 'email,organization_id',
        ignoreDuplicates: false 
      })
      .select();

    if (error) throw error;
    
    // Track successful invitations
    if (data) {
      results.success = data.map(invite => invite.email);
      results.failed = emails.filter(email => !results.success.includes(email.trim().toLowerCase()));
    }
    
    return results;
  } catch (error) {
    console.error("Error sending invitations:", error);
    results.failed = emails;
    return results;
  }
}

/**
 * Get all invitations for an organization
 * @param organizationId Organization ID
 */
export async function getOrganizationInvitations(organizationId: string) {
  try {
    const { data, error } = await supabase
      .from("invitations")
      .select(`
        *,
        inviter:inviter_id(
          id,
          email,
          profiles(first_name, last_name, avatar_url)
        )
      `)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching organization invitations:", error);
    return [];
  }
}

/**
 * Get all pending invitations for an email
 * @param email User email
 */
export async function getUserPendingInvitations(email: string) {
  if (!email) return [];
  
  try {
    const { data, error } = await supabase
      .from("invitations")
      .select(`
        *,
        organization:organization_id(
          id,
          name,
          logo_url
        ),
        inviter:inviter_id(
          id,
          email,
          profiles(first_name, last_name, avatar_url)
        )
      `)
      .eq("email", email.toLowerCase())
      .eq("status", "pending");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching user invitations:", error);
    return [];
  }
}
