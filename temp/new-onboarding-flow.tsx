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
import { sendInvitationEmail, checkInvitation, markInvitationAsAccepted } from "@/lib/invitation";
import { Check, Copy } from "lucide-react";

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

interface OnboardingFlowProps {
  isInvitation?: boolean;
  invitationOrgId?: string | null;
}

export function OnboardingFlow({ 
  isInvitation = false, 
  invitationOrgId = null 
}: OnboardingFlowProps = {}) {
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
  
  // Invite state
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [currentInviteInput, setCurrentInviteInput] = useState<string>("");
  const [allowAutoJoin, setAllowAutoJoin] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  
  // No longer checking localStorage - we get invitation data from props

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

        let progress;
        
        if (!existingProgress) {
          // For invited users, start directly at profile step
          // Otherwise, follow normal flow
          const initialStep = isInvitation ? 'profile' : (userHasOrg ? 'profile' : 'organization');
          const initialCompletedSteps = isInvitation ? ['organization'] : (userHasOrg ? ['organization'] : []);
          
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
            console.error('Error creating onboarding progress:', progressError);
            return;
          }

          progress = newProgress;
        } else {
          progress = existingProgress;
        }

        console.log('Onboarding progress loaded:', progress);
        
        // Set current step and completed steps from progress
        if (progress) {
          setCurrentStep(progress.current_step);
          setCompletedSteps(progress.completed_steps || []);
        }

        // Get profile information if available
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('avatar_url, full_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error loading profile:', profileError);
        } else if (profile) {
          // Set avatar preview if profile has an avatar
          if (profile.avatar_url) {
            setAvatarPreview(profile.avatar_url);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading onboarding progress:', error);
        setLoading(false);
      }
    };

    loadOnboardingProgress();
  }, [user, hasOrganization, setHasOrganization, isInvitation]);

  // Save onboarding progress to Supabase
  const saveProgress = async (step: string, completed: string[]) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('onboarding_progress')
        .upsert({
          user_id: user.id,
          current_step: step,
          completed_steps: completed
        });

      if (error) {
        console.error('Error saving onboarding progress:', error);
      }
    } catch (error) {
      console.error('Failed to save onboarding progress:', error);
    }
  };

  // Effect to handle case if user is invited to an organization
  // Join them to the organization automatically
  useEffect(() => {
    const joinInvitedOrg = async () => {
      if (!user || !isInvitation || !invitationOrgId) return;
      
      try {
        console.log("User is invited to organization:", invitationOrgId);
        
        // Check if user is already a member of this organization
        const { data: existingMembership, error: membershipError } = await supabase
          .from('organization_members')
          .select('id')
          .eq('user_id', user.id)
          .eq('organization_id', invitationOrgId)
          .maybeSingle();
          
        if (membershipError) {
          console.error("Error checking membership:", membershipError);
          return;
        }
        
        // If user is already a member, skip
        if (existingMembership) {
          console.log("User is already a member of this organization");
          setHasOrganization(true);
          return;
        }
        
        // If not, add them to the organization
        console.log("Adding user to organization...");
        const { error: joinError } = await supabase
          .from('organization_members')
          .insert({
            user_id: user.id,
            organization_id: invitationOrgId,
            role: 'member'
          });
          
        if (joinError) {
          console.error("Error joining organization:", joinError);
          return;
        }
        
        // Mark the user as having an organization
        setHasOrganization(true);
        
        // Get organization details
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, logo_url')
          .eq('id', invitationOrgId)
          .single();
          
        if (orgError) {
          console.error("Error getting organization details:", orgError);
          return;
        }
        
        // Set organization state
        setOrganization(orgData);
        
        // Set logo preview if organization has a logo
        if (orgData.logo_url) {
          setLogoPreview(orgData.logo_url);
        }
        
        console.log("Successfully joined organization:", orgData.name);
        
        // Mark invitation as accepted if user's email exists
        if (user.email) {
          await markInvitationAsAccepted(user.email, invitationOrgId);
        }
        
        // Show success toast
        toast({
          title: "Joined Organization",
          description: `You've been added to ${orgData.name}!`,
        });
      } catch (error) {
        console.error("Error processing invitation:", error);
      }
    };
    
    joinInvitedOrg();
  }, [user, isInvitation, invitationOrgId, setHasOrganization, toast]);

  const form = useForm<z.infer<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization?.name || "",
    },
  });

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
    },
  });

  // Handle logo file change
  const handleLogoUpload = async (file: File) => {
    try {
      setLogoFile(file);
      const preview = URL.createObjectURL(file);
      setLogoPreview(preview);

      // Upload to Supabase Storage if organization exists
      if (organization?.id) {
        const { data, error } = await uploadToSupabase(file, 'organization-logos');
        
        if (error) {
          throw error;
        }
        
        // Update organization in the database with the new logo URL
        if (data) {
          const { error: updateError } = await supabase
            .from('organizations')
            .update({ logo_url: data.path })
            .eq('id', organization.id);
            
          if (updateError) {
            throw updateError;
          }
        }
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "There was an error uploading your logo. Please try again.",
      });
    }
  };

  // Handle avatar file change
  const handleAvatarUpload = async (file: File) => {
    try {
      setAvatarFile(file);
      const preview = URL.createObjectURL(file);
      setAvatarPreview(preview);

      // Upload to Supabase Storage
      if (user?.id) {
        const { data, error } = await uploadToSupabase(file, 'avatars');
        
        if (error) {
          throw error;
        }
        
        // Update profile in the database with the new avatar URL
        if (data) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: data.path })
            .eq('user_id', user.id);
            
          if (updateError) {
            throw updateError;
          }
        }
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "There was an error uploading your avatar. Please try again.",
      });
    }
  };

  // Helper function for file uploads to Supabase Storage
  const uploadToSupabase = async (file: File, bucketName: string) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    
    // Create a unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${fileName}`;
    
    // Upload the file
    const { data, error } = await supabase
      .storage
      .from(bucketName)
      .upload(filePath, file, { upsert: true });
      
    return { data, error };
  };

  // Function to handle organization form submission
  async function onOrgSubmit(data: z.infer<typeof organizationSchema>) {
    if (!user) return;

    try {
      // Update current step and completed steps
      const newCompletedSteps = [...completedSteps];
      if (!newCompletedSteps.includes("organization")) {
        newCompletedSteps.push("organization");
      }
      setCompletedSteps(newCompletedSteps);

      // If organization exists, just update it
      if (organization?.id) {
        const { error } = await supabase
          .from('organizations')
          .update({ name: data.name })
          .eq('id', organization.id);

        if (error) throw error;

        // Update local state
        setOrganization({ ...organization, name: data.name });
        
        // If editing, exit edit mode
        if (isEditing) {
          setIsEditing(false);
        } else {
          // Move to next step
          const nextStep = "profile";
          setCurrentStep(nextStep);
          await saveProgress(nextStep, newCompletedSteps);
        }
        
        toast({
          title: "Organization Updated",
          description: "Your organization details have been updated.",
        });
        return;
      }

      // Otherwise, create a new organization
      // Insert the organization
      const { data: newOrg, error } = await supabase
        .from('organizations')
        .insert({
          name: data.name,
          logo_url: null, // Will be updated after file upload if needed
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setOrganization(newOrg);
      setHasOrganization(true);

      // Add the user as a member of the organization
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          user_id: user.id,
          organization_id: newOrg.id,
          role: "admin" // First user is admin
        });

      if (memberError) throw memberError;

      // If a logo was uploaded, update the organization with the logo URL
      if (logoFile) {
        const { data: fileData, error: uploadError } = await uploadToSupabase(logoFile, 'organization-logos');
        
        if (uploadError) throw uploadError;
        
        if (fileData) {
          const { error: updateError } = await supabase
            .from('organizations')
            .update({ logo_url: fileData.path })
            .eq('id', newOrg.id);
            
          if (updateError) throw updateError;
          
          // Update local state
          setOrganization({ ...newOrg, logo_url: fileData.path });
        }
      }

      // Move to next step
      const nextStep = "profile";
      setCurrentStep(nextStep);
      await saveProgress(nextStep, newCompletedSteps);

      toast({
        title: "Organization Created",
        description: "Your organization has been created successfully.",
      });
    } catch (error: any) {
      console.error('Error submitting organization:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "There was an error creating your organization.",
      });
    }
  }

  // Function to handle profile form submission
  async function onProfileSubmit(data: z.infer<typeof profileSchema>) {
    if (!user) return;

    try {
      // Update current step and completed steps
      const newCompletedSteps = [...completedSteps];
      if (!newCompletedSteps.includes("profile")) {
        newCompletedSteps.push("profile");
      }
      setCompletedSteps(newCompletedSteps);

      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      // Profile data to upsert
      const profileData = {
        user_id: user.id,
        full_name: data.fullName,
        email: user.email,
        // Only update avatar_url if we have avatarFile
        ...(avatarFile && avatarPreview ? {} : {})
      };

      // If profile exists, update it
      if (existingProfile) {
        const { error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', existingProfile.id);

        if (error) throw error;
      } else {
        // Otherwise, create a new profile
        const { error } = await supabase
          .from('profiles')
          .insert(profileData);

        if (error) throw error;
      }

      // If avatar was uploaded and not already processed, upload it
      if (avatarFile) {
        const { data: fileData, error: uploadError } = await uploadToSupabase(avatarFile, 'avatars');
        
        if (uploadError) throw uploadError;
        
        if (fileData) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: fileData.path })
            .eq('user_id', user.id);
            
          if (updateError) throw updateError;
        }
      }

      // If editing, exit edit mode
      if (isProfileEditing) {
        setIsProfileEditing(false);
      } else {
        // Move to next step
        const nextStep = "invite";
        setCurrentStep(nextStep);
        await saveProgress(nextStep, newCompletedSteps);
      }

      toast({
        title: isProfileEditing ? "Profile Updated" : "Profile Created",
        description: `Your profile has been ${isProfileEditing ? 'updated' : 'created'} successfully.`,
      });
    } catch (error: any) {
      console.error('Error submitting profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "There was an error updating your profile.",
      });
    }
  }

  // Function to handle member invitation
  const handleInvite = async () => {
    if (!user || !organization) return;
    
    // Add the current input if not empty and not already in the list
    if (currentInviteInput.trim() && !inviteEmails.includes(currentInviteInput.trim())) {
      const newEmail = currentInviteInput.trim();
      setInviteEmails([...inviteEmails, newEmail]);
      setCurrentInviteInput("");
      
      try {
        // Send invitation email
        const result = await sendInvitationEmail(
          newEmail, 
          organization.name, 
          '', // Inviter name (if available)
          user.email || '', 
          organization.id,
          user.id
        );
        
        if (!result.success) {
          throw new Error(result.error);
        }
        
        toast({
          title: "Invitation Sent",
          description: `Invitation email sent to ${newEmail}`,
        });
      } catch (error: any) {
        console.error('Error sending invitation:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to send invitation email.",
        });
      }
    }
  };
  
  // Remove an email from the invitation list
  const removeInviteEmail = (email: string) => {
    setInviteEmails(inviteEmails.filter(e => e !== email));
  };
  
  // Generate invitation link
  const getInvitationLink = () => {
    if (!organization) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/register?invitation=true&organization=${organization.id}&ib=${user?.id || 'none'}`;
  };
  
  // Copy invitation link to clipboard
  const copyInvitationLink = () => {
    const link = getInvitationLink();
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Complete invite step
  const completeInviteStep = async () => {
    // Update current step and completed steps
    const newCompletedSteps = [...completedSteps];
    if (!newCompletedSteps.includes("invite")) {
      newCompletedSteps.push("invite");
    }
    setCompletedSteps(newCompletedSteps);
    
    // Move to next step
    const nextStep = "workspace";
    setCurrentStep(nextStep);
    await saveProgress(nextStep, newCompletedSteps);
  };
  
  // Complete workspace step
  const completeWorkspaceStep = async () => {
    // Update current step and completed steps
    const newCompletedSteps = [...completedSteps];
    if (!newCompletedSteps.includes("workspace")) {
      newCompletedSteps.push("workspace");
    }
    setCompletedSteps(newCompletedSteps);
    
    // Save progress
    await saveProgress("workspace", newCompletedSteps);
    
    // Redirect to dashboard or home
    setLocation("/dashboard");
  };

  // Function to move to the next step
  const moveToNextStep = () => {
    const currentIndex = steps.findIndex((step) => step.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    } else {
      // Complete onboarding, redirect to dashboard
      setLocation("/dashboard");
    }
  };

  // Function to go back to the previous step
  const goToPreviousStep = () => {
    const currentIndex = steps.findIndex((step) => step.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#407c87]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Progress indicator */}
        <div className="flex justify-between items-center p-4 border-b">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex flex-col items-center ${
                completedSteps.includes(step.id)
                  ? "text-[#407c87]"
                  : currentStep === step.id
                  ? "text-[#407c87]"
                  : "text-gray-400"
              }`}
            >
              <div className="flex items-center">
                {index > 0 && (
                  <div
                    className={`h-px w-10 ${
                      completedSteps.includes(steps[index - 1].id)
                        ? "bg-[#407c87]"
                        : "bg-gray-300"
                    }`}
                  />
                )}
                <div
                  className={`flex items-center justify-center h-10 w-10 rounded-full ${
                    completedSteps.includes(step.id)
                      ? "bg-[#407c87] text-white"
                      : currentStep === step.id
                      ? "border-2 border-[#407c87] text-[#407c87]"
                      : "border-2 border-gray-300 text-gray-400"
                  }`}
                >
                  {completedSteps.includes(step.id) ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-px w-10 ${
                      completedSteps.includes(step.id)
                        ? "bg-[#407c87]"
                        : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
              <span className="text-sm mt-2 font-medium">{step.label}</span>
            </div>
          ))}
        </div>

        {/* Organization setup step */}
        {currentStep === "organization" && (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {organization ? "Organization Details" : "Set Up Your Organization"}
            </h2>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onOrgSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">
                        Organization Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Acme Corporation"
                          className="h-12"
                          {...field}
                          disabled={!isEditing && !!organization}
                          value={isEditing || !organization ? field.value : (organization?.name || '')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Organization Logo</FormLabel>
                      <div className="flex items-center space-x-4">
                        {/* Logo preview */}
                        {logoPreview ? (
                          <div className="relative">
                            <img
                              src={logoPreview}
                              alt="Organization logo preview"
                              className="h-20 w-20 object-cover rounded-md border"
                            />
                            {(isEditing || !organization) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setLogoPreview(null);
                                  setLogoFile(null);
                                  field.onChange(null);
                                }}
                                className="absolute -top-2 -right-2 h-6 w-6 bg-rose-500 text-white rounded-full flex items-center justify-center"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="h-20 w-20 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center text-gray-400">
                            <span className="text-xl">Logo</span>
                          </div>
                        )}

                        {/* Upload button (only show if editing or creating new) */}
                        {(isEditing || !organization) && (
                          <FormControl>
                            <div>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-12"
                                onClick={() => {
                                  const input = document.createElement("input");
                                  input.type = "file";
                                  input.accept = "image/*";
                                  input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement)
                                      .files?.[0];
                                    if (file) {
                                      handleLogoUpload(file);
                                      field.onChange(file);
                                    }
                                  };
                                  input.click();
                                }}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Logo
                              </Button>
                              <div className="text-xs text-gray-500 mt-1">
                                Recommended: Square image, at least 256x256px
                              </div>
                            </div>
                          </FormControl>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between pt-4">
                  {/* Edit/Cancel Button - only show if organization exists */}
                  {organization && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (isEditing) {
                          // Cancel editing - reset form
                          form.reset({
                            name: organization.name || "",
                          });
                          setIsEditing(false);
                        } else {
                          // Start editing
                          setIsEditing(true);
                        }
                      }}
                    >
                      {isEditing ? "Cancel" : "Edit Organization"}
                    </Button>
                  )}

                  {/* Submit/Next Button */}
                  <Button 
                    type="submit" 
                    className="bg-[#407c87] hover:bg-[#386d77] ml-auto"
                    disabled={organization && !isEditing}
                  >
                    {organization 
                      ? (isEditing ? "Save Changes" : "Next") 
                      : "Create Organization"
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {/* Profile setup step */}
        {currentStep === "profile" && (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Set Up Your Profile
            </h2>

            <Form {...profileForm}>
              <form
                onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={profileForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Doe"
                          className="h-12"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="avatar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Profile Picture</FormLabel>
                      <div className="flex items-center space-x-4">
                        {/* Avatar preview */}
                        {avatarPreview ? (
                          <div className="relative">
                            <img
                              src={avatarPreview}
                              alt="Avatar preview"
                              className="h-20 w-20 object-cover rounded-full border"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setAvatarPreview(null);
                                setAvatarFile(null);
                                field.onChange(null);
                              }}
                              className="absolute -top-2 -right-2 h-6 w-6 bg-rose-500 text-white rounded-full flex items-center justify-center"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="h-20 w-20 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center text-gray-400">
                            <span className="text-xl">Avatar</span>
                          </div>
                        )}

                        {/* Upload button */}
                        <FormControl>
                          <div>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-12"
                              onClick={() => {
                                const input = document.createElement("input");
                                input.type = "file";
                                input.accept = "image/*";
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement)
                                    .files?.[0];
                                  if (file) {
                                    handleAvatarUpload(file);
                                    field.onChange(file);
                                  }
                                };
                                input.click();
                              }}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Picture
                            </Button>
                            <div className="text-xs text-gray-500 mt-1">
                              Recommended: Square image, at least 256x256px
                            </div>
                          </div>
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goToPreviousStep}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>

                  <Button type="submit" className="bg-[#407c87] hover:bg-[#386d77]">
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}
        
        {/* Invite team members step */}
        {currentStep === "invite" && (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Invite Your Team
            </h2>
            <p className="text-gray-600 mb-6">
              Invite team members to join your organization.
            </p>
            
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium mb-4">Share Invitation Link</h3>
                <div className="flex items-center mb-4">
                  <Input 
                    value={getInvitationLink()}
                    readOnly
                    className="h-12 mr-2 flex-grow"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 flex-shrink-0"
                    onClick={copyInvitationLink}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                
                <div className="flex items-center">
                  <Checkbox 
                    id="autoJoin" 
                    checked={allowAutoJoin}
                    onCheckedChange={(checked) => setAllowAutoJoin(checked as boolean)}
                    className="mr-2"
                  />
                  <label htmlFor="autoJoin" className="text-sm text-gray-700">
                    Allow anyone with this link to join your organization
                  </label>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium mb-4">Invite by Email</h3>
                <div className="flex items-center mb-4">
                  <Input 
                    value={currentInviteInput}
                    onChange={(e) => setCurrentInviteInput(e.target.value)}
                    placeholder="colleague@example.com"
                    type="email"
                    className="h-12 mr-2 flex-grow"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleInvite();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    className="h-12 bg-[#407c87] hover:bg-[#386d77] flex-shrink-0"
                    onClick={handleInvite}
                  >
                    Invite
                  </Button>
                </div>
                
                {/* List of invited emails */}
                {inviteEmails.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Invited team members:</h4>
                    <div className="space-y-2">
                      {inviteEmails.map((email, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                          <span className="text-sm">{email}</span>
                          <button
                            type="button"
                            onClick={() => removeInviteEmail(email)}
                            className="text-gray-500 hover:text-rose-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
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
                className="bg-[#407c87] hover:bg-[#386d77]"
                onClick={completeInviteStep}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Workspace setup step */}
        {currentStep === "workspace" && (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Set Up Your Workspace
            </h2>
            <p className="text-gray-600 mb-6">
              Configure your organization's workspace settings.
            </p>
            
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <h3 className="text-lg font-medium mb-2">You're All Set!</h3>
                  <p className="text-gray-600">
                    Your organization is now set up and ready to go. You can invite more team members later.
                  </p>
                </div>
              </CardContent>
            </Card>
            
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
                className="bg-[#407c87] hover:bg-[#386d77]"
                onClick={completeWorkspaceStep}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
