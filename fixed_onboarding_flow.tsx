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
      let avatarUrl = avatarFile ? await uploadToSupabase(avatarFile, "avatars") : avatarPreview;
      
      // Check if profile exists
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
        
      if (profileCheckError) throw profileCheckError;
      
      // Update or insert profile
      if (existingProfile) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            name: data.fullName,
            avatar_url: avatarUrl,
            organization_id: orgId,
          })
          .eq("user_id", user.id);
          
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
            email: user.email,
          });
          
        if (insertError) throw insertError;
      }
      
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
      
      // Update progress
      const newCompleted = [...completedSteps, "profile"];
      setCompletedSteps(newCompleted);
      await saveProgress("invite", newCompleted);
      
      setIsProfileEditing(false);
      moveToNextStep();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update profile",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle logo upload
  const handleLogoUpload = async (file: File) => {
    if (!file) return;
    
    // Validate file type
    const fileType = file.type;
    if (!fileType.match(/image\/(png|jpg|jpeg|gif)/i)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a PNG, JPG, or GIF image",
      });
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload an image smaller than 2MB",
      });
      return;
    }
    
    // Update state
    setLogoFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // Handle avatar upload
  const handleAvatarUpload = async (file: File) => {
    if (!file) return;
    
    // Validate file type
    const fileType = file.type;
    if (!fileType.match(/image\/(png|jpg|jpeg|gif)/i)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a PNG, JPG, or GIF image",
      });
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload an image smaller than 2MB",
      });
      return;
    }
    
    // Update state
    setAvatarFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // Upload file to Supabase storage
  const uploadToSupabase = async (file: File, bucketName: string) => {
    try {
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${bucketName === "organizations" ? "org" : "avatar"}-${timestamp}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });
        
      if (error) throw error;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);
        
      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  };
  
  // Function to handle inviting users
  const handleSendInvitations = async () => {
    try {
      if (!user?.id || !organization?.id) {
        throw new Error("Missing required information to send invitations");
      }
      
      setLoading(true);
      
      // Create invitations in DB and send emails
      for (const email of inviteEmails) {
        // First check if invitation already exists
        const { data: existingInvitation, error: checkError } = await supabase
          .from("invitations")
          .select("*")
          .eq("email", email)
          .eq("organization_id", organization.id)
          .maybeSingle();
          
        if (checkError) throw checkError;
        
        // Skip if invitation already exists
        if (existingInvitation) {
          console.log(`Invitation for ${email} already exists`);
          continue;
        }
        
        // Create invitation record
        const { error: inviteError } = await supabase
          .from("invitations")
          .insert({
            email: email,
            organization_id: organization.id,
            invited_by: user.id,
            allow_auto_join: allowAutoJoin,
          });
          
        if (inviteError) throw inviteError;
        
        // Send invitation email (implement this)
        // This would connect to your email service
        try {
          await sendInvitationEmail(email, organization);
        } catch (emailError) {
          console.error("Error sending invitation email:", emailError);
        }
      }
      
      // Update progress
      const newCompleted = [...completedSteps, "invite"];
      setCompletedSteps(newCompleted);
      await saveProgress("workspace", newCompleted);
      
      toast({
        title: "Success",
        description: `Sent ${inviteEmails.length} invitations successfully!`,
      });
      
      // Clear invitation list
      setInviteEmails([]);
      setCurrentInviteInput("");
      
      moveToNextStep();
    } catch (error: any) {
      console.error("Error sending invitations:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send invitations",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Skip invitations step
  const handleSkipInvitations = async () => {
    try {
      const newCompleted = [...completedSteps, "invite"];
      setCompletedSteps(newCompleted);
      await saveProgress("workspace", newCompleted);
      moveToNextStep();
    } catch (error) {
      console.error("Error skipping invitations:", error);
    }
  };
  
  // Function to add invitation email
  const handleAddInviteEmail = () => {
    if (!currentInviteInput.trim()) return;
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(currentInviteInput)) {
      toast({
        variant: "destructive",
        title: "Invalid email",
        description: "Please enter a valid email address",
      });
      return;
    }
    
    // Add to array if not already there
    if (!inviteEmails.includes(currentInviteInput)) {
      setInviteEmails([...inviteEmails, currentInviteInput]);
      setCurrentInviteInput("");
    } else {
      toast({
        title: "Duplicate email",
        description: "This email is already in your invitation list",
      });
    }
  };
  
  // Function to remove invitation email
  const handleRemoveInviteEmail = (email: string) => {
    setInviteEmails(inviteEmails.filter(e => e !== email));
  };
  
  // Function to copy invitation link
  const handleCopyInviteLink = async () => {
    if (!organization?.id) return;
    
    try {
      // Generate and copy invite link
      const inviteLink = `${window.location.origin}/invitation?orgId=${organization.id}`;
      await navigator.clipboard.writeText(inviteLink);
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Copied",
        description: "Invitation link copied to clipboard!",
      });
    } catch (error) {
      console.error("Failed to copy invitation link:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy invitation link",
      });
    }
  };
  
  // Function to go to next step
  const moveToNextStep = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    } else {
      // We've completed all steps, redirect to dashboard
      setLocation("/dashboard");
    }
  };
  
  // Skip workspace setup
  const handleCompleteWorkspace = async () => {
    try {
      const newCompleted = [...completedSteps, "workspace"];
      setCompletedSteps(newCompleted);
      await saveProgress("completed", newCompleted);
      
      toast({
        title: "Success!",
        description: "Onboarding completed successfully!",
      });
      
      // Redirect to dashboard
      setLocation("/dashboard");
    } catch (error) {
      console.error("Error completing workspace:", error);
    }
  };

  // If loading, show spinner
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading...</span>
      </div>
    );
  }

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case "organization":
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">
              {organization && !isEditing
                ? "Organization Details"
                : "Create Your Organization"}
            </h2>
            <p className="text-muted-foreground">
              {organization && !isEditing
                ? "Review or edit your organization details"
                : "Let's set up your organization for team collaboration"}
            </p>

            {organization && !isEditing ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Organization logo"
                      className="h-16 w-16 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted">
                      <span className="text-3xl font-semibold text-muted-foreground">
                        {organization.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-medium">{organization.name}</h3>
                    <p className="text-sm text-muted-foreground">{organization.domain}</p>
                  </div>
                </div>
                <Button onClick={() => setIsEditing(true)}>
                  Edit Organization
                </Button>
              </div>
            ) : (
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

                  <div className="space-y-2">
                    <FormLabel>Logo (optional)</FormLabel>
                    <div className="flex items-center space-x-4">
                      {logoPreview ? (
                        <div className="relative h-24 w-24">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="h-24 w-24 rounded-md object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setLogoFile(null);
                              setLogoPreview(null);
                            }}
                            className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-md border border-dashed border-gray-300 hover:border-primary">
                          <label htmlFor="logo-upload" className="cursor-pointer">
                            <div className="flex flex-col items-center">
                              <Upload className="h-6 w-6 text-muted-foreground" />
                              <span className="mt-1 text-xs text-muted-foreground">
                                Upload
                              </span>
                            </div>
                            <input
                              id="logo-upload"
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleLogoUpload(file);
                                }
                              }}
                            />
                          </label>
                        </div>
                      )}
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          Upload your organization logo
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG or GIF. Max 2MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    {organization && isEditing && (
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
                      {organization && isEditing
                        ? "Update Organization"
                        : "Create Organization & Continue"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>
        );
      case "profile":
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">
              {isProfileEditing ? "Edit Your Profile" : "Set Up Your Profile"}
            </h2>
            <p className="text-muted-foreground">
              Tell us about yourself to personalize your experience
            </p>

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
                  <FormLabel>Profile picture (optional)</FormLabel>
                  <div className="flex items-center space-x-4">
                    {avatarPreview ? (
                      <div className="relative h-24 w-24">
                        <img
                          src={avatarPreview}
                          alt="Avatar preview"
                          className="h-24 w-24 rounded-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setAvatarFile(null);
                            setAvatarPreview(null);
                          }}
                          className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border border-dashed border-gray-300 hover:border-primary">
                        <label htmlFor="avatar-upload" className="cursor-pointer">
                          <div className="flex flex-col items-center">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <span className="mt-1 text-xs text-muted-foreground">
                              Upload
                            </span>
                          </div>
                          <input
                            id="avatar-upload"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleAvatarUpload(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        Upload your profile picture
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG or GIF. Max 2MB.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (completedSteps.includes("organization")) {
                        setCurrentStep("organization");
                      }
                    }}
                    disabled={!completedSteps.includes("organization")}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isProfileEditing ? "Update Profile" : "Save & Continue"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        );
      case "invite":
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">
              Invite Team Members
            </h2>
            <p className="text-muted-foreground">
              Grow your team by inviting colleagues to join your organization
            </p>

            <div className="space-y-6">
              <div className="flex space-x-2">
                <Input
                  value={currentInviteInput}
                  onChange={(e) => setCurrentInviteInput(e.target.value)}
                  placeholder="Enter email address"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddInviteEmail();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddInviteEmail}>
                  Add
                </Button>
              </div>

              {inviteEmails.length > 0 && (
                <div className="rounded-md border p-4">
                  <h3 className="mb-2 font-medium">Inviting {inviteEmails.length} people</h3>
                  <div className="space-y-2">
                    {inviteEmails.map((email) => (
                      <div key={email} className="flex items-center justify-between rounded-md bg-muted p-2">
                        <span className="text-sm">{email}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveInviteEmail(email)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto-join"
                  checked={allowAutoJoin}
                  onCheckedChange={(checked) => setAllowAutoJoin(!!checked)}
                />
                <label
                  htmlFor="auto-join"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Allow invited users to join automatically
                </label>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Or share invitation link</div>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleCopyInviteLink}
                  >
                    {copied ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    {copied ? "Copied!" : "Copy invitation link"}
                  </Button>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (completedSteps.includes("profile")) {
                      setCurrentStep("profile");
                    }
                  }}
                  disabled={!completedSteps.includes("profile")}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkipInvitations}
                >
                  Skip for now
                </Button>
                <Button
                  type="button"
                  onClick={handleSendInvitations}
                  disabled={inviteEmails.length === 0 || loading}
                >
                  {loading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Send Invitations & Continue
                </Button>
              </div>
            </div>
          </div>
        );
      case "workspace":
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">
              Set Up Your Workspace
            </h2>
            <p className="text-muted-foreground">
              Configure your workspace to start collaborating with your team
            </p>

            <div className="rounded-md bg-muted p-4 text-center">
              <h3 className="mb-2 text-lg font-medium">🎉 Almost there!</h3>
              <p className="text-sm text-muted-foreground">
                You've completed the essential setup. You can now access your workspace or
                continue customizing it.
              </p>
            </div>

            <div className="flex space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (completedSteps.includes("invite")) {
                    setCurrentStep("invite");
                  }
                }}
                disabled={!completedSteps.includes("invite")}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleCompleteWorkspace}>
                Complete & Go to Dashboard
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6 lg:p-8">
      {/* Progress steps */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            {isInvitation ? "Complete Your Account Setup" : "Welcome to Qwenzy"}
          </h1>
        </div>

        <div className="relative mt-8 flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                  completedSteps.includes(step.id)
                    ? "border-primary bg-primary text-primary-foreground"
                    : currentStep === step.id
                    ? "border-primary text-primary"
                    : "border-muted-foreground text-muted-foreground"
                }`}
              >
                {completedSteps.includes(step.id) ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={`mt-2 text-sm ${
                  currentStep === step.id
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}

          {/* Connector lines */}
          <div className="absolute left-0 top-5 -z-10 h-0.5 w-full bg-muted-foreground/20">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${
                  (steps.findIndex((step) => step.id === currentStep) /
                    (steps.length - 1)) *
                  100
                }%`,
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Step content */}
      <Card className="w-full">
        <CardContent className="pt-6">{renderStepContent()}</CardContent>
      </Card>
    </div>
  );
}