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
import { sendInvitationEmail, checkInvitation, markInvitationAsAccepted, checkUserInvitations } from "@/lib/invitation-handler";
import { Check, Copy } from "lucide-react";

// Add type for organization data
type Organization = {
  id: string;
  name: string;
  logo_url: string | null;
};

type Invitation = {
  organizationId: string;
  invitedBy: string;
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
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  
  // Invitation state
  const [isInvitation, setIsInvitation] = useState<boolean>(false);
  const [invitationData, setInvitationData] = useState<Invitation | null>(null);
  
  // Invite state
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [currentInviteInput, setCurrentInviteInput] = useState<string>("");
  const [allowAutoJoin, setAllowAutoJoin] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  
  // Check for user invitations from the database
  useEffect(() => {
    const checkForInvitations = async () => {
      if (!user?.email) return;
      
      try {
        // Check if the user has any pending invitations
        const invitationResult = await checkUserInvitations(user.email);
        console.log(invitationResult);
        
        if (invitationResult.hasInvitation) {
          setIsInvitation(true);
          setInvitationData({
            organizationId: invitationResult.organizationId,
            invitedBy: invitationResult.invitedBy
          });
        }
      } catch (error) {
        console.error("Error checking invitations:", error);
      }
    };
    
    checkForInvitations();
  }, [user]);

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
          const initialStep = isInvitation ? 'profile' : (userHasOrg ? 'profile' : 'organization');
          console.log('initialStep', initialStep);
          const initialCompletedSteps = isInvitation ? ['organization'] : (userHasOrg ? ['organization'] : []);
          console.log(initialCompletedSteps);
          // Only create new progress if it doesn't exist
          const { data: newProgress, error: progressError } = await supabase
            .from('onboarding_progress')
            .insert({
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
  }, [user, setHasOrganization, isInvitation]);

  // Handle invited user flow
  useEffect(() => {
    if (isInvitation && invitationData?.organizationId && user) {
      // For invited users, we should skip directly to profile setup
      const loadInvitedOrganization = async () => {
        try {
          setLoading(true);
          
          // First check if the user is already a member
          const { data: memberships, error: membershipError } = await supabase
            .from("organization_members")
            .select("organization_id")
            .eq("user_id", user.id)
            .eq("organization_id", invitationData.organizationId)
            .maybeSingle();
            
          if (membershipError) {
            console.error("Error checking membership:", membershipError);
            return;
          }
          
          // If already a member, proceed normally
          if (memberships) {
            return;
          }
          
          // Get the organization data
          const { data: org, error } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", invitationData.organizationId)
            .single();
            
          if (error) {
            console.error("Error loading invited organization:", error);
            return;
          }
          
          // Set the organization in state
          setOrganization(org);
          
          // Create the user's membership to this organization
          const { error: insertError } = await supabase
            .from("organization_members")
            .insert({
              user_id: user.id,
              organization_id: invitationData.organizationId,
              role: "member",
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
            await markInvitationAsAccepted(user.email, invitationData.organizationId);
          }
          
        } catch (error) {
          console.error("Error in invitation flow:", error);
        } finally {
          setLoading(false);
        }
      };
      
      loadInvitedOrganization();
    }
  }, [user, isInvitation, invitationData]);

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
      
      // For invited users, use the invitation org ID
      // Otherwise use the organization from state
      const orgId = isInvitation && invitationData?.organizationId ? invitationData.organizationId : organization?.id;
      
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

      // For invited users, ensure they are added to the organization
      if (isInvitation && invitationData?.organizationId) {
        // Check if already a member
        const { data: existingMembership, error: membershipCheckError } = await supabase
          .from("organization_members")
          .select("*")
          .eq("user_id", user.id)
          .eq("organization_id", invitationData.organizationId)
          .maybeSingle();
          
        if (membershipCheckError) {
          console.error("Error checking membership:", membershipCheckError);
        }
        
        // If not already a member, add them
        if (!existingMembership) {
          const { error: membershipError } = await supabase
            .from("organization_members")
            .insert({
              user_id: user.id,
              organization_id: invitationData.organizationId,
              role: "member",
              is_owner: false
            });
            
          if (membershipError) {
            console.error("Error adding organization member:", membershipError);
            throw membershipError;
          }
        }
      }

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

      // Update progress
      let newCompleted = [...completedSteps];
      if (!newCompleted.includes("profile")) {
        newCompleted.push("profile");
      }
      
      // For invited users, mark the invitation as accepted
      if (isInvitation && user.email && invitationData?.organizationId) {
        await markInvitationAsAccepted(user.email, invitationData.organizationId);
      }

      if (!completedSteps.includes("organization")) {
        newCompleted.push("organization");
      }
      
      setCompletedSteps(newCompleted);
      
      // For invited users, go directly to home page after profile setup
      if (isInvitation) {
        toast({
          title: "Success",
          description: "Profile saved successfully! Welcome to your new organization.",
        });
        
        // Go directly to home
        setLocation("/");
        return;
      } else {
        // For non-invited users, proceed with normal flow
        await saveProgress("invite", newCompleted);
        
        toast({
          title: "Success",
          description: "Profile saved successfully!",
        });
        
        moveToNextStep();
      }
    } catch (error: any) {
      console.error("Profile submission error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error saving profile",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (file: File) => {
    if (!file) return;

    try {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error preparing avatar:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to preview avatar",
      });
    }
  };

  // Handle logo upload
  const handleLogoUpload = async (file: File) => {
    if (!file) return;

    try {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error preparing logo:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to preview logo",
      });
    }
  };

  // Save the file to Supabase storage
  const uploadToSupabase = async (file: File, bucketName: string) => {
    try {
      // Create a unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (error) throw error;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading to Supabase:", error);
      throw new Error("Failed to upload file");
    }
  };

  // Move to the next step
  const moveToNextStep = () => {
    const currentIndex = steps.findIndex((step) => step.id === currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1].id;
      setCurrentStep(nextStep);
    }
  };

  // Move to the previous step
  const moveToPrevStep = () => {
    const currentIndex = steps.findIndex((step) => step.id === currentStep);
    if (currentIndex > 0) {
      const prevStep = steps[currentIndex - 1].id;
      setCurrentStep(prevStep);
    }
  };

  // Handle step click
  const handleStepClick = (stepId: string) => {
    // Only allow navigation to completed steps or the current step
    if (completedSteps.includes(stepId) || currentStep === stepId) {
      setCurrentStep(stepId);
    }
  };

  // Handle invitations
  const addInvitation = (email: string) => {
    if (!email || inviteEmails.includes(email)) return;
    setInviteEmails([...inviteEmails, email]);
    setCurrentInviteInput("");
  };

  const removeInvitation = (email: string) => {
    setInviteEmails(inviteEmails.filter((e) => e !== email));
  };

  const handleInviteKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && currentInviteInput) {
      e.preventDefault();
      addInvitation(currentInviteInput);
    }
  };

  const handleSendInvites = async () => {
    if (!inviteEmails.length || !organization || !user) return;

    setLoading(true);
    try {
      const successfulInvites = [];
      const failedInvites = [];

      for (const email of inviteEmails) {
        try {
          // Get organization name
          const orgName = organization.name;
          
          // Get user's name from profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('user_id', user.id)
            .single();
            
          const inviterName = profile?.name || user.email || 'A team member';
          
          // Send invitation
          const result = await sendInvitationEmail(
            email, 
            orgName, 
            inviterName,
            user.email || '',
            organization.id,
            user.id
          );

          if (result.success) {
            successfulInvites.push(email);
          } else {
            failedInvites.push(email);
          }
        } catch (error) {
          console.error(`Error inviting ${email}:`, error);
          failedInvites.push(email);
        }
      }

      // Remove successful invites from the list
      setInviteEmails(failedInvites);

      if (successfulInvites.length > 0) {
        toast({
          title: "Invitations Sent",
          description: `Successfully sent ${successfulInvites.length} invitation${successfulInvites.length > 1 ? 's' : ''}.`,
        });

        // Mark step as completed if we haven't already
        if (!completedSteps.includes("invite")) {
          const newCompleted = [...completedSteps, "invite"];
          setCompletedSteps(newCompleted);
          await saveProgress("workspace", newCompleted);
          moveToNextStep();
        }
      }

      if (failedInvites.length > 0) {
        toast({
          variant: "destructive",
          title: "Some Invitations Failed",
          description: `Failed to send invitations to ${failedInvites.length} email${failedInvites.length > 1 ? 's' : ''}.`,
        });
      }
    } catch (error) {
      console.error("Error sending invitations:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send invitations. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkipInvites = async () => {
    const newCompleted = [...completedSteps, "invite"];
    setCompletedSteps(newCompleted);
    await saveProgress("workspace", newCompleted);
    moveToNextStep();
  };

  const copyInviteLink = async () => {
    if (!organization) return;
    
    const inviteUrl = `${window.location.origin}/register?orgId=${organization.id}`;
    
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Copied!",
        description: "Invitation link copied to clipboard",
      });
    } catch (error) {
      console.error("Failed to copy:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy invitation link",
      });
    }
  };

  // Skip filter if no user yet
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Setup your workspace</h1>
        <p className="text-muted-foreground">
          Complete the following steps to get started with your workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Step navigation sidebar */}
        <div>
          <div className="space-y-1">
            {steps
              // For invited users, only show profile step
              .filter(step => !isInvitation || (step.id === "profile" || step.id === "organization"))
              .map((step) => (
                <button
                  key={step.id}
                  // For invited users, make both steps clickable
                  onClick={() => isInvitation || completedSteps.includes(step.id) || currentStep === step.id 
                    ? handleStepClick(step.id) 
                    : null}
                  className={`w-full flex items-center p-3 rounded-md transition-colors ${
                    currentStep === step.id
                      ? "bg-primary/10 text-primary"
                      : completedSteps.includes(step.id)
                      ? "bg-muted hover:bg-muted/80 cursor-pointer"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  <div
                    className={`w-5 h-5 mr-2 rounded-full flex items-center justify-center text-xs ${
                      currentStep === step.id
                        ? "bg-primary text-white"
                        : completedSteps.includes(step.id)
                        ? "bg-primary text-white"
                        : "bg-muted-foreground/30"
                    }`}
                  >
                    {completedSteps.includes(step.id) ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      ""
                    )}
                  </div>
                  <span>{step.label}</span>
                </button>
              ))}
          </div>
        </div>

        {/* Content area */}
        <div className="md:col-span-3">
          <Card>
            <CardContent className="pt-6">
              {/* Organization Setup */}
              {currentStep === "organization" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">
                      Organization Details
                    </h2>
                    {organization && !isEditing && (
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                      >
                        Edit
                      </Button>
                    )}
                  </div>

                  {(isEditing || !organization) && (
                    <Form {...orgForm}>
                      <form
                        onSubmit={orgForm.handleSubmit(handleOrganizationSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={orgForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter your organization name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="space-y-2">
                          <FormLabel>Organization Logo</FormLabel>
                          <div className="flex items-center gap-4">
                            {logoPreview ? (
                              <div className="relative">
                                <img
                                  src={logoPreview}
                                  alt="Logo Preview"
                                  className="w-16 h-16 object-cover rounded-md"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
                                  onClick={() => {
                                    setLogoPreview(null);
                                    setLogoFile(null);
                                  }}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center bg-muted">
                                <Upload className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <input
                                type="file"
                                id="logo-upload"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleLogoUpload(e.target.files[0]);
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  document
                                    .getElementById("logo-upload")
                                    ?.click()
                                }
                              >
                                {logoPreview ? "Change Logo" : "Upload Logo"}
                              </Button>
                              <p className="text-sm text-muted-foreground mt-1">
                                Optional: Upload a square image, max 2MB
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                          {organization && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsEditing(false)}
                            >
                              Cancel
                            </Button>
                          )}
                          <Button type="submit" disabled={loading}>
                            {loading && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {organization ? "Update" : "Continue"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}

                  {organization && !isEditing && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        {organization.logo_url ? (
                          <img
                            src={organization.logo_url}
                            alt={organization.name}
                            className="w-16 h-16 object-cover rounded-md"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-primary/10 rounded-md flex items-center justify-center">
                            <span className="text-primary text-xl font-bold">
                              {organization.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-medium">
                            {organization.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Created on{" "}
                            {new Date().toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Next button */}
                      <div className="flex justify-end">
                        <Button onClick={moveToNextStep}>Continue</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Profile Setup */}
              {currentStep === "profile" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Profile Setup</h2>
                    {completedSteps.includes("profile") && !isProfileEditing && (
                      <Button
                        variant="outline"
                        onClick={() => setIsProfileEditing(true)}
                      >
                        Edit
                      </Button>
                    )}
                  </div>

                  <Form {...profileForm}>
                    <form
                      onSubmit={profileForm.handleSubmit(handleProfileSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={profileForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter your full name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-2">
                        <FormLabel>Profile Picture</FormLabel>
                        <div className="flex items-center gap-4">
                          {avatarPreview ? (
                            <div className="relative">
                              <img
                                src={avatarPreview}
                                alt="Avatar Preview"
                                className="w-16 h-16 object-cover rounded-full"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
                                onClick={() => {
                                  setAvatarPreview(null);
                                  setAvatarFile(null);
                                }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center bg-muted">
                              <Upload className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <input
                              type="file"
                              id="avatar-upload"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleAvatarUpload(e.target.files[0]);
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                document
                                  .getElementById("avatar-upload")
                                  ?.click()
                              }
                            >
                              {avatarPreview
                                ? "Change Picture"
                                : "Upload Picture"}
                            </Button>
                            <p className="text-sm text-muted-foreground mt-1">
                              Optional: Upload a square image, max 2MB
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={moveToPrevStep}
                          disabled={isInvitation}
                        >
                          <ChevronLeft className="w-4 h-4 mr-2" />
                          Back
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {completedSteps.includes("profile")
                            ? "Update"
                            : "Continue"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              )}

              {/* Invite Collaborators */}
              {currentStep === "invite" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold mb-4">
                    Invite Team Members
                  </h2>

                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[100px]">
                        {inviteEmails.map((email) => (
                          <div
                            key={email}
                            className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full"
                          >
                            <span className="text-sm">{email}</span>
                            <button
                              type="button"
                              onClick={() => removeInvitation(email)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <input
                          type="email"
                          value={currentInviteInput}
                          onChange={(e) => setCurrentInviteInput(e.target.value)}
                          onKeyDown={handleInviteKeyPress}
                          placeholder="Type email and press Enter"
                          className="flex-1 min-w-[200px] bg-transparent border-0 focus:ring-0 p-2"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          if (currentInviteInput) {
                            addInvitation(currentInviteInput);
                          }
                        }}
                      >
                        + Add Email
                      </Button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="auto-join"
                        checked={allowAutoJoin}
                        onCheckedChange={(checked) => 
                          setAllowAutoJoin(checked as boolean)
                        }
                      />
                      <label
                        htmlFor="auto-join"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Allow team members to join automatically
                      </label>
                    </div>

                    <div className="bg-muted p-4 rounded-md">
                      <h3 className="text-sm font-medium mb-2">Or share invitation link</h3>
                      <div className="flex gap-2">
                        <Input
                          value={organization ? `${window.location.origin}/register?orgId=${organization.id}` : ''}
                          readOnly
                          className="text-xs"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={copyInviteLink}
                          className="flex-shrink-0"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 mr-1" />
                          ) : (
                            <Copy className="h-4 w-4 mr-1" />
                          )}
                          {copied ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={moveToPrevStep}
                      >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <div className="space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSkipInvites}
                        >
                          Skip
                        </Button>
                        <Button
                          type="button"
                          onClick={handleSendInvites}
                          disabled={loading || inviteEmails.length === 0}
                        >
                          {loading && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Send Invites
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Workspace Setup */}
              {currentStep === "workspace" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold mb-4">
                    Workspace Setup
                  </h2>

                  <p>
                    This is where additional workspace setup options would go.
                  </p>

                  <div className="flex justify-between pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={moveToPrevStep}
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        // Mark as completed and finish onboarding
                        const newCompleted = [...completedSteps, "workspace"];
                        setCompletedSteps(newCompleted);
                        saveProgress("workspace", newCompleted);
                        
                        // Redirect to dashboard
                        setLocation("/");
                        
                        toast({
                          title: "All Set!",
                          description: "Your workspace is ready to use.",
                        });
                      }}
                    >
                      Finish Setup
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}