#!/bin/bash

# Create a temporary file with the updated content section
cat > temp/new_content_section.txt << 'EOT'
        {/* Right content area */}
        <div className="p-6">
          {/* Skip organization step for invited users */}
          {(currentStep === "organization" && !isInvitation) && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-semibold">
                    {organization ? "Organization Details" : "Give your organization a name"}
                  </h2>
                  <p className="text-gray-500">
                    {organization 
                      ? isEditing ? "Update your organization details" : "Your organization details"
                      : "Details help any collaborators that join"}
                  </p>
                </div>
                {organization && !isEditing && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                  >
                    Edit Details
                  </Button>
                )}
              </div>
EOT

# Find the start of the content section
LINE_NUMBER=$(grep -n "{/\* Right content area \*/}" client/src/components/onboarding-flow.tsx | cut -d ':' -f 1)

# Use node to do the replacement
node -e "
const fs = require('fs');
const file = 'client/src/components/onboarding-flow.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\\n');

// Find the line with 'Right content area'
const rightContentLine = ${LINE_NUMBER};

// Find the line with the organization conditional statement
const orgLine = lines.findIndex((line, index) => 
  index > rightContentLine && line.includes('currentStep === \"organization\"')
);

if (orgLine === -1) {
  console.error('Could not find the organization section');
  process.exit(1);
}

// Replace the organization conditional line and add an extra condition
lines[orgLine] = lines[orgLine].replace(
  'currentStep === \"organization\"',
  '(currentStep === \"organization\" && !isInvitation)'
);

// Write the file back
fs.writeFileSync(file, lines.join('\\n'), 'utf8');
console.log('Updated organization conditional rendering');
"

echo "Updated content section in onboarding-flow.tsx"
