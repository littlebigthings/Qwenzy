const fs = require('fs');

try {
  // Read the file
  const filepath = 'client/src/components/onboarding-flow.tsx';
  let content = fs.readFileSync(filepath, 'utf8');
  
  // Replace the defaultValues in orgForm
  content = content.replace(
    /defaultValues: {\s*name: organization\?\.name \|\| "",\s*domain: organization\?\.domain \|\| ""},/,
    'defaultValues: {\n      name: organization?.name || "",\n    },'
  );
  
  // Replace the reset function
  content = content.replace(
    /orgForm\.reset\({\s*name: organization\.name,\s*domain: organization\.domain,\s*}\);/,
    'orgForm.reset({\n        name: organization.name,\n      });'
  );
  
  // Write the updated content back to the file
  fs.writeFileSync(filepath, content);
  console.log('Successfully updated defaultValues and reset functions');
} catch (error) {
  console.error('Error:', error);
}
