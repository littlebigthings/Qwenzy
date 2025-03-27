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
import { checkUserInvitations } from "@/lib/check-invitation-status";

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
    label: "Invites",
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

const organizationFormSchema = z.object({
  name: z.string().min(3, "Organization name must be at least 3 characters"),
});

const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  title: z.string().min(2, "Title must be at least 2 characters"),
  bio: z.string().optional(),
});

const inviteFormSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

const workspaceFormSchema = z.object({
  setupComplete: z.boolean(),
});

interface OnboardingFlowProps {
  isInvitation?: boolean;
  invitationOrgId?: string | null;
}

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
  const [invitationSent, setInvitationSent] = useState(false);
  const [inviteLink, setInviteLink] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [isInvitation, setIsInvitation] = useState(false);
  const [invitationOrgId, setInvitationOrgId] = useState<string | null>(null);
  
  // Forms for different steps
  const organizationForm = useForm<z.infer<typeof organizationFormSchema>>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: "",
    },
  });

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      title: "",
      bio: "",
    },
  });

  const inviteForm = useForm<z.infer<typeof inviteFormSchema>>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
    },
  });

  const workspaceForm = useForm<z.infer<typeof workspaceFormSchema>>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: {
      setupComplete: false,
    },
  });

  // Check URL params for invitation
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const invitation = searchParams.get('invitation');
    const orgId = searchParams.get('organization');
    
    if (invitation === 'true' && orgId) {
      console.log('[OnboardingFlow] Invitation detected in URL params:', { orgId });
      setIsInvitation(true);
      setInvitationOrgId(orgId);
      
      // For invited users, start with profile step
      setCurrentStep("profile");
    }
  }, []);

  // Check user's invitations in the database
  useEffect(() => {
    const checkInvitationStatus = async () => {
      if (!user?.email) return;
      
      // Only check if we haven't already determined status from URL
      if (!isInvitation) {
        try {
          const { hasInvitation, organizationId } = await checkUserInvitations(user.email);
          
          if (hasInvitation && organizationId) {
            console.log('[OnboardingFlow] Invitation found in database:', { organizationId });
            setIsInvitation(true);
            setInvitationOrgId(organizationId);
            setCurrentStep("profile");
          }
        } catch (error) {
          console.error('[OnboardingFlow] Error checking invitation status:', error);
        }
      }
    };
    
    checkInvitationStatus();
  }, [user, isInvitation]);

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
          console.log("Organization found:", memberships.organizations);
          setOrganization(memberships.organizations as Organization);
        }

        // If the user is part of an invitation flow, load the organization data
        if (isInvitation && invitationOrgId) {
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', invitationOrgId)
            .single();

          if (orgError) {
            console.error('Error fetching invited organization:', orgError);
          } else if (org) {
            console.log("Invited to organization:", org);
            setOrganization(org as Organization);
          }
        }

        // Now load progress from the server
        const { data: progressData, error: progressError } = await supabase
          .from('onboarding_progress')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (progressError && progressError.code !== 'PGRST116') {
          console.error('Error loading onboarding progress:', progressError);
        }

        // Set completed steps if progress data exists
        if (progressData?.completed_steps) {
          setCompletedSteps(progressData.completed_steps);
        }

        // Set current step based on completion and invitation status
        if (isInvitation) {
          // For invited users, skip to profile setup
          setCurrentStep("profile");
        } else if (completedSteps.length === 0) {
          // If no steps completed, start at beginning
          setCurrentStep("organization");
        } else {
          // Find the first incomplete step
          const allSteps = steps.map(step => step.id);
          const firstIncompleteStep = allSteps.find(step => !completedSteps.includes(step));
          
          if (firstIncompleteStep) {
            setCurrentStep(firstIncompleteStep);
          } else {
            // If all steps are complete, set to the last step
            setCurrentStep(allSteps[allSteps.length - 1]);
          }
        }
      } catch (error) {
        console.error('Error in loadOnboardingProgress:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOnboardingProgress();
  }, [user, hasOrganization, setHasOrganization, isInvitation, invitationOrgId]);

  const saveProgress = async (step: string, completedSteps: string[]) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('onboarding_progress')
        .upsert({
          user_id: user.id,
          current_step: step,
          completed_steps: completedSteps,
        });

      if (error) {
        console.error('Error saving progress:', error);
      }
    } catch (error) {
      console.error('Error in saveProgress:', error);
    }
  };

  const handleOrganizationSubmit = async (data: z.infer<typeof organizationFormSchema>) => {
    if (!user) return;

    try {
      setLoading(true);

      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: data.name,
          logo_url: null,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // If logo was uploaded, update the URL
      if (logoFile && orgData) {
        const logoUrl = await handleLogoUpload(logoFile);
        
        if (logoUrl) {
          const { error: updateError } = await supabase
            .from('organizations')
            .update({ logo_url: logoUrl })
            .eq('id', orgData.id);

          if (updateError) {
            console.error('Error updating logo URL:', updateError);
          } else {
            orgData.logo_url = logoUrl;
          }
        }
      }

      // Create organization membership
      const { error: membershipError } = await supabase
        .from('organization_members')
        .insert({
          user_id: user.id,
          organization_id: orgData.id,
          role: 'admin', // First user is admin
        });

      if (membershipError) throw membershipError;

      // Set organization state
      setOrganization(orgData);
      setHasOrganization(true);
      
      // Generate invite link based on organization ID
      const baseUrl = window.location.origin;
      const inviteUrl = `${baseUrl}/register?invitation=true&organization=${orgData.id}`;
      setInviteLink(inviteUrl);

      // Update completed steps and move to next step
      const newCompletedSteps = [...completedSteps, "organization"];
      setCompletedSteps(newCompletedSteps);
      saveProgress("profile", newCompletedSteps);
      setCurrentStep("profile");
      
      toast({
        title: "Organization created!",
        description: "Your organization has been set up successfully.",
      });
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast({
        title: "Error creating organization",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (data: z.infer<typeof profileFormSchema>) => {
    if (!user) return;

    try {
      setLoading(true);

      // Determine the organization ID - either from the invitation or from the user's organization
      const orgId = isInvitation && invitationOrgId 
        ? invitationOrgId 
        : organization?.id;
      
      if (!orgId) {
        throw new Error("No organization ID available");
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          organization_id: orgId,
          name: data.name,
          title: data.title,
          bio: data.bio || null,
          avatar_url: null,
        });

      if (profileError) throw profileError;

      // If avatar was uploaded, update the URL
      if (avatarFile) {
        const avatarUrl = await handleAvatarUpload(avatarFile);
        
        if (avatarUrl) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('user_id', user.id);

          if (updateError) {
            console.error('Error updating avatar URL:', updateError);
          }
        }
      }

      // If this is an invited user, mark the invitation as accepted
      if (isInvitation && invitationOrgId && user.email) {
        try {
          await markInvitationAsAccepted(user.email, invitationOrgId);
          console.log("Invitation marked as accepted");
          
          // Create organization membership if not exists
          const { error: membershipError } = await supabase
            .from('organization_members')
            .insert({
              user_id: user.id,
              organization_id: invitationOrgId,
              role: 'member', // Invited users are members by default
            });
            
          if (membershipError && !membershipError.message.includes('duplicate')) {
            console.error('Error creating membership for invited user:', membershipError);
          }
        } catch (inviteError) {
          console.error('Error marking invitation as accepted:', inviteError);
        }
      }

      // Update completed steps
      const newCompletedSteps = [...completedSteps, "profile"];
      setCompletedSteps(newCompletedSteps);
      
      // For regular users, go to invite step. For invited users, skip to workspace
      if (isInvitation) {
        saveProgress("workspace", newCompletedSteps);
        setCurrentStep("workspace");
      } else {
        saveProgress("invite", newCompletedSteps);
        setCurrentStep("invite");
      }
      
      toast({
        title: "Profile created!",
        description: "Your profile has been set up successfully.",
      });
    } catch (error: any) {
      console.error('Error creating profile:', error);
      toast({
        title: "Error creating profile",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSubmit = async (data: z.infer<typeof inviteFormSchema>) => {
    if (!user || !organization) return;

    try {
      setLoading(true);
      
      // Get user profile for the inviter name
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single();
        
      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }
      
      const inviterName = profileData?.name || user.email || 'A team member';

      // Send invitation email
      const response = await sendInvitationEmail(
        data.email,
        organization.name,
        inviterName,
        organization.id
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to send invitation");
      }

      // Update completed steps and move to next step
      const newCompletedSteps = [...completedSteps, "invite"];
      setCompletedSteps(newCompletedSteps);
      saveProgress("workspace", newCompletedSteps);
      setCurrentStep("workspace");
      
      setInvitationSent(true);
      inviteForm.reset();
      
      toast({
        title: "Invitation sent!",
        description: `An invitation has been sent to ${data.email}.`,
      });
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Error sending invitation",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceSubmit = async (data: z.infer<typeof workspaceFormSchema>) => {
    if (!user) return;

    try {
      setLoading(true);

      // Mark all steps as completed
      const allSteps = steps.map(step => step.id);
      setCompletedSteps(allSteps);
      await saveProgress("complete", allSteps);
      
      toast({
        title: "Setup complete!",
        description: "Your workspace is ready to use.",
      });
      
      // Redirect to home page
      setTimeout(() => {
        setLocation("/");
      }, 1500);
    } catch (error: any) {
      console.error('Error completing setup:', error);
      toast({
        title: "Error completing setup",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!organization) return null;

    try {
      return await uploadToSupabase(file, 'organization-logos');
    } catch (error) {
      console.error('Error uploading logo:', error);
      return null;
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return null;

    try {
      return await uploadToSupabase(file, 'user-avatars');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return null;
    }
  };

  const uploadToSupabase = async (file: File, bucketName: string) => {
    // Create a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file);

    if (error) throw error;

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const moveToNextStep = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const moveToPreviousStep = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  // Filter steps for invited users - they skip organization and invite sections
  const displaySteps = isInvitation 
    ? steps.filter(step => step.id === 'profile' || step.id === 'workspace')
    : steps;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex flex-wrap mb-8 justify-between items-center">
        <h1 className="text-2xl font-bold">Complete Your Setup</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar navigation */}
        <div className="col-span-1">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                {displaySteps.map((step) => (
                  <div
                    key={step.id}
                    className={`flex items-center p-2 rounded-lg cursor-pointer ${
                      currentStep === step.id
                        ? "bg-primary/10 text-primary"
                        : completedSteps.includes(step.id)
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                    onClick={() => completedSteps.includes(step.id) && setCurrentStep(step.id)}
                  >
                    <div className="w-8 h-8 flex items-center justify-center rounded-full mr-3 bg-gray-100">
                      {completedSteps.includes(step.id) ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <span>{displaySteps.findIndex(s => s.id === step.id) + 1}</span>
                      )}
                    </div>
                    <span className="font-medium">{step.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content area */}
        <div className="col-span-1 md:col-span-3">
          <Card>
            <CardContent className="p-6">
              {/* Organization setup */}
              {currentStep === "organization" && !isInvitation && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Organization Details</h2>
                    <p className="text-gray-500">
                      Tell us about your organization
                    </p>
                  </div>

                  <Form {...organizationForm}>
                    <form onSubmit={organizationForm.handleSubmit(handleOrganizationSubmit)} className="space-y-4">
                      <FormField
                        control={organizationForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Acme, Inc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Organization Logo (Optional)
                        </label>
                        <div className="flex items-center space-x-4">
                          <div
                            className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50"
                          >
                            {logoPreview ? (
                              <div className="relative w-full h-full">
                                <img
                                  src={logoPreview}
                                  alt="Logo Preview"
                                  className="w-full h-full object-cover rounded-lg"
                                />
                                <button
                                  type="button"
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                  onClick={() => {
                                    setLogoPreview(null);
                                    setLogoFile(null);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <Upload className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <label htmlFor="logo-upload" className="cursor-pointer">
                              <div className="px-4 py-2 bg-primary/10 text-primary rounded-lg inline-block font-medium text-sm">
                                Choose File
                              </div>
                              <input
                                id="logo-upload"
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleLogoChange}
                              />
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                              PNG, JPG up to 5MB
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button type="submit" disabled={loading}>
                          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Continue
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              )}

              {/* Profile setup */}
              {currentStep === "profile" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Your Profile</h2>
                    <p className="text-gray-500">
                      Tell us a bit about yourself
                    </p>
                  </div>

                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                      {isInvitation && organization && (
                        <div className="bg-blue-50 p-4 rounded-lg mb-4">
                          <p className="text-blue-700 text-sm">
                            You're joining <strong>{organization.name}</strong>
                          </p>
                        </div>
                      )}
                      
                      <FormField
                        control={profileForm.control}
                        name="name"
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

                      <FormField
                        control={profileForm.control}
                        name="title"
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

                      <FormField
                        control={profileForm.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bio (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="A little about yourself..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Profile Picture (Optional)
                        </label>
                        <div className="flex items-center space-x-4">
                          <div
                            className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50"
                          >
                            {avatarPreview ? (
                              <div className="relative w-full h-full">
                                <img
                                  src={avatarPreview}
                                  alt="Avatar Preview"
                                  className="w-full h-full object-cover rounded-full"
                                />
                                <button
                                  type="button"
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                  onClick={() => {
                                    setAvatarPreview(null);
                                    setAvatarFile(null);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <Upload className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <label htmlFor="avatar-upload" className="cursor-pointer">
                              <div className="px-4 py-2 bg-primary/10 text-primary rounded-lg inline-block font-medium text-sm">
                                Choose File
                              </div>
                              <input
                                id="avatar-upload"
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarChange}
                              />
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                              PNG, JPG up to 5MB
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between">
                        {!isInvitation && (
                          <Button type="button" variant="outline" onClick={moveToPreviousStep}>
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Back
                          </Button>
                        )}
                        <Button type="submit" disabled={loading}>
                          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Continue
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              )}

              {/* Invite team members */}
              {currentStep === "invite" && !isInvitation && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Invite Team Members</h2>
                    <p className="text-gray-500">
                      Invite your colleagues to join your organization
                    </p>
                  </div>

                  {invitationSent ? (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-medium text-green-800">Invitation Sent!</h3>
                      <p className="text-green-700 text-sm mt-1">
                        Your invitation has been sent successfully.
                      </p>
                    </div>
                  ) : null}

                  {/* Invitation link section */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium mb-2">Share Invitation Link</h3>
                    <div className="flex items-center space-x-2">
                      <Input 
                        value={inviteLink} 
                        readOnly 
                        className="flex-1 text-sm"
                      />
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={copyToClipboard}
                        className="flex items-center"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-4 w-4 mr-1" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1" /> Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="my-4 flex items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink mx-4 text-gray-400 text-sm">Or</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                  </div>

                  <Form {...inviteForm}>
                    <form onSubmit={inviteForm.handleSubmit(handleInviteSubmit)} className="space-y-4">
                      <FormField
                        control={inviteForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input placeholder="colleague@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-between">
                        <Button type="button" variant="outline" onClick={moveToPreviousStep}>
                          <ChevronLeft className="mr-2 h-4 w-4" />
                          Back
                        </Button>
                        <div className="space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={moveToNextStep}
                          >
                            Skip
                          </Button>
                          <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Invitation
                          </Button>
                        </div>
                      </div>
                    </form>
                  </Form>
                </div>
              )}

              {/* Workspace ready */}
              {currentStep === "workspace" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Ready to Go!</h2>
                    <p className="text-gray-500">
                      Your workspace is ready to use
                    </p>
                  </div>

                  <div className="bg-green-50 p-6 rounded-lg text-center">
                    <div className="mb-4">
                      <svg
                        className="h-12 w-12 text-green-500 mx-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-green-800 mb-2">
                      Setup Complete!
                    </h3>
                    <p className="text-green-700">
                      You've successfully set up your account and workspace.
                    </p>
                  </div>

                  <Form {...workspaceForm}>
                    <form onSubmit={workspaceForm.handleSubmit(handleWorkspaceSubmit)} className="space-y-4">
                      <FormField
                        control={workspaceForm.control}
                        name="setupComplete"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                I'm ready to start using my workspace
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-between">
                        {!isInvitation && (
                          <Button type="button" variant="outline" onClick={moveToPreviousStep}>
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Back
                          </Button>
                        )}
                        <Button type="submit" disabled={loading || !workspaceForm.watch("setupComplete")}>
                          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Go to Dashboard
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
