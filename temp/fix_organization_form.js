// Script to fix the organization form by removing domain field
const fs = require('fs');

// Read the old file that works correctly
const oldContent = fs.readFileSync('client/src/components/onboarding-flow-old.tsx', 'utf8');

// Make our modifications
let newContent = oldContent;

// 1. Add the extractDomainFromEmail function
const extractDomainFunction = `
  // Extract domain from user's email
  const extractDomainFromEmail = (email: string): string => {
    if (!email) return "";
    const parts = email.split('@');
    return parts.length === 2 ? parts[1] : "";
  };
`;

// Add it before the first useEffect
newContent = newContent.replace(
  'useEffect(() => {',
  `${extractDomainFunction}\n  useEffect(() => {`
);

// 2. Modify the handleOrganizationSubmit function to use extracted domain
const oldHandleOrgSubmit = /const handleOrganizationSubmit = async[^;]+?finally[^}]+?}/s;
const newHandleOrgSubmit = `
  const handleOrganizationSubmit = async (data: z.infer<typeof organizationSchema>) => {
    try {
      if (!user?.id) throw new Error("Missing user information");

      setLoading(true);

      // Extract domain from user's email
      const domain = extractDomainFromEmail(user.email || "");
      if (!domain) {
        throw new Error("Could not extract domain from email");
      }

      // Upload logo if exists
      let logoUrl = logoFile ? await uploadToSupabase(logoFile, "organizations") : organization?.logo_url;

      if (organization) {
        // Update existing organization
        const { error: updateError } = await supabase
          .from("organizations")
          .update({
            name: data.name,
            domain: domain, // Use extracted domain
            logo_url: logoUrl,
          })
          .eq('id', organization.id);

        if (updateError) throw updateError;

        setOrganization({
          ...organization,
          name: data.name,
          domain: domain, // Use extracted domain
          logo_url: logoUrl,
        });

        toast({
          title: "Success",
          description: "Organization updated successfully!",
        });

        setIsEditing(false);
      } else {
        // Create new organization
        const { data: newOrg, error: orgError } = await supabase
          .from("organizations")
          .insert({
            name: data.name,
            domain: domain, // Use extracted domain
            logo_url: logoUrl,
          })
          .select()
          .single();

        if (orgError) throw orgError;

        // Create organization membership
        const { error: membershipError } = await supabase
          .from("organization_members")
          .insert({
            user_id: user.id,
            organization_id: newOrg.id,
            is_owner: true,
          });

        if (membershipError) throw membershipError;

        setOrganization(newOrg);
        setHasOrganization(true);

        // Update progress
        const newCompleted = [...completedSteps, "organization"];
        setCompletedSteps(newCompleted);
        await saveProgress("profile", newCompleted);

        toast({
          title: "Success",
          description: "Organization created successfully! Moving to profile setup.",
        });

        moveToNextStep();
      }
    } catch (error: any) {
      console.error("Error creating/updating organization:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create/update organization",
      });
    } finally {
      setLoading(false);
    }
  };
`;

newContent = newContent.replace(oldHandleOrgSubmit, newHandleOrgSubmit);

// 3. Remove domain from defaultValues
newContent = newContent.replace(
  /defaultValues: {[^}]+?}/s,
  `defaultValues: {
      name: organization?.name || "",
    }`
);

// 4. Update orgForm.reset
newContent = newContent.replace(
  /orgForm\.reset\({[^}]+?}\);/s,
  `orgForm.reset({
        name: organization.name,
      });`
);

// 5. Remove the domain FormField
const domainFormFieldRegex = /<FormField\s+control={orgForm\.control}\s+name="domain"[\s\S]+?<\/FormField>/;
newContent = newContent.replace(domainFormFieldRegex, '');

// Write the modified content to a new file
fs.writeFileSync('client/src/components/onboarding-flow.tsx', newContent);

console.log('Successfully fixed the organization form!');