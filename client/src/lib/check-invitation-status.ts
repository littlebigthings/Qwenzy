import { supabase } from './supabase';

/**
 * Check if a user has an invitation for any organization
 * @param email User's email to check for invitations
 * @returns Object with invitation status and organization ID if found
 */
export async function checkUserInvitations(email: string) {
  if (!email) return { hasInvitation: false };

  try {
    // Check for any pending invitations for this email
    const { data, error } = await supabase
      .from('invitations')
      .select('organization_id, accepted')
      .eq('email', email)
      .eq('accepted', false);
    
    if (error) {
      console.error('Error checking invitations:', error);
      return { hasInvitation: false };
    }
    
    // If there's at least one invitation, return the first one
    if (data && data.length > 0) {
      return { 
        hasInvitation: true, 
        organizationId: data[0].organization_id 
      };
    }
    
    return { hasInvitation: false };
  } catch (err) {
    console.error('Error in checkUserInvitations:', err);
    return { hasInvitation: false };
  }
}

/**
 * Add a user's invitation to the database
 * @param email User's email
 * @param organizationId Organization they're invited to
 * @param inviterEmail Email of the person who sent the invitation (optional)
 */
export async function addUserInvitation(
  email: string, 
  organizationId: string,
  inviterEmail?: string
) {
  if (!email || !organizationId) return { success: false };

  try {
    // First check if the invitation already exists
    const { data } = await supabase
      .from('invitations')
      .select('id')
      .eq('email', email)
      .eq('organization_id', organizationId)
      .limit(1);
    
    // If invitation already exists, no need to add it again
    if (data && data.length > 0) {
      return { success: true, exists: true };
    }
    
    // Add the invitation
    const { error } = await supabase
      .from('invitations')
      .insert({
        email,
        organization_id: organizationId,
        invited_by: inviterEmail || null,
        accepted: false,
        auto_join: true
      });
    
    if (error) {
      console.error('Error adding invitation:', error);
      return { success: false };
    }
    
    return { success: true };
  } catch (err) {
    console.error('Error in addUserInvitation:', err);
    return { success: false };
  }
}
