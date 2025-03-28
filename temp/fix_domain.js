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

// 4. Remove the domain field from the form
let result = updatedSubmitHandler;
let insideDomainField = false;
let formFieldDepth = 0;
let formFieldLines = [];

const lines = updatedSubmitHandler.split('\n');
let newLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Look for domain form field
  if (line.includes('name="domain"') && !insideDomainField) {
    insideDomainField = true;
    formFieldDepth = 1;
    continue;
  }
  
  if (insideDomainField) {
    // Count braces to track when we exit the form field
    const openBraces = (line.match(/<FormField/g) || []).length;
    const closeBraces = (line.match(/<\/FormField>/g) || []).length;
    
    formFieldDepth += openBraces - closeBraces;
    
    if (formFieldDepth <= 0) {
      insideDomainField = false;
      continue;
    }
  } else {
    newLines.push(line);
  }
}

// Write the updated file
fs.writeFileSync('client/src/components/onboarding-flow.tsx', newLines.join('\n'));
