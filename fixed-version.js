// Create a fix for the issue where invited users are redirected to organization selection
// rather than home page after completing their profile in onboarding

// Steps to fix the issue:
// 1. Make sure hasOrganization is explicitly set to true for invited users
// 2. Use a timeout to ensure the state updates before navigation
// 3. Ensure this happens in client/src/components/onboarding-flow.tsx

// Execute the code change
const fs = require('fs');
const path = require('path');

try {
  // Path to the onboarding flow file
  const filePath = path.resolve('./client/src/components/onboarding-flow.tsx');
  
  // Read the file
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find the relevant section - this pattern is very specific to avoid false matches
  const pattern = /if \(isInvitation\) \{\s+\/\/ For invited users, go directly to home page after profile setup\s+await saveProgress\("completed", newCompleted\);\s+\s+toast\(\{\s+title: "Success",\s+description: "Profile setup complete! Taking you to the dashboard.",\s+\}\);\s+\s+console\.log\("Redirecting invited user to home page"\);\s+\/\/ Navigate directly to home page\s+console\.log\(hasOrganization\);\s+setLocation\("\/"\);\s+return;/;
  
  // Replacement text with the fix
  const replacement = `if (isInvitation) {
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
          return`;
  
  // Apply the replacement
  if (content.match(pattern)) {
    content = content.replace(pattern, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully applied fix to onboarding-flow.tsx');
  } else {
    console.log('Pattern not found. Manual editing may be required.');
    
    // Alternative approach - look for key phrases
    const partialPattern = /if \(isInvitation\).*\{\s+\/\/ For invited users, go directly to home page/;
    const match = content.match(partialPattern);
    
    if (match) {
      console.log('Found partial match, attempting broader replacement...');
      
      // Find the starting position of the match
      const startPos = content.indexOf(match[0]);
      
      // Find the return statement that marks the end of this block
      const returnPos = content.indexOf('return;', startPos);
      
      if (returnPos > startPos) {
        // Extract the whole block
        const fullBlock = content.substring(startPos, returnPos + 'return;'.length);
        
        // Apply replacement
        content = content.replace(fullBlock, replacement);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Applied fix using alternative approach');
      } else {
        console.log('Could not find end of block');
      }
    } else {
      console.log('No matching pattern found at all');
    }
  }
} catch (error) {
  console.error('Error fixing file:', error);
}
