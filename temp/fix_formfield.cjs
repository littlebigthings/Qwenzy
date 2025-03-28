const fs = require('fs');
const path = require('path');

// Read the file
let content = fs.readFileSync(path.join('client/src/components/onboarding-flow.tsx'), 'utf8');

// Remove the incomplete FormField tag (from line 956 to line 959)
content = content.replace(/\n                  <FormField\n                    control={orgForm\.control}\n/g, '');

// Write the fixed content back to the file
fs.writeFileSync(path.join('client/src/components/onboarding-flow.tsx'), content);

console.log('FormField fix applied successfully!');
