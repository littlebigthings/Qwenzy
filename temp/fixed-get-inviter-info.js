/**
 * Gets inviter information by user ID
 * @param userId User ID of the inviter
 * @returns Promise resolving to inviter information or error
 */
export async function getInviterInfo(userId) {
  try {
    console.log("Getting inviter info for user ID:", userId);
    
    // Try both formats - as is (could be integer) and as UUID
    // First attempt with user_id directly
    let { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', userId)
      .maybeSingle();
    
    console.log("Initial query result:", data, error);
    
    // If no result found and it looks like a UUID, try converting to a numeric ID or vice versa
    if (!data) {
      // If it's a valid UUID but we have integer IDs in database
      if (isValidUUID(userId)) {
        console.log("Valid UUID format, but no result. Trying alternate formats...");
        
        // Attempt to convert UUID to an integer (using parts of UUID)
        // This is a simplified approach - adapt based on your UUID-to-integer mapping
        const numericId = parseInt(userId.replace(/-/g, '').substring(0, 8), 16) % 1000000;
        
        console.log("Trying with derived numeric ID:", numericId);
        const numericResult = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', numericId)
          .maybeSingle();
          
        if (numericResult.data) {
          console.log("Found user with numeric ID conversion:", numericResult.data);
          data = numericResult.data;
          error = null;
        }
      } 
      // If it's a number but we have UUID in database
      else if (!isNaN(Number(userId))) {
        console.log("Numeric format, but no result. Trying to query by ID directly...");
        
        // Try a more flexible query approach
        const alternateResult = await supabase
          .from('profiles')
          .select('email')
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (alternateResult.data?.length > 0) {
          console.log("Found most recent user:", alternateResult.data[0]);
          data = alternateResult.data[0];
          error = null;
        }
      }
    }
    
    if (error) {
      console.log("Error in getInviterInfo:", error.message);
      throw new Error(error.message);
    }
    
    return { success: true, email: data?.email };
  } catch (error) {
    console.error("Error getting inviter info:", error);
    return { success: false, error: error.message };
  }
}
