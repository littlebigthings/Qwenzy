import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import {
  Card,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Button,
  useToast,
} from "@/components/ui";
import { Loader2, Upload } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { steps } from "@/lib/onboarding-steps";

// Types
type Organization = {
  id: string;
  name: string;
  logo_url: string | null;
};

// Organization schema
const organizationSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  logo: z.any().optional(),
});

// Profile schema
const profileSchema = z.object({
  fullName: z
    .string()
    .min(1, { message: "Name is required" })
    .max(100, {
      message: "Name must be less than 100 characters",
    }),
  email: z.string().email().optional(),
  jobTitle: z.string().optional(),
  avatar: z.any().optional(),
});

export function OnboardingFlow() {
  const { user, hasOrganization, setHasOrganization } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Add organization state
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [currentStep, setCurrentStep] = useState<string>("organization");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Load onboarding progress from Supabase
  useEffect(() => {
    const loadOnboardingProgress = async () => {
      if (!user) return;

      try {
        // First check organization membership and get organization details
        const { data: memberships, error: membershipError } = await supabase
          .from('organization_members')
          .select(`
            organization_id,
            organizations:organization_id (
              id,
              name,
              logo_url
            )
          `)
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (membershipError && membershipError.code !== 'PGRST116') {
          console.error('Error checking organization membership:', membershipError);
          return;
        }

        // Update organization state and hasOrganization
        const userHasOrg = !!memberships;
        setHasOrganization(userHasOrg);

        if (userHasOrg && memberships.organizations) {
          setOrganization(memberships.organizations);
          // Set logo preview if organization has a logo
          if (memberships.organizations.logo_url) {
            setLogoPreview(memberships.organizations.logo_url);
          }
        }

        // First check if onboarding progress exists
        const { data: existingProgress, error: existingProgressError } = await supabase
          .from('onboarding_progress')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        // Only create new progress if it doesn't exist
        if (!existingProgress) {
          // Create a new onboarding progress entry
          const { data: newProgress, error: insertProgressError } = await supabase
            .from('onboarding_progress')
            .insert({
              user_id: user.id,
              current_step: userHasOrg ? 'profile' : 'organization',
              completed_steps: userHasOrg ? ['organization'] : []
            })
            .select()
            .single();
            
          if (insertProgressError) {
            console.error('Error creating onboarding progress:', insertProgressError);
            throw insertProgressError;
          }
          
          // Set the progress from the newly created entry
          setCurrentStep(newProgress.current_step);
          setCompletedSteps(newProgress.completed_steps);
        } else {
          // Use existing progress without modifying it
          setCurrentStep(existingProgress.current_step);
          setCompletedSteps(existingProgress.completed_steps);
        }

        // Check if user has a profile already
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (profile) {
          // If profile exists, set the preview for the avatar
          if (profile.avatar_url) {
            setAvatarPreview(profile.avatar_url);
          }
          
          // Update profileForm values
          profileForm.reset({
            fullName: profile.name || "",
            email: profile.email || "",
            jobTitle: profile.job_title || "",
          });
        }
      } catch (error) {
        console.error('Error loading onboarding progress:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load your progress"
        });
      } finally {
        setLoading(false);
      }
    };

    loadOnboardingProgress();
  }, [user, setHasOrganization]);

  // Initialize form with organization data if it exists
  const orgForm = useForm<z.infer<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization?.name || "",
    },
  });
  
  // Initialize profile form
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
    },
  });

  // Update form values when organization data is loaded
  useEffect(() => {
    if (organization) {
      orgForm.reset({
        name: organization.name,
      });
    }
  }, [organization]);

  // Save progress to Supabase
  const saveProgress = async (step: string, completed: string[]) => {
    if (!user) return;

    try {
      console.log("Completed: ",completed);
      console.log("step: ",step);
      const { error } = await supabase
        .from('onboarding_progress')
        .upsert({
          user_id: user.id,
          current_step: step,
          completed_steps: completed
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving progress:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save your progress"
      });
    }
  };

  // Handle organization form submission (create or update)
  const handleOrganizationSubmit = async (data: z.infer<typeof organizationSchema>) => {
    try {
      if (!user?.id) throw new Error("Missing user information");

      setLoading(true);

      // Upload logo if exists
      let logoUrl = logoFile ? await uploadToSupabase(logoFile, "organizations") : organization?.logo_url;

      if (organization) {
        // Update existing organization
        const { error: updateError } = await supabase
          .from("organizations")
          .update({
            name: data.name,
            logo_url: logoUrl,
          })
          .eq('id', organization.id);

        if (updateError) throw updateError;

        setOrganization({
          ...organization,
          name: data.name,
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
      console.error("Organization operation error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error processing organization",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle profile form submission
  const handleProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
    try {
      if (!user?.id) throw new Error("Missing user information");
      if (!organization?.id) throw new Error("Missing organization information");

      setLoading(true);

      // Upload avatar if exists
      let avatarUrl = null;
      if (avatarFile) {
        avatarUrl = await uploadToSupabase(avatarFile, "avatars");
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
            name: data.fullName,
            avatar_url: avatarUrl,
            // Keep the existing data for other fields
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
            name: data.fullName,
            avatar_url: avatarUrl,
            email: user.email,
          });

        if (insertError) throw insertError;
      }

      // Update progress
      const newCompleted = [...completedSteps, "profile"];
      console.log(newCompleted);
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

  // Move to next step
  const moveToNextStep = async () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1].id;
      setCurrentStep(nextStep);
      console.log("Steps from next: ",completedSteps);
      console.log("Steps to next: ",nextStep);
      // Update progress
      //await saveProgress(nextStep, completedSteps);
    } else {
      setLocation("/");
    }
  };

  // Handle logo upload functionality
  const handleLogoUpload = async (file: File) => {
    try {
      if (!file) return null;

      // Check file size (800KB max)
      if (file.size > 800 * 1024) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "File size must be less than 800K",
        });
        return null;
      }

      // Check file type
      if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "File must be JPG, PNG or GIF",
        });
        return null;
      }

      // Set file and preview
      setLogoFile(file);
      const preview = URL.createObjectURL(file);
      setLogoPreview(preview);
      return preview;
    } catch (error) {
      console.error("Logo upload error:", error);
      return null;
    }
  };

  // Handle avatar upload functionality
  const handleAvatarUpload = async (file: File) => {
    try {
      if (!file) return null;

      // Check file size (800KB max)
      if (file.size > 800 * 1024) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "File size must be less than 800K",
        });
        return null;
      }

      // Check file type
      if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "File must be JPG, PNG or GIF",
        });
        return null;
      }

      // Set file and preview
      setAvatarFile(file);
      const preview = URL.createObjectURL(file);
      setAvatarPreview(preview);
      return preview;
    } catch (error) {
      console.error("Avatar upload error:", error);
      return null;
    }
  };

  // Upload to Supabase Storage
  const uploadToSupabase = async (file: File, bucketName: string) => {
    try {
      if (!user) throw new Error("User not authenticated");
      if (!file) return null;

      // Check file size (800KB max)
      if (file.size > 800 * 1024) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "File size must be less than 800K",
        });
        return null;
      }

      // Check file type
      if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "File must be JPG, PNG or GIF",
        });
        return null;
      }

      // Use user-specific folder structure for RLS compliance
      const userId = user.id.toString();
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`; // Include user ID in path

      console.log("Uploading file to path:", filePath);

      // Upload to the specified bucket
      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true, // Change to upsert to overwrite if exists
          contentType: file.type,
        });

      if (uploadError) {
        console.error("Supabase storage error:", uploadError);
        if (uploadError.message.includes("policy")) {
          throw new Error("Storage permission denied. Please try again.");
        }
        throw new Error("Failed to upload file");
      }

      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucketName).getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error("Upload to Supabase error:", error);
      toast({
        variant: "destructive",
        title: "Upload Error",
        description: error.message || "Failed to upload file to storage",
      });
      return null;
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[url('/bg.png')] bg-cover">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[url('/bg.png')] bg-cover">
      <Card className="w-full max-w-5xl grid grid-cols-[280px,1fr] overflow-hidden">
        {/* Left sidebar with steps */}
        <div className="bg-gray-50 p-6 border-r">
          <div className="space-y-2">
            {steps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = currentStep === step.id;
              const isClickable =
                index === 0 || completedSteps.includes(steps[index - 1].id);

              return (
                <button
                  key={step.id}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg transition-colors
                    ${isCurrent ? "bg-white shadow-sm" : "hover:bg-white/50"}
                    ${!isClickable ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  `}
                  onClick={() => isClickable && setCurrentStep(step.id)}
                  disabled={!isClickable}
                >
                  <div className="w-8 h-8 flex-shrink-0">
                    {isCompleted ? (
                      <img
                        src="/completed.svg"
                        alt="Completed"
                        className="w-8 h-8"
                      />
                    ) : (
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center border-2
                          ${
                            isCurrent
                              ? "border-[#407c87] text-[#407c87] bg-white"
                              : "border-gray-300 text-gray-400 bg-white"
                          }
                        `}
                      >
                        {index + 1}
                      </div>
                    )}
                  </div>
                  <div className="text-left">
                    <p
                      className={`font-medium ${
                        isCurrent ? "text-[#407c87]" : "text-gray-700"
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right content area */}
        <div className="p-8">
          {currentStep === "organization" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">Create your organization</h2>
                <p className="text-gray-500">
                  Set up your organization for team collaboration
                </p>
              </div>

              <Form {...orgForm}>
                <form
                  onSubmit={orgForm.handleSubmit(handleOrganizationSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={orgForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization name</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Inc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <FormLabel>Organization logo</FormLabel>
                    <div className="flex items-start gap-4">
                      <div className="h-24 w-24 border border-dashed rounded flex items-center justify-center bg-gray-50">
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Upload className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <label
                            htmlFor="logo-upload"
                            className="inline-flex items-center justify-center bg-[#407c87] text-white px-4 py-2 rounded cursor-pointer hover:bg-[#386d77] transition-colors"
                          >
                            Upload a logo
                            <input
                              id="logo-upload"
                              type="file"
                              className="hidden"
                              accept="image/jpeg,image/png,image/gif"
                              onChange={(e) =>
                                handleLogoUpload(e.target.files?.[0] as File)
                              }
                            />
                          </label>
                          {logoPreview && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setLogoFile(null);
                                setLogoPreview(null);
                              }}
                            >
                              Reset
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Allowed JPG, GIF or PNG. Max size of 800K
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#407c87] hover:bg-[#386d77]"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          )}
          {currentStep === "profile" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">Setup your profile</h2>
                <p className="text-gray-500">
                  Personalize your account settings
                </p>
              </div>

              <Form {...profileForm}>
                <form
                  onSubmit={profileForm.handleSubmit(handleProfileSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={profileForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <FormLabel>Your profile photo</FormLabel>
                    <div className="flex items-start gap-4">
                      <div className="h-24 w-24 border border-dashed rounded flex items-center justify-center bg-gray-50">
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="Avatar preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Upload className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <label
                            htmlFor="avatar-upload"
                            className="inline-flex items-center justify-center bg-[#407c87] text-white px-4 py-2 rounded cursor-pointer hover:bg-[#386d77] transition-colors"
                          >
                            Upload a photo
                            <input
                              id="avatar-upload"
                              type="file"
                              className="hidden"
                              accept="image/jpeg,image/png,image/gif"
                              onChange={(e) =>
                                handleAvatarUpload(e.target.files?.[0] as File)
                              }
                            />
                          </label>
                          {avatarPreview && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setAvatarFile(null);
                                setAvatarPreview(null);
                              }}
                            >
                              Reset
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Allowed JPG, GIF or PNG. Max size of 800K
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#407c87] hover:bg-[#386d77]"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          )}
          {currentStep === "invite" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">Invite team members</h2>
                <p className="text-gray-500">
                  Collaborate with your team members
                </p>
              </div>

              <div className="border rounded-lg p-4 text-center space-y-4">
                <img
                  src="/invite-active.svg"
                  alt="Invite"
                  className="w-12 h-12 mx-auto"
                />
                <p>Invite feature will be available soon</p>
                <Button
                  className="w-full bg-[#407c87] hover:bg-[#386d77]"
                  onClick={() => {
                    // Update progress
                    const newCompleted = [...completedSteps, "invite"];
                    setCompletedSteps(newCompleted);
                    saveProgress("workspace", newCompleted);
                    moveToNextStep();
                  }}
                >
                  Skip for now
                </Button>
              </div>
            </div>
          )}
          {currentStep === "workspace" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">Set up workspaces</h2>
                <p className="text-gray-500">
                  Organize your projects in separate workspaces
                </p>
              </div>

              <div className="border rounded-lg p-4 text-center space-y-4">
                <img
                  src="/workspace-active.svg"
                  alt="Workspace"
                  className="w-12 h-12 mx-auto"
                />
                <p>Workspace feature will be available soon</p>
                <Button
                  className="w-full bg-[#407c87] hover:bg-[#386d77]"
                  onClick={() => {
                    // Update progress
                    const newCompleted = [...completedSteps, "workspace"];
                    setCompletedSteps(newCompleted);
                    saveProgress("complete", newCompleted);
                    // Go to dashboard
                    setLocation("/");
                  }}
                >
                  Complete onboarding
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}