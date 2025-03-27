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
    
    console.log("Looking up user with ID:", userId);
    
    // First try to find profile directly with the user_id
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId);
    
    console.log("Profile query results:", data);
    
    if (error) {
      console.log("Error in profile lookup:", error.message);
      throw new Error(error.message);
    }
    
    // If we found a matching profile, return the email
    if (data && data.length > 0) {
      return { success: true, email: data[0].email };
    } else {
      console.log("No profile found with that user_id. Attempting fallback query.");
      
      // If no match found, try querying user directly if this is a separate table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .maybeSingle();
      
      if (userError) {
        console.log("Error in user lookup:", userError.message);
        return { success: false, error: userError.message };
      }
      
      if (userData && userData.email) {
        return { success: true, email: userData.email };
      }
      
      return { success: false, error: "User not found" };
    }
  } catch (error: any) {
    console.error("Error getting inviter info:", error);
    return { success: false, error: error.message };
  }
}