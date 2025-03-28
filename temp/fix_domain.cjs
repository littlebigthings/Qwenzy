const fs = require('fs');

// Load the old file
const oldContent = fs.readFileSync('client/src/components/onboarding-flow-old.tsx', 'utf8');

// 1. Update the schema - remove domain property
const schemaUpdated = oldContent.replace(
  /const organizationSchema = z.object\({[\s\S]*?}\);/,
  fs.readFileSync('temp/updated_schema.tsx', 'utf8')
);

// 2. Add the extractDomainFromEmail function before handleOrganizationSubmit
const extractFunctionContent = "// Extract domain from user's email\n" +
  "const extractDomainFromEmail = (email: string): string => {\n" +
  "  if (!email) return \"\";\n" +
  "  const parts = email.split('@');\n" +
  "  return parts.length === 2 ? parts[1] : \"\";\n" +
  "};\n\n";

const withExtractFunction = schemaUpdated.replace(
  /\/\/ Handle organization form submission/,
  extractFunctionContent + "// Handle organization form submission"
);

// 3. Update the handleOrganizationSubmit function to use extracted domain
const updatedSubmitHandler = withExtractFunction.replace(
  /const handleOrganizationSubmit = async[\s\S]*?setLoading\(false\);\s*?};/,
  fs.readFileSync('temp/updated_onboarding_flow.tsx', 'utf8')
);

// 4. Remove the domain field from the form using regex
const domainFieldRegex = /<FormField[\s\S]*?name="domain"[\s\S]*?<\/FormField>/g;
const withoutDomainField = updatedSubmitHandler.replace(domainFieldRegex, '');

// Write the updated file
fs.writeFileSync('client/src/components/onboarding-flow.tsx', withoutDomainField);
console.log('Successfully updated onboarding-flow.tsx');
