const fs = require('fs');
const path = require('path');

// Copy the old file as our starting point
fs.copyFileSync(
  path.join('client/src/components/onboarding-flow-old.tsx'),
  path.join('client/src/components/onboarding-flow.tsx')
);

// Read the file
let content = fs.readFileSync(path.join('client/src/components/onboarding-flow.tsx'), 'utf8');

// 1. Add the extractDomainFromEmail function (before first useEffect)
const functionToAdd = `
  // Extract domain from user's email
  const extractDomainFromEmail = (email: string): string => {
    if (!email) return "";
    const parts = email.split('@');
    return parts.length === 2 ? parts[1] : "";
  };
`;
content = content.replace(/useEffect\(\(\) => \{/, `${functionToAdd}\n  useEffect(() => {`);

// 2. Find and remove the domain field from the defaultValues
content = content.replace(/defaultValues: \{[\s\S]*?\}/g, 
  `defaultValues: {
      name: organization?.name || "",
    }`
);

// 3. Update the orgForm.reset function
content = content.replace(/orgForm\.reset\(\{[\s\S]*?\}\);/g, 
  `orgForm.reset({
        name: organization.name,
      });`
);

// 4. Remove the entire domain FormField
content = content.replace(/<FormField[\s\S]*?name="domain"[\s\S]*?<\/FormField>/g, '');

// 5. Update the handleOrganizationSubmit function to use extractDomainFromEmail
content = content.replace(/\s+domain: data\.domain,/g, '\n            domain: domain, // Use extracted domain');

// Add the domain extraction before the logo upload
content = content.replace(/\s+\/\/ Upload logo if exists/g, `
      // Extract domain from user's email
      const domain = extractDomainFromEmail(user.email || "");
      if (!domain) {
        throw new Error("Could not extract domain from email");
      }

      // Upload logo if exists`);

// Write the fixed content back to the file
fs.writeFileSync(path.join('client/src/components/onboarding-flow.tsx'), content);

console.log('Fix applied successfully!');
