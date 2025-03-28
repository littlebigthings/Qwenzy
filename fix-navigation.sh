#!/bin/bash

# First, copy the file to a backup
cp client/src/components/onboarding-flow.tsx client/src/components/onboarding-flow.tsx.bak

# Find the line numbers we need to modify
start_line=$(grep -n "if (isInvitation) {" client/src/components/onboarding-flow.tsx | grep -o "^[0-9]*")
navigate_line=$(grep -n "setLocation(\"/\");" client/src/components/onboarding-flow.tsx | grep -o "^[0-9]*")

# Insert the setHasOrganization line after the saveProgress line
awk -v startline="$start_line" '
NR == startline+2 {
  print $0;
  print "          // Ensure hasOrganization is set to true for invited users";
  print "          setHasOrganization(true);";
  next;
}
1
' client/src/components/onboarding-flow.tsx > temp.tsx

# Now modify the navigation to use a timeout
awk -v line="$navigate_line" '
NR == line-1 {
  print "          // Navigate directly to home page - use timeout to ensure state updates first";
  print "          console.log(\"hasOrganization set to:\", true);";
  next;
}
NR == line {
  print "          setTimeout(() => {";
  print "            setLocation(\"/\");";
  print "          }, 100);";
  next;
}
1
' temp.tsx > client/src/components/onboarding-flow.tsx

# Clean up temporary file
rm temp.tsx

echo "Navigation fix applied!"
