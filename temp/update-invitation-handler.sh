#!/bin/bash

# Create a new version of invitation-handler.ts
cat > temp/new-invitation-handler.ts << 'INVITATIONHANDLER'
/**
 * Invitation Handler
 * Functions for managing user invitations to organizations
 */

import { supabase } from "./supabase";

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
    // Check if an invitation already exists for this email and organization
    const { data: existingInvitations, error: checkError } = await supabase
      .from('invitations')
      .select('id')
      .eq('email', email)
      .eq('organization_id', organizationId)
      .eq('accepted', false);
      
    if (checkError) {
      console.error("Error checking existing invitations:", checkError);
      return { success: false, error: checkError.message };
    }
    
    // If invitation already exists, don't create a new one
    if (existingInvitations && existingInvitations.length > 0) {
      console.log("Invitation already exists for this email and organization");
      return { success: true };
    }
    
    // Store invitation in database
    const { error: insertError } = await supabase
      .from('invitations')
      .insert({
        email,
        organization_id: organizationId,
        invited_by: inviterEmail,
        invited_by_user_id: inviterId,
        accepted: false
      });
      
    if (insertError) {
      console.error("Error storing invitation:", insertError);
      return { success: false, error: insertError.message };
    }
    
    // Generate invitation URL
    const invitationUrl = `${window.location.origin}/register?invitation=true&organization=${organizationId}&ib=${inviterId || 'none'}`;
    
    // TODO: In a real application, would call an API to send the email
    // For demo purposes, log the invitation URL
    console.log("Invitation URL:", invitationUrl);
    console.log("Would send email to:", email);
    console.log("From:", inviterEmail);
    console.log("Organization:", organizationName);
    
    return { success: true };
  } catch (error: any) {
    console.error("Error sending invitation:", error);
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
      .maybeSingle();
    
    if (error) {
      console.error("Error checking invitation:", error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error("Error checking invitation:", error);
    return false;
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
      console.error("Error marking invitation as accepted:", error);
      return { error: error.message };
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Error marking invitation as accepted:", error);
    return { error: error.message };
  }
}

/**
 * Gets inviter information by user ID
 * @param userId User ID of the inviter
 * @returns Promise resolving to inviter information or error
 */
export async function getInviterInfo(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error("Error getting inviter info:", error);
      return { error: error.message };
    }
    
    return { 
      success: true, 
      data: {
        email: data.email,
        name: data.full_name
      }
    };
  } catch (error: any) {
    console.error("Error getting inviter info:", error);
    return { error: error.message };
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
    const { error } = await supabase
      .from('invitations')
      .insert({
        email,
        organization_id: organizationId,
        invited_by: invitedBy,
        accepted: false
      });
    
    if (error) {
      console.error("Error adding invitation:", error);
      return { success: false, error: error.message };
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

/**
 * Add user to an organization they were invited to
 * @param userId User ID to add to organization
 * @param organizationId Organization ID to add the user to
 * @param email User's email to mark invitation as accepted
 * @returns Promise resolving to success or error
 */
export async function joinInvitedOrganization(userId: string, organizationId: string, email: string) {
  try {
    // First check if the user is already a member
    const { data: existingMembership, error: checkError } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .maybeSingle();
      
    if (checkError) {
      console.error("Error checking existing membership:", checkError);
      return { success: false, error: checkError.message };
    }
    
    // If not a member, add them
    if (!existingMembership) {
      const { error: insertError } = await supabase
        .from('organization_members')
        .insert({
          user_id: userId,
          organization_id: organizationId,
          role: "member"
        });
        
      if (insertError) {
        console.error("Error creating membership:", insertError);
        return { success: false, error: insertError.message };
      }
    }
    
    // Mark invitation as accepted
    const { error: updateError } = await markInvitationAsAccepted(email, organizationId);
    
    if (updateError) {
      return { success: false, error: updateError };
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Error joining organization:", error);
    return { success: false, error: error.message };
  }
}
INVITATIONHANDLER

# Copy the file to the correct location
cp temp/new-invitation-handler.ts client/src/lib/invitation-handler.ts

