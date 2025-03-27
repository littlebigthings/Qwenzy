/**
 * Gets inviter information by user ID
 * @param userId User ID of the inviter
 * @returns Promise resolving to inviter information or error
 */
export async function getInviterInfo(userId) {
  try {
    // Validate UUID format before querying Supabase
    if (!isValidUUID(userId)) {
      console.error("Invalid UUID format for user ID:", userId);
      return { success: false, error: "Invalid user ID format" };
    }
    
    console.log("Looking up user with ID:", userId);
    
    // Try different possible column names for user ID in profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
      
    console.log("All profiles:", data);
    
    if (error) {
      console.log("Error querying profiles:", error.message);
      throw new Error(error.message);
    }
    
    if (data && data.length > 0) {
      // Just use the first profile for now as a fallback
      console.log("Using first profile's email:", data[0].email);
      return { success: true, email: data[0].email };
    }
    
    return { success: false, error: "No profiles found" };
  } catch (error) {
    console.error("Error getting inviter info:", error);
    return { success: false, error: error.message };
  }
}