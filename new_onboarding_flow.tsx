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
import { WorkspaceSection } from "./workspace-section";
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
  orgId?: string | null;
}

export function OnboardingFlow({orgId}: OnboardingFlowProps) {
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

        let progress;
        
        if (!existingProgress) {
          // For invited users, start directly at profile step
          // Otherwise, follow normal flow
          const initialStep = isInvitation ? 'profile' : (userHasOrg ? 'profile' : 'organization');
          const initialCompletedSteps = isInvitation ? ['organization'] : (userHasOrg ? ['organization'] : []);
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

  // Handle orgId parameter similar to invitation flow
  useEffect(() => {
    if (orgId && user && invitationChecked && !isInvitation) {
      // For users with direct orgId parameter, skip to profile setup
      const handleDirectOrgId = async () => {
        try {
          setLoading(true);
          
          // First check if the user is already a member
          const { data: memberships, error: membershipError } = await supabase
            .from("organization_members")
            .select("organization_id")
            .eq("user_id", user.id)
            .eq("organization_id", orgId)
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
            .eq("id", orgId)
            .single();
            
          if (error) {
            console.error("Error loading organization:", error);
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
              organization_id: orgId,
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
          
        } catch (error) {
          console.error("Error in direct orgId flow:", error);
        } finally {
          setLoading(false);
        }
      };
      
      handleDirectOrgId();
    }
  }, [user, orgId, setHasOrganization, invitationChecked, isInvitation]);

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
      name: organization?.name || ""},
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
      const emailDomain = user?.email.split("@")[1]; 
      const finalDomain = emailDomain;
      
      setLoading(true);

      // Upload logo if exists
      let logoUrl = logoFile ? await uploadToSupabase(logoFile, "organizations") : organization?.logo_url;

      if (organization) {
        // Update existing organization
        const { error: updateError } = await supabase
          .from("organizations")
          .update({
            name: data.name,
            domain: finalDomain,
            logo_url: logoUrl,
          })
          .eq('id', organization.id);

        if (updateError) throw updateError;

        setOrganization({
          ...organization,
          name: data.name,
          domain: finalDomain,
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
            domain: finalDomain,
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
      // For direct orgId parameter, use that
      // Otherwise use the organization from state
      let organizationId = organization?.id;
      if (isInvitation && invitationOrgId) {
        organizationId = invitationOrgId;
      } else if (orgId) {
        organizationId = orgId;
      }
      
      if (!organizationId) throw new Error("Missing organization information");

      setLoading(true);

      // Upload avatar if exists
      let avatarUrl = null;
      if (avatarFile) {
        avatarUrl = await uploadToSupabase(avatarFile, "avatars");
      } else if (avatarPreview) {
        avatarUrl = avatarPreview;
      }

      // Extract first and last name from full name
      const nameParts = data.fullName.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (checkError && checkError.code !== "PGRST116") {
        // "PGRST116" is the code when no rows are returned
        throw checkError;
      }

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase.from("profiles").update({
          name: data.fullName,
          first_name: firstName,
          last_name: lastName,
          email: user.email,
          avatar_url: avatarUrl,
          organization_id: organizationId,
        }).eq("id", existingProfile.id);

        if (updateError) throw updateError;

        toast({
          title: "Success",
          description: "Profile updated successfully!",
        });

        setIsProfileEditing(false);
      } else {
        // Create new profile
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            name: data.fullName,
            first_name: firstName,
            last_name: lastName,
            email: user.email,
            avatar_url: avatarUrl,
            organization_id: organizationId,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        toast({
          title: "Success",
          description: "Profile created successfully!",
        });
      }

      // Update progress
      const newCompleted = [...completedSteps];
      if (!newCompleted.includes("profile")) {
        newCompleted.push("profile");
      }
      setCompletedSteps(newCompleted);
      await saveProgress("invite", newCompleted);

      // Mark invitation as accepted if applicable
      if (isInvitation && invitationOrgId && user?.email) {
        try {
          await markInvitationAsAccepted(user.email, invitationOrgId);

        } catch (invitationError) {
          console.error("Error marking invitation as accepted:", invitationError);
        }
      }

      moveToNextStep();
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

  // Handle logo file selection
  const handleLogoUpload = async (file: File) => {
    if (!file) return;
    
    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    
    if (!validTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Only JPG, PNG, and GIF files are allowed",
      });
      return;
    }
    
    // Check file size (max 800KB)
    const maxSize = 800 * 1024; // 800KB
    if (file.size > maxSize) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "File size must be less than 800KB",
      });
      return;
    }
    
    // Set file for later upload
    setLogoFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // Handle avatar file selection
  const handleAvatarUpload = async (file: File) => {
    if (!file) return;
    
    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    
    if (!validTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Only JPG, PNG, and GIF files are allowed",
      });
      return;
    }
    
    // Check file size (max 800KB)
    const maxSize = 800 * 1024; // 800KB
    if (file.size > maxSize) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "File size must be less than 800KB",
      });
      return;
    }
    
    // Set file for later upload
    setAvatarFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload file to Supabase storage
  const uploadToSupabase = async (file: File, bucketName: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        variant: "destructive",
        title: "Upload Error",
        description: error.message || "Failed to upload file",
      });
      return null;
    }
  };

  // Move to next step
  const moveToNextStep = () => {
    const currentIndex = steps.findIndex((step) => step.id === currentStep);
    if (currentIndex >= 0 && currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1].id;
      setCurrentStep(nextStep);
      saveProgress(nextStep, completedSteps);
    }
  };

  // Move to previous step
  const moveToPreviousStep = () => {
    const currentIndex = steps.findIndex((step) => step.id === currentStep);
    if (currentIndex > 0) {
      const prevStep = steps[currentIndex - 1].id;
      setCurrentStep(prevStep);
      saveProgress(prevStep, completedSteps);
    }
  };

  // Submit invite form
  const handleInviteSubmit = async () => {
    try {
      if (!user?.id) throw new Error("Missing user information");
      const orgId = organization?.id;
      if (!orgId) throw new Error("Missing organization information");

      setLoading(true);

      // Send invitations
      if (inviteEmails.length > 0) {
        for (const email of inviteEmails) {
          // First check if invitation already exists for this email and organization
          const { data: existingInvitation, error: checkError } = await supabase
            .from("invitations")
            .select("id")
            .eq("email", email)
            .eq("organization_id", orgId)
            .maybeSingle();

          if (checkError) throw checkError;

          if (!existingInvitation) {
            // Create invitation record
            const { error: invitationError } = await supabase
              .from("invitations")
              .insert({
                email,
                organization_id: orgId,
                invited_by: user.id,
                status: "pending",
                auto_join: allowAutoJoin,
              });

            if (invitationError) throw invitationError;

            // Send email notification
            await sendInvitationEmail(email, user.id, orgId);
          }
        }

        toast({
          title: "Success",
          description: `Sent ${inviteEmails.length} invitation(s)`,
        });
      }

      // Update progress
      const newCompleted = [...completedSteps];
      if (!newCompleted.includes("invite")) {
        newCompleted.push("invite");
      }
      setCompletedSteps(newCompleted);
      await saveProgress("workspace", newCompleted);

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

  // Skip invite step
  const skipInviteStep = async () => {
    try {
      // Update progress
      const newCompleted = [...completedSteps];
      if (!newCompleted.includes("invite")) {
        newCompleted.push("invite");
      }
      setCompletedSteps(newCompleted);
      await saveProgress("workspace", newCompleted);

      moveToNextStep();
    } catch (error) {
      console.error("Error skipping invite step:", error);
    }
  };

  // Handle completion of workspace step
  const completeWorkspaceStep = async () => {
    try {
      // Update progress
      const newCompleted = [...completedSteps];
      if (!newCompleted.includes("workspace")) {
        newCompleted.push("workspace");
      }
      setCompletedSteps(newCompleted);
      await saveProgress("complete", newCompleted);

      // Redirect to dashboard
      setLocation("/dashboard");
    } catch (error) {
      console.error("Error completing workspace step:", error);
    }
  };

  // Manage invite email list
  const handleAddEmail = () => {
    if (!currentInviteInput) return;

    // Basic email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(currentInviteInput)) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address",
      });
      return;
    }

    // Add to list if not already included
    if (!inviteEmails.includes(currentInviteInput)) {
      setInviteEmails([...inviteEmails, currentInviteInput]);
      setCurrentInviteInput("");
    } else {
      toast({
        variant: "destructive",
        title: "Duplicate Email",
        description: "This email is already in your invite list",
      });
    }
  };

  const handleRemoveEmail = (email: string) => {
    setInviteEmails(inviteEmails.filter((e) => e !== email));
  };

  const handleCopyInviteLink = async () => {
    try {
      const orgId = organization?.id;
      if (!orgId) return;

      // Create a shareable invite link
      const inviteLink = `${window.location.origin}/join?org=${orgId}`;
      await navigator.clipboard.writeText(inviteLink);

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      toast({
        title: "Success",
        description: "Invite link copied to clipboard",
      });
    } catch (error) {
      console.error("Error copying invite link:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy invite link",
      });
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to Qwenzy</h1>
        <p className="text-muted-foreground">
          Let's get you set up with your workspace
        </p>
      </div>

      {/* Progress steps */}
      <div className="flex justify-between mb-8 w-full">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = completedSteps.includes(step.id);
          const isUpcoming = !isActive && !isCompleted;

          return (
            <div
              key={step.id}
              className={`flex flex-col items-center w-1/4 relative ${
                index > 0 ? "ml-4" : ""
              }`}
            >
              {/* Connector line */}
              {index > 0 && (
                <div
                  className={`absolute h-[2px] w-full -left-4 top-5 -z-10 ${
                    isCompleted || (isActive && completedSteps.includes(steps[index - 1].id))
                      ? "bg-primary"
                      : "bg-muted"
                  }`}
                ></div>
              )}

              {/* Step circle */}
              <div
                className={`rounded-full flex items-center justify-center w-10 h-10 mb-2
                ${isActive ? "bg-primary text-primary-foreground" : ""}
                ${isCompleted ? "bg-primary/90 text-primary-foreground" : ""}
                ${isUpcoming ? "bg-muted text-muted-foreground" : ""}
                `}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              {/* Step label */}
              <span
                className={`text-sm font-medium ${
                  isActive || isCompleted ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          {(currentStep === "organization" && !isInvitation) && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Organization Setup</h2>
                {organization && !isEditing && (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                )}
              </div>

              {organization && !isEditing ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Organization logo"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-bold text-muted-foreground">
                          {organization.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-medium">{organization.name}</h3>
                      <p className="text-muted-foreground">{organization.domain}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button
                      onClick={moveToNextStep}
                      disabled={loading}
                      className="gap-2"
                    >
                      Continue to Profile
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
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
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Inc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <FormLabel>Organization Logo</FormLabel>
                      <div className="flex items-start gap-4">
                        <div className="h-20 w-20 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                          {logoPreview ? (
                            <img
                              src={logoPreview}
                              alt="Organization logo preview"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-muted-foreground">No logo</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="relative">
                            <Input
                              type="file"
                              accept="image/jpeg,image/png,image/gif"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleLogoUpload(e.target.files[0]);
                                }
                              }}
                              className="opacity-0 absolute inset-0 cursor-pointer z-10"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="gap-2 w-full"
                            >
                              <Upload className="h-4 w-4" />
                              Upload a logo
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Recommended: Square JPG, PNG, or GIF, max 800KB
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      {isEditing && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                          disabled={loading}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {organization ? "Update Organization" : "Create Organization"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </div>
          )}

          {currentStep === "profile" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Profile Setup</h2>
                {avatarPreview && !isProfileEditing && (
                  <Button variant="outline" onClick={() => setIsProfileEditing(true)}>
                    Edit
                  </Button>
                )}
              </div>

              {avatarPreview && !isProfileEditing ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                      <img
                        src={avatarPreview}
                        alt="Profile avatar"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-medium">{profileForm.getValues().fullName}</h3>
                      <p className="text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={moveToPreviousStep}
                      disabled={loading || isInvitation}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={moveToNextStep}
                      disabled={loading}
                      className="gap-2"
                    >
                      Continue to Invites
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
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
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <FormLabel>Profile Picture</FormLabel>
                      <div className="flex items-start gap-4">
                        <div className="h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                          {avatarPreview ? (
                            <img
                              src={avatarPreview}
                              alt="Profile avatar preview"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-muted-foreground">No image</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="relative">
                            <Input
                              type="file"
                              accept="image/jpeg,image/png,image/gif"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleAvatarUpload(e.target.files[0]);
                                }
                              }}
                              className="opacity-0 absolute inset-0 cursor-pointer z-10"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="gap-2 w-full"
                            >
                              <Upload className="h-4 w-4" />
                              Upload a photo
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Recommended: Square JPG, PNG, or GIF, max 800KB
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      {!isInvitation && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={moveToPreviousStep}
                          disabled={loading}
                        >
                          <ChevronLeft className="h-4 w-4 mr-2" />
                          Back
                        </Button>
                      )}
                      <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isProfileEditing ? "Update Profile" : "Save and Continue"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </div>
          )}

          {currentStep === "invite" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Invite Team Members</h2>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Addresses</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="colleague@example.com"
                      value={currentInviteInput}
                      onChange={(e) => setCurrentInviteInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddEmail();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={handleAddEmail}
                      disabled={!currentInviteInput}
                    >
                      Add
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter email addresses to invite team members
                  </p>
                </div>

                {/* Email list */}
                <div className="space-y-2">
                  {inviteEmails.length > 0 ? (
                    <div className="border rounded-md divide-y">
                      {inviteEmails.map((email) => (
                        <div
                          key={email}
                          className="flex items-center justify-between p-3"
                        >
                          <span>{email}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveEmail(email)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm italic">
                      No team members added yet
                    </p>
                  )}
                </div>

                {/* Copy invite link */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={handleCopyInviteLink}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      Copy Invite Link
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <Checkbox
                      id="auto-join"
                      checked={allowAutoJoin}
                      onCheckedChange={(checked) =>
                        setAllowAutoJoin(checked === true)
                      }
                    />
                    <label
                      htmlFor="auto-join"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Allow invitees to join automatically
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={moveToPreviousStep}
                    disabled={loading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={skipInviteStep}
                    disabled={loading}
                  >
                    Skip
                  </Button>
                  <Button
                    type="button"
                    onClick={handleInviteSubmit}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {inviteEmails.length > 0
                      ? "Send Invites & Continue"
                      : "Continue"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {currentStep === "workspace" && (
            <WorkspaceSection
              user={user}
              organization={organization}
              completedSteps={completedSteps}
              setCompletedSteps={setCompletedSteps}
              saveProgress={saveProgress}
              setCurrentStep={setCurrentStep}
              moveToNextStep={completeWorkspaceStep}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}