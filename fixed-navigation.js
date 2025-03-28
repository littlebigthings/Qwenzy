/**
 * This script contains the fixed navigation logic for the onboarding flow
 * It ensures that after an invited user completes the profile setup, they're 
 * redirected to the home page instead of the organization selection page.
 * 
 * Problem: 
 * When a user was invited and completed their profile in onboarding, they
 * were incorrectly redirected to the organization selection page instead of
 * the home page.
 * 
 * Fix 1: Update the profile submission handler in onboarding-flow.tsx
 * - Modify the isInvitation condition to explicitly set hasOrganization=true
 * - Add a timeout to ensure the state is updated before navigation
 * 
 * Code to replace (around line 595-608):
 */

// Original code
if (isInvitation) {
  // For invited users, go directly to home page after profile setup
  await saveProgress("completed", newCompleted);
  
  toast({
    title: "Success",
    description: "Profile setup complete! Taking you to the dashboard.",
  });
  
  console.log("Redirecting invited user to home page");
  // Navigate directly to home page
  console.log(hasOrganization);
  setLocation("/");
  return; // Early return to prevent further processing
}

// Fixed code
if (isInvitation) {
  // For invited users, go directly to home page after profile setup
  await saveProgress("completed", newCompleted);
  
  // Ensure hasOrganization is set to true for invited users
  setHasOrganization(true);
  
  toast({
    title: "Success",
    description: "Profile setup complete! Taking you to the dashboard.",
  });
  
  console.log("Redirecting invited user to home page");
  // Navigate directly to home page - use timeout to ensure state updates first
  console.log("hasOrganization set to:", true);
  setTimeout(() => {
    setLocation("/");
  }, 100);
  return; // Early return to prevent further processing
}