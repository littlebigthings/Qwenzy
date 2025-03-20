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
  fullName: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters",
    })
    .max(100, {
      message: "Name must be less than 100 characters",
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
          
          // Update profileForm values - using the new field
          profileForm.reset({
            fullName: profile.name || "",
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

      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingProfile) {
        // Update existing profile with the new field
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            name: data.fullName.trim(),
            avatar_url: avatarUrl,
            // Keep the existing data for other fields
          })
          .eq('id', existingProfile.id);

        if (updateError) throw updateError;
      } else {
        // Create new profile with the new field
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            organization_id: organization.id,
            name: data.fullName.trim(),
            avatar_url: avatarUrl,
            email: user.email,
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

  // Upload file to Supabase storage
  const uploadToSupabase = async (file: File, bucketName: string) => {
    try {
      if (!file || !user?.id) return null;

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
        throw uploadError;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      console.log("File uploaded, public URL:", publicUrlData.publicUrl);
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  // If loading state, show a loading indicator
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Navigation tabs */}
      <div className="mb-8">
        <ul className="flex space-x-2 md:space-x-4 justify-between border-b">
          {steps.map((step) => (
            <li
              key={step.id}
              className={`py-4 px-1 md:px-4 flex-1 text-center cursor-pointer ${
                currentStep === step.id
                  ? "border-b-2 border-primary text-primary font-medium"
                  : completedSteps.includes(step.id)
                  ? "text-gray-600"
                  : "text-gray-400"
              }`}
              onClick={() => {
                if (completedSteps.includes(step.id)) {
                  setCurrentStep(step.id);
                }
              }}
            >
              <div className="flex flex-col items-center justify-center space-y-1">
                {/* <img
                  src={currentStep === step.id ? step.active : step.icon}
                  alt={step.label}
                  className="w-5 h-5"
                /> */}
                <span className="text-xs md:text-sm">{step.label}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="pt-6">
          {/* Organization setup step */}
          {currentStep === "organization" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">Create your organization</h2>
                <p className="text-gray-500">
                  This is your company or team's workspace.
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
                          <Input placeholder="Acme Inc" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <FormLabel>Organization Logo</FormLabel>
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 border border-dashed rounded flex items-center justify-center bg-gray-50">
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Organization logo"
                            className="h-full w-full object-cover rounded"
                          />
                        ) : (
                          <Upload className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <label
                            htmlFor="logo-upload"
                            className="inline-flex items-center justify-center bg-primary text-primary-foreground px-4 py-2 rounded cursor-pointer hover:opacity-90 transition-opacity"
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

                  <Button
                    type="submit"
                    className="w-full"
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

          {/* Profile setup step */}
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
                  <FormField
                    control={profileForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <FormLabel>Profile Photo</FormLabel>
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 border border-dashed rounded-full flex items-center justify-center bg-gray-50">
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="Avatar preview"
                            className="h-full w-full object-cover rounded-full"
                          />
                        ) : (
                          <Upload className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <label
                            htmlFor="avatar-upload"
                            className="inline-flex items-center justify-center bg-primary text-primary-foreground px-4 py-2 rounded cursor-pointer hover:opacity-90 transition-opacity"
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
                                setAvatarPreview(null);
                                setAvatarFile(null);
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
                    className="w-full"
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

          {/* TODO: Add other steps here */}
          {currentStep === "invite" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">Invite your team</h2>
                <p className="text-gray-500">Invite members to collaborate with you in this workspace</p>
              </div>
              
              <Button
                onClick={moveToNextStep}
                className="w-full"
              >
                Skip for now
              </Button>
            </div>
          )}

          {currentStep === "workspace" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">Set up your workspace</h2>
                <p className="text-gray-500">Configure your workspace settings</p>
              </div>
              
              <Button
                onClick={() => setLocation("/")}
                className="w-full"
              >
                Finish setup
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
