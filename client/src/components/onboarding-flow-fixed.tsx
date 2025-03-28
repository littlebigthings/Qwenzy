import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

// Add type for organization data
type Organization = {
  id: string;
  name: string;
  logo_url: string | null;
};

const steps = [
  {
    id: "organization",
    label: "Organization",
    icon: "src/assets/org.svg",
    active: "src/assets/org-active.svg",
  },
  {
    id: "profile",
    label: "Profile",
    icon: "src/assets/profile.svg",
    active: "src/assets/profile-active.svg",
  },
  {
    id: "invite",
    label: "Invite",
    icon: "src/assets/invite.svg",
    active: "src/assets/invite-active.svg",
  },
  {
    id: "workspace",
    label: "Workspace",
    icon: "src/assets/workspace.svg",
    active: "src/assets/workspace-active.svg",
  },
];

const organizationSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Organization name must be at least 2 characters",
    })
    .max(50, {
      message: "Organization name must be less than 50 characters",
    })
    .regex(/^[a-zA-Z0-9\s.-]+$/, {
      message:
        "Organization name can only contain letters, numbers, spaces, dots and hyphens",
    }),
  logo: z.any().optional(),
});

const profileSchema = z.object({
  firstName: z
    .string()
    .min(2, {
      message: "First name must be at least 2 characters",
    })
    .max(50, {
      message: "First name must be less than 50 characters",
    }),
  lastName: z
    .string()
    .min(2, {
      message: "Last name must be at least 2 characters",
    })
    .max(50, {
      message: "Last name must be less than 50 characters",
    }),
  email: z
    .string()
    .email({
      message: "Please enter a valid email address",
    }),
  jobTitle: z
    .string()
    .min(2, {
      message: "Job title must be at least 2 characters",
    })
    .max(100, {
      message: "Job title must be less than 100 characters",
    }),
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

        // Get or create onboarding progress using upsert
        const { data: progress, error: progressError } = await supabase
          .from('onboarding_progress')
          .upsert({
            user_id: user.id,
            current_step: userHasOrg ? 'profile' : 'organization',
            completed_steps: userHasOrg ? ['organization'] : []
          }, {
            onConflict: 'user_id'
          })
          .select()
          .single();

        if (progressError) {
          throw progressError;
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
            firstName: profile.first_name || "",
            lastName: profile.last_name || "",
            email: profile.email || "",
            jobTitle: profile.job_title || "",
          });
        }

        // Update component state
        if (progress) {
          setCurrentStep(progress.current_step);
          setCompletedSteps(progress.completed_steps);
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
      firstName: "",
      lastName: "",
      email: "",
      jobTitle: "",
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
      let avatarUrl = avatarFile ? await uploadToSupabase(avatarFile, "avatars") : avatarPreview;

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
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            job_title: data.jobTitle,
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
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            job_title: data.jobTitle,
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

  // Move to next step
  const moveToNextStep = async () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1].id;
      setCurrentStep(nextStep);
      await saveProgress(nextStep, completedSteps);
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

      // Create file preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      setLogoFile(file);
      return file;
    } catch (error: any) {
      console.error("Logo upload error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error preparing logo",
      });
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

      // Create file preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      setAvatarFile(file);
      return file;
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error preparing avatar",
      });
      return null;
    }
  };

  // Reset avatar
  const handleResetAvatar = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
  };

  // Upload file to Supabase storage
  const uploadToSupabase = async (file: File, bucketName: string) => {
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

      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = fileName; // Simplified path, no folders

      // Upload to the specified bucket
      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
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
    <div className="min-h-screen flex items-center justify-center bg-[url('/bg.png')] bg-cover">
      <div className="w-full max-w-5xl flex gap-6 p-4">
        {/* Left side (steps) */}
        <div className="hidden md:block w-80 p-4 bg-muted/40 backdrop-blur-sm rounded-lg space-y-2">
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
                        src="src/assets/completed.svg"
                        alt="Completed"
                        className="w-full h-full"
                      />
                    ) : (
                      <img
                        src={isCurrent ? step.active : step.icon}
                        alt={step.label}
                        className="w-full h-full"
                      />
                    )}
                  </div>
                  <span
                    className={`font-medium ${
                      isCurrent ? "text-primary" : "text-foreground/80"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right side (content) */}
        <Card className="flex-1">
          <CardContent className="p-6 space-y-6">
            {/* Organization creation step */}
            {currentStep === "organization" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">Create your organization</h2>
                  <p className="text-gray-500">
                    Set up your organization to start collaborating with your team.
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
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Acme Corp"
                              {...field}
                              disabled={organization && !isEditing}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <FormLabel>Organization Logo</FormLabel>
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
                              className={`inline-flex items-center justify-center px-4 py-2 rounded cursor-pointer transition-colors
                                ${organization && !isEditing
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : "bg-[#407c87] text-white hover:bg-[#386d77]"
                                }`}
                            >
                              Upload Logo
                              <input
                                id="logo-upload"
                                type="file"
                                className="hidden"
                                accept="image/jpeg,image/png,image/gif"
                                onChange={(e) =>
                                  handleLogoUpload(e.target.files?.[0] as File)
                                }
                                disabled={organization && !isEditing}
                              />
                            </label>
                            {logoPreview && (organization ? isEditing : true) && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setLogoPreview(null);
                                  setLogoFile(null);
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

                    {(organization ? isEditing : true) && (
                      <Button
                        type="submit"
                        className="w-full bg-[#407c87] hover:bg-[#386d77]"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {organization ? "Updating..." : "Creating..."}
                          </>
                        ) : (
                          `${organization ? "Update" : "Create"} Organization`
                        )}
                      </Button>
                    )}
                  </form>
                </Form>

                {organization && !isEditing && (
                  <div className="flex justify-between gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      className="flex-1"
                    >
                      Edit Organization
                    </Button>
                    <Button
                      type="button"
                      className="flex-1 bg-[#407c87] hover:bg-[#386d77]"
                      onClick={moveToNextStep}
                    >
                      Continue
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Profile setup step - Updated to match the new design */}
            {currentStep === "profile" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">Add your profile information</h2>
                  <p className="text-gray-500">Adding your name and profile photo helps your teammates to recognise and connect with you more easily.</p>
                </div>
                
                <Form {...profileForm}>
                  <form
                    onSubmit={profileForm.handleSubmit(handleProfileSubmit)}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="john.doe@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="jobTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Software Developer" {...field} />
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
                              className="h-full w-full object-cover rounded"
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
                                onClick={handleResetAvatar}
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

            {/* Invite step */}
            {currentStep === "invite" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">Invite Team Members</h2>
                  <p className="text-gray-500">
                    Invite your team members to collaborate. You can add more people later.
                  </p>
                </div>

                {/* Invite UI (placeholder) */}
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    This feature is coming soon. For now, you can continue to the next step.
                  </p>
                  
                  <Button
                    type="button"
                    className="w-full bg-[#407c87] hover:bg-[#386d77]"
                    onClick={moveToNextStep}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Workspace step */}
            {currentStep === "workspace" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">Set Up Your Workspace</h2>
                  <p className="text-gray-500">
                    Configure your workspace preferences to get started.
                  </p>
                </div>

                {/* Workspace UI (placeholder) */}
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    This feature is coming soon. For now, you can complete the onboarding process.
                  </p>
                  
                  <Button
                    type="button"
                    className="w-full bg-[#407c87] hover:bg-[#386d77]"
                    onClick={() => setLocation("/")}
                  >
                    Complete Onboarding
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}