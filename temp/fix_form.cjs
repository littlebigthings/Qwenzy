const fs = require('fs');

// Load the file content
let content = fs.readFileSync('client/src/components/onboarding-flow.tsx', 'utf8');

// 1. Update the schema - remove domain property from schema
content = content.replace(
  /const organizationSchema = z\.object\({([\s\S]*?)}\);/,
  function(match, p1) {
    return "const organizationSchema = z.object({" + 
      p1.replace(/domain:[\s\S]*?}),/, '') + 
      "});";
  }
);

// 2. Remove domain from defaultValues
content = content.replace(
  /defaultValues: {[\s\S]*?},/,
  function(match) {
    return match.replace(/domain:.*?,/, '');
  }
);

// 3. Remove domain field from orgForm.reset
content = content.replace(
  /orgForm\.reset\({[\s\S]*?}\);/,
  function(match) {
    return match.replace(/domain:.*?,/, '');
  }
);

// 4. Remove the domain FormField (this is safer than trying to identify the exact block)
const lines = content.split('\n');
let newLines = [];
let skipLine = false;
let bracketCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Start skipping at form field with name="domain"
  if (line.includes('name="domain"')) {
    skipLine = true;
    bracketCount = 0;
    continue;
  }
  
  if (skipLine) {
    // Count brackets to determine where the FormField block ends
    const openCount = (line.match(/<FormField/g) || []).length;
    const closeCount = (line.match(/<\/FormField>/g) || []).length;
    bracketCount += openCount - closeCount;
    
    if (bracketCount <= 0) {
      skipLine = false;
      continue;
    }
  } else {
    newLines.push(line);
  }
}

// Write the updated content back to the file
fs.writeFileSync('client/src/components/onboarding-flow.tsx', newLines.join('\n'));
console.log('Successfully updated onboarding-flow.tsx');
