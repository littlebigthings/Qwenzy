import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { 
  Loader2, 
  Upload, 
  Link, 
  X, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { sendInvitationEmail, checkInvitation, markInvitationAsAccepted } from "@/lib/invitation-handler";
import { Check, Copy } from "lucide-react";

// Add type for organization data
type Organization = {
  id: string;
  name: string;
  domain: string;
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

interface OnboardingFlowProps {
  isInvitation?: boolean;
  invitationOrgId?: string | null;
}

export function OnboardingFlow() {
  const { user, hasOrganization, setHasOrganization } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isInvitation, setIsInvitation] = useState<boolean>(false);
  const [invitationOrgId, setInvitationOrgId] = useState<string>("null");
  const [invitationChecked, setInvitationChecked] = useState<boolean>(false);
  
  useEffect(() => {
    const loadInvitation = async () => {
      if (!user?.email) return;
      
      try {
        const { data, error } = await supabase
          .from("invitations")
          .select("organization_id")
          .eq("email", user?.email)
          .maybeSingle(); // Expecting a single record

        if (error) {
          console.error("Error fetching invitation:", error.message);
          setInvitationChecked(true);
          return;
        }

        if (data) {
          console.log("Found invitation for organization:", data.organization_id);
          setIsInvitation(true);
          setInvitationOrgId(data.organization_id);
        } else {
          setIsInvitation(false);
        }
      } catch (err) {
        console.error("Exception fetching invitation:", err);
      } finally {
        setInvitationChecked(true);
      }
    };

    loadInvitation();
  }, [user?.email]);
  
  console.log("Is invitation:", isInvitation);
  console.log("Invitation org ID:", invitationOrgId);
  console.log("Invitation checked:", invitationChecked);
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
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  
  // Invite state
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [currentInviteInput, setCurrentInviteInput] = useState<string>("");
  const [allowAutoJoin, setAllowAutoJoin] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  
  // No need to check localStorage - we'll verify invitation status directly from DB

  // Load onboarding progress from Supabase
  useEffect(() => {
    const loadOnboardingProgress = async () => {
      if (!user || !invitationChecked) return; 
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
          .maybeSingle();

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

        console.log(existingProgress);
        let progress;
        
        if (!existingProgress) {
          console.log("enter");
          // For invited users, start directly at profile step
          // Otherwise, follow normal flow
          console.log("isInvitation: ",isInvitation);
          const initialStep = isInvitation ? 'profile' : (userHasOrg ? 'profile' : 'organization');
          console.log('initialStep', initialStep);
          const initialCompletedSteps = isInvitation ? ['organization'] : (userHasOrg ? ['organization'] : []);
          console.log(initialCompletedSteps);
          // Only create new progress if it doesn't exist
          const { data: newProgress, error: progressError } = await supabase
            .from('onboarding_progress')
            .upsert({
              user_id: user.id,
              current_step: initialStep,
              completed_steps: initialCompletedSteps
            })
            .select()
            .single();
            
          if (progressError) {
            throw progressError;
          }
          
          progress = newProgress;
        } else {
          // Use existing progress without modifying it
          progress = existingProgress;
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
  }, [user, setHasOrganization, invitationChecked]);

  // Handle invited user flow
  useEffect(() => {
    if (isInvitation && invitationOrgId !== "null" && user && invitationChecked) {
      // For invited users, we should skip directly to profile setup
      const loadInvitedOrganization = async () => {
        try {
          setLoading(true);
          
          // First check if the user is already a member
          const { data: memberships, error: membershipError } = await supabase
            .from("organization_members")
            .select("organization_id")
            .eq("user_id", user.id)
            .eq("organization_id", invitationOrgId)
            .maybeSingle();
            
          if (membershipError) {
            console.error("Error checking membership:", membershipError);
          }
          
          // If already a member, proceed normally
          if (memberships) {
            setHasOrganization(true);
            return;
          }
          
          // Get the organization data
          const { data: org, error } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", invitationOrgId)
            .single();
            
          if (error) {
            console.error("Error loading invited organization:", error);
            return;
          }
          
          // Set the organization in state
          setOrganization(org);
          setHasOrganization(true);
          // Create the user's membership to this organization
          const { error: insertError } = await supabase
            .from("organization_members")
            .insert({
              user_id: user.id,
              organization_id: invitationOrgId,
              is_owner: false
            });
              
          if (insertError) {
            console.error("Error creating membership:", insertError);
            return;
          }
          
          // Set the current step to profile setup
          setCompletedSteps(["organization"]);
          setCurrentStep("profile");
          
          // Save progress
          await saveProgress("profile", ["organization"]);
          // Mark the invitation as accepted
          if (user.email) {
            await markInvitationAsAccepted(user.email, invitationOrgId);
          }
          
        } catch (error) {
          console.error("Error in invitation flow:", error);
        } finally {
          setLoading(false);
        }
      };
      
      loadInvitedOrganization();
    }
  }, [user, isInvitation, invitationOrgId, setHasOrganization, invitationChecked]);

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

  // Extract domain from user's email
const extractDomainFromEmail = (email: string): string => {
  if (!email) return "";
  const parts = email.split('@');
  return parts.length === 2 ? parts[1] : "";
};

// Handle organization form submission (create or update)
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
  
  // Handle profile form submission
  const handleProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
    try {
      if (!user?.id) throw new Error("Missing user information");
      
      // For invited users, use the invitation org ID
      // Otherwise use the organization from state
      const orgId = isInvitation && invitationOrgId ? invitationOrgId : organization?.id;
      
      if (!orgId) throw new Error("Missing organization information");

      setLoading(true);

      // Upload avatar if exists
      let avatarUrl = null;
      if (avatarFile) {
        avatarUrl = await uploadToSupabase(avatarFile, "avatars");
      } else if (avatarPreview) {
        avatarUrl = avatarPreview;
      }

      console.log("Saving profile with data:", { name: data.fullName, avatarUrl, orgId });

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
            organization_id: orgId,
            name: data.fullName,
            avatar_url: avatarUrl,
            email: user.email,
          });

        if (insertError) throw insertError;
      }

      // Turn off edit mode if it was on
      if (isProfileEditing) {
        setIsProfileEditing(false);
      }

      // Check if profile step was already completed
      const alreadyCompleted = completedSteps.includes("profile");
      
      // Only add to completed steps if not already there
      let newCompleted = completedSteps;
      if (!alreadyCompleted) {
        newCompleted = [...completedSteps, "profile"];
        console.log(newCompleted);
        setCompletedSteps(newCompleted);
        
        // For invited users, mark the invitation as accepted
        if (isInvitation && invitationOrgId && user?.email) {
          try {
            await markInvitationAsAccepted(user.email, invitationOrgId);
            console.log("Invitation marked as accepted");
          } catch (invitationError) {
            console.error("Error marking invitation as accepted:", invitationError);
            // Don't throw here, as we still want to continue with the flow
          }
        }
        
        if (isInvitation) {
          // For invited users, go directly to home page after profile setup
          await saveProgress("completed", newCompleted);
          
          toast({
            title: "Success",
            description: "Profile setup complete! Taking you to the dashboard.",
          });
          
          console.log("Redirecting invited user to home page");
          // Navigate directly to home page
          setLocation("/");
          return; // Early return to prevent further processing
        } else {
          // For regular users, continue to next step
          await saveProgress("invite", newCompleted);
          
          toast({
            title: "Success",
            description: "Profile updated successfully!",
          });
          
          // Only move to next step if this was the first time completing
          moveToNextStep();
        }
      } else {
        toast({
          title: "Success",
          description: "Profile updated successfully!",
        });
      }
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
  // Function to get invitation URL
  const getInvitationUrl = (id: string | undefined) => {
    if (!organization) return "";
    const deploymentUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    return `${deploymentUrl}/register?invitation=true&organization=${organization.id}&ib=${id}`;
  };

  // Function to copy invitation link
  const copyInvitationLink = () => {
    const url = getInvitationUrl(user?.id);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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
      // Use user-specific folder structure for RLS compliance
      // Ensure UUID is properly formatted for storage path (no need for toString as it is already a string)
      const userId = user.id;
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
            {steps
              // For invited users, only show profile step
              .filter(step => !isInvitation || (step.id === "profile"))
              .map((step, index) => {
                const isCompleted = completedSteps.includes(step.id);
                const isCurrent = currentStep === step.id;
                
                // For invited users, make both steps clickable
                const isClickable = isInvitation || 
                  index === 0 || 
                  completedSteps.includes(steps[index - 1].id);

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
                          alt="Complete"
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
                    <div>
                      <h3
                        className={`text-base font-medium ${
                          isCurrent ? "text-[#407c87]" : "text-gray-700"
                        }`}
                      >
                        {step.label}
                      </h3>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Right content area */}
        <div className="p-6">
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
                          <Input
                            placeholder="e.g. Acme Inc, Tech Solutions"
                            {...field}
                            disabled={organization && !isEditing}
                          />
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          {organization && !isEditing
                            ? "Organization name"
                            : "Use a unique name that represents your organization"}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={orgForm.control}
