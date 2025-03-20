// Function to handle profile form submission with Supabase storage
const handleProfileSubmit = async (data: { fullName: string }) => {
  try {
    if (!user?.id) throw new Error("Missing user information");
    if (!organization?.id) throw new Error("Missing organization information");

    setLoading(true);

    // Upload avatar if exists
    let avatarUrl = null;
    if (avatarFile) {
      // Create a user-specific path for the avatar to work with RLS policies
      const userId = user.id.toString();
      const fileExt = avatarFile.name.split(".").pop();
      const fileName = `${userId}/${Math.random()}.${fileExt}`;

      // Upload to the avatars bucket with user-specific path
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, avatarFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: avatarFile.type,
        });

      if (uploadError) {
        console.error("Supabase storage error:", uploadError);
        throw uploadError;
      }

      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      avatarUrl = publicUrlData.publicUrl;
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
          email: user.email,
          avatar_url: avatarUrl,
          job_title: "Team Member", // Default job title
          role: "member", // Default role
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