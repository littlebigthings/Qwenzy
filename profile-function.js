// === COPY THIS CODE TO REPLACE YOUR handleProfileSubmit FUNCTION ===

// Handle profile form submission
const handleProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
  try {
    if (!user?.id) throw new Error("Missing user information");
    if (!organization?.id) throw new Error("Missing organization information");

    setLoading(true);

    // Upload avatar if exists
    let avatarUrl = null;

    if (avatarFile) {
      try {
        // Use user-specific folder structure for RLS compliance
        const userId = user.id.toString();
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`; // Include user ID in path

        console.log("Uploading file to path:", filePath);

        // Upload to the avatars bucket
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile, {
            cacheControl: "3600",
            upsert: true, // Change to upsert to overwrite if exists
            contentType: avatarFile.type,
          });

        if (uploadError) {
          console.error("Supabase storage error:", uploadError);
          throw uploadError;
        }

        // Get the public URL
        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        avatarUrl = publicUrlData.publicUrl;
      } catch (uploadErr) {
        console.error("Upload to Supabase error:", uploadErr);
      }
    } else if (avatarPreview) {
      avatarUrl = avatarPreview;
    }

    console.log("Saving profile with data:", { name: data.fullName, avatarUrl });

    // Extract first and last name from full name
    const nameParts = data.fullName.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq('user_id', user.id)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingProfile) {
      // Update existing profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          avatar_url: avatarUrl,
        })
        .eq('id', existingProfile.id);

      if (updateError) throw updateError;
    } else {
      // Create new profile
      const { error: insertError } = await supabase
        .from("profiles")
        .insert({
          user_id: user.id,
          organization_id: organization.id,
          first_name: firstName,
          last_name: lastName,
          email: user.email || "",
          job_title: "Team Member", // Default value
          role: "member", // Default value
          avatar_url: avatarUrl,
        });

      if (insertError) throw insertError;
    }

    // Update progress
    const newCompleted = [...completedSteps, "profile"];
    setCompletedSteps(newCompleted);
    await saveProgress("invite", newCompleted);

    toast({
      title: "Success",
      description: "Profile updated successfully!",
    });

    moveToNextStep();
  } catch (error: any) {
    console.error("Profile operation error:", error);
    toast({
      variant: "destructive",
      title: "Error",
      description: error.message || "Error updating profile",
    });
  } finally {
    setLoading(false);
  }
};
