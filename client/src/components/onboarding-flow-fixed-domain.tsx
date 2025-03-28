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
  domain: z
    .string()
    .min(3, {
      message: "Domain must be at least 3 characters",
    })
    .max(50, {
      message: "Domain must be less than 50 characters",
    })
    .regex(/^[a-z0-9.-]+$/, {
      message: "Domain can only contain lowercase letters, numbers, dots and hyphens",
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
              domain,
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
      domain: organization?.domain || "",
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
        domain: organization.domain,
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
            domain: data.domain,
            logo_url: logoUrl,
          })
          .eq('id', organization.id);

        if (updateError) throw updateError;

        setOrganization({
          ...organization,
          name: data.name,
          domain: data.domain,
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
            domain: data.domain,
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
      const orgId = isInvitation && invitationOrgId ? invitationOrgId : organization?.id;
      
      if (!orgId) throw new Error("Missing organization information");

      setLoading(true);

      // Upload avatar if exists
      let avatarUrl = avatarFile ? await uploadToSupabase(avatarFile, "avatars") : avatarPreview;

      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            name: data.fullName,
            avatar_url: avatarUrl,
            organization_id: orgId,
          })
          .eq("id", existingProfile.id);

        if (updateError) throw updateError;
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            name: data.fullName,
            avatar_url: avatarUrl,
            organization_id: orgId,
          });

        if (insertError) throw insertError;
      }

      // Update progress and move to next step
      const newCompleted = [...completedSteps, "profile"];
      setCompletedSteps(newCompleted);
      
      // If this is an invited user and we've completed the profile step, 
      // we're done with onboarding! Redirect to main dashboard
      if (isInvitation) {
        toast({
          title: "Success",
          description: "Profile saved successfully! Redirecting to dashboard.",
        });
        // Use setLocation to navigate to the home page
        setLocation("/");
      } else {
        // Regular flow - move to next step (invite)
        await saveProgress("invite", newCompleted);
        toast({
          title: "Success",
          description: "Profile saved successfully! Moving to invite step.",
        });
        moveToNextStep();
      }
      
      setIsProfileEditing(false);
    } catch (error: any) {
      console.error("Profile operation error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error processing profile",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleInviteSubmit = async () => {
    try {
      if (!organization) throw new Error("Missing organization information");
      if (!user) throw new Error("Missing user information");
      
      setLoading(true);
      
      // Create invite links and send emails
      for (const email of inviteEmails) {
        await sendInvitationEmail(email, organization.id, user.id);
      }
      
      // Update progress
      const newCompleted = [...completedSteps, "invite"];
      setCompletedSteps(newCompleted);
      await saveProgress("workspace", newCompleted);
      
      toast({
        title: "Success",
        description: `Sent ${inviteEmails.length} invitation${inviteEmails.length !== 1 ? "s" : ""}!`,
      });
      
      moveToNextStep();
    } catch (error: any) {
      console.error("Invitation error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error sending invitations",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const moveToNextStep = () => {
    const currentIndex = steps.findIndex((step) => step.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };
  
  const goToPreviousStep = () => {
    const currentIndex = steps.findIndex((step) => step.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };
  
  const handleLogoUpload = async (file: File) => {
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };
  
  const handleAvatarUpload = async (file: File) => {
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };
  
  const uploadToSupabase = async (file: File, bucketName: string) => {
    try {
      const timestamp = new Date().getTime(); 
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file);
      
      if (error) throw error;
      
      // Get public URL for the file
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);
      
      return publicUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  };
  
  const addEmail = () => {
    if (!currentInviteInput) return;
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(currentInviteInput)) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address",
      });
      return;
    }
    
    if (!inviteEmails.includes(currentInviteInput)) {
      setInviteEmails([...inviteEmails, currentInviteInput]);
      setCurrentInviteInput("");
    }
  };
  
  const removeEmail = (email: string) => {
    setInviteEmails(inviteEmails.filter(e => e !== email));
  };
  
  const copyInviteLink = async () => {
    if (!organization) return;
    
    try {
      const inviteLink = `${window.location.origin}/register?invitation=${organization.id}`;
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };
  
  // Handle workspace form submission
  const completeOnboarding = async () => {
    try {
      if (!user) throw new Error("Missing user information");
      
      // Mark onboarding as complete
      const newCompleted = [...completedSteps, "workspace"];
      await saveProgress("complete", newCompleted);
      
      toast({
        title: "Success",
        description: "Onboarding complete! Redirecting to dashboard.",
      });
      
      // Redirect to dashboard
      setLocation("/");
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error completing onboarding",
      });
    }
  };
  
  // Show loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-center text-lg">Loading your onboarding experience...</p>
      </div>
    );
  }
  
  // Step 1: Organization Setup
  if (currentStep === "organization") {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between mb-8">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col items-center space-y-2 ${
                completedSteps.includes(step.id)
                  ? "text-primary"
                  : step.id === currentStep
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <img 
                src={completedSteps.includes(step.id) || step.id === currentStep ? step.active : step.icon} 
                alt={step.label} 
                className="w-8 h-8"
              />
              <span className="text-sm">{step.label}</span>
            </div>
          ))}
        </div>
        
        <Card className="mb-8">
          <CardContent className="pt-6">
            <Form {...orgForm}>
              <form
                onSubmit={orgForm.handleSubmit(handleOrganizationSubmit)}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold">
                  {organization ? "Organization Details" : "Create Your Organization"}
                </h2>
                
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
                          disabled={!isEditing && !!organization}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={orgForm.control}
                  name="domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Domain</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="acme.com"
                          {...field}
                          disabled={!isEditing && !!organization}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div>
                  <FormLabel>Organization Logo</FormLabel>
                  <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4 items-start mt-2">
                    {logoPreview ? (
                      <div className="relative h-24 w-24 rounded-lg border overflow-hidden">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="h-full w-full object-contain"
                        />
                        {(isEditing || !organization) && (
                          <button
                            type="button"
                            onClick={() => {
                              setLogoPreview(null);
                              setLogoFile(null);
                            }}
                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground h-5 w-5 rounded-full flex items-center justify-center"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="h-24 w-24 rounded-lg border border-dashed border-muted-foreground flex items-center justify-center bg-muted">
                        <span className="text-muted-foreground text-sm text-center px-2">
                          No logo uploaded
                        </span>
                      </div>
                    )}
                    
                    {(isEditing || !organization) && (
                      <div className="flex-1">
                        <label
                          htmlFor="logo-upload"
                          className="flex items-center gap-2 cursor-pointer p-2 bg-muted rounded-md hover:bg-muted/80 text-sm"
                        >
                          <Upload className="h-4 w-4" />
                          <span>Upload logo</span>
                          <input
                            id="logo-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleLogoUpload(file);
                            }}
                          />
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Recommended: 512x512px or larger square PNG
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between pt-4">
                  {organization ? (
                    <>
                      {isEditing ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsEditing(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={loading}>
                            {loading && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Save Changes
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsEditing(true)}
                          >
                            Edit Organization
                          </Button>
                          <Button type="button" onClick={moveToNextStep}>
                            Next <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <div></div>
                      <Button type="submit" disabled={loading}>
                        {loading && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Create Organization
                      </Button>
                    </>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Step 2: Profile Setup
  if (currentStep === "profile") {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between mb-8">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col items-center space-y-2 ${
                completedSteps.includes(step.id)
                  ? "text-primary"
                  : step.id === currentStep
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <img 
                src={completedSteps.includes(step.id) || step.id === currentStep ? step.active : step.icon} 
                alt={step.label} 
                className="w-8 h-8"
              />
              <span className="text-sm">{step.label}</span>
            </div>
          ))}
        </div>
        
        <Card className="mb-8">
          <CardContent className="pt-6">
            <Form {...profileForm}>
              <form
                onSubmit={profileForm.handleSubmit(handleProfileSubmit)}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold">Set Up Your Profile</h2>
                <p className="text-muted-foreground">
                  Personalize your account to get the most out of {organization?.name || "your organization"}.
                </p>
                
                <FormField
                  control={profileForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Jane Doe"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div>
                  <FormLabel>Profile Picture</FormLabel>
                  <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4 items-start mt-2">
                    {avatarPreview ? (
                      <div className="relative h-24 w-24 rounded-full border overflow-hidden">
                        <img
                          src={avatarPreview}
                          alt="Avatar preview"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setAvatarPreview(null);
                            setAvatarFile(null);
                          }}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground h-5 w-5 rounded-full flex items-center justify-center"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-24 w-24 rounded-full border border-dashed border-muted-foreground flex items-center justify-center bg-muted">
                        <span className="text-muted-foreground text-sm text-center px-2">
                          No avatar
                        </span>
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <label
                        htmlFor="avatar-upload"
                        className="flex items-center gap-2 cursor-pointer p-2 bg-muted rounded-md hover:bg-muted/80 text-sm"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Upload picture</span>
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAvatarUpload(file);
                          }}
                        />
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Recommended: 512x512px or larger square image
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goToPreviousStep}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isInvitation ? "Complete Profile" : "Next"}
                    {!isInvitation && <ChevronRight className="ml-2 h-4 w-4" />}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Step 3: Invite Team Members
  if (currentStep === "invite") {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between mb-8">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col items-center space-y-2 ${
                completedSteps.includes(step.id)
                  ? "text-primary"
                  : step.id === currentStep
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <img 
                src={completedSteps.includes(step.id) || step.id === currentStep ? step.active : step.icon} 
                alt={step.label} 
                className="w-8 h-8"
              />
              <span className="text-sm">{step.label}</span>
            </div>
          ))}
        </div>
        
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Invite Team Members</h2>
              <p className="text-muted-foreground">
                Get your team on board. Invite members to join {organization?.name || "your organization"}.
              </p>
              
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {inviteEmails.map((email) => (
                    <div
                      key={email}
                      className="bg-muted px-3 py-1 rounded-full flex items-center gap-2"
                    >
                      <span className="text-sm">{email}</span>
                      <button
                        type="button"
                        onClick={() => removeEmail(email)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="colleague@example.com"
                    value={currentInviteInput}
                    onChange={(e) => setCurrentInviteInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addEmail();
                      }
                    }}
                  />
                  <Button type="button" onClick={addEmail}>
                    Add
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto-join"
                    checked={allowAutoJoin}
                    onCheckedChange={(checked) => 
                      setAllowAutoJoin(checked === true)
                    }
                  />
                  <label
                    htmlFor="auto-join"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Allow anyone with a company email to join automatically
                  </label>
                </div>
                
                <div className="border rounded-md p-4 bg-muted/50 space-y-3">
                  <h3 className="font-medium">Or share invite link</h3>
                  <div className="flex items-center gap-2">
                    <Input
                      value={organization ? `${window.location.origin}/register?invitation=${organization.id}` : ""}
                      readOnly
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={copyInviteLink}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goToPreviousStep}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleInviteSubmit}
                  disabled={loading || (!inviteEmails.length && !allowAutoJoin)}
                >
                  {loading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {inviteEmails.length > 0
                    ? "Send Invitations"
                    : allowAutoJoin
                    ? "Continue"
                    : "Skip for Now"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Step 4: Workspace Setup
  if (currentStep === "workspace") {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between mb-8">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col items-center space-y-2 ${
                completedSteps.includes(step.id)
                  ? "text-primary"
                  : step.id === currentStep
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <img 
                src={completedSteps.includes(step.id) || step.id === currentStep ? step.active : step.icon} 
                alt={step.label} 
                className="w-8 h-8"
              />
              <span className="text-sm">{step.label}</span>
            </div>
          ))}
        </div>
        
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">You're All Set!</h2>
              <p className="text-muted-foreground">
                Your organization is ready to go. Here's a summary of what you've set up:
              </p>
              
              <div className="space-y-4">
                <div className="border rounded-md p-4 bg-muted/50">
                  <div className="flex items-center gap-4">
                    {organization?.logo_url ? (
                      <img
                        src={organization.logo_url}
                        alt={organization.name}
                        className="h-12 w-12 rounded-md object-contain"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center">
                        <span className="text-primary text-lg font-semibold">
                          {organization?.name?.charAt(0) || "O"}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium">{organization?.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {organization?.domain}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-md p-4 bg-muted/50">
                  <h3 className="font-medium mb-2">What's Next?</h3>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Explore your new workspace dashboard</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Set up your team structure and permissions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Start creating your first project</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goToPreviousStep}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={completeOnboarding}
                  disabled={loading}
                >
                  {loading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return null;
}