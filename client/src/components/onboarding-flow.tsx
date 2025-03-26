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
  }
];

// Organization schema
const organizationSchema = z.object({
  name: z.string().min(1, { message: "Organization name is required" }),
  domain: z.string().min(1, { message: "Domain name is required" }),
});

// Profile schema
const profileSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  jobTitle: z.string().min(1, { message: "Job title is required" }),
});

export function OnboardingFlow() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState("organization");
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [hasOrganization, setHasOrganization] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [isInvited, setIsInvited] = useState(false);
  const [invitationOrgId, setInvitationOrgId] = useState<string | null>(null);
  
  // Invite state
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [currentInviteInput, setCurrentInviteInput] = useState<string>("");
  const [allowAutoJoin, setAllowAutoJoin] = useState<boolean>(true);

  // Load onboarding progress from Supabase
  useEffect(() => {
    const loadOnboardingProgress = async () => {
      if (!user) return;

      try {
        // First check for URL invitation parameters
        const urlParams = new URLSearchParams(window.location.search);
        const isInvitation = urlParams.get('invitation') === 'true';
        const orgId = urlParams.get('organization');
        
        // Also check localStorage (for cases where user was redirected after verification)
        const localStorageInvitation = localStorage.getItem('invitation') === 'true';
        const localStorageOrgId = localStorage.getItem('invitationOrgId');
        
        // Use either URL or localStorage, prioritizing URL
        const finalIsInvitation = isInvitation || localStorageInvitation;
        const finalOrgId = orgId || localStorageOrgId;
        
        if (finalIsInvitation && finalOrgId) {
          setIsInvited(true);
          setInvitationOrgId(finalOrgId);
          setCurrentStep("profile");
          
          // Get organization details
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', finalOrgId)
            .single();
            
          if (!orgError && orgData) {
            setOrganization(orgData);
            setHasOrganization(true);
            setCompletedSteps(["organization"]);
          }
          
          // Mark invitation as accepted
          const userEmail = user.email;
          if (userEmail) {
            await markInvitationAsAccepted(userEmail, finalOrgId);
          }
          
          // Clear localStorage data
          localStorage.removeItem('invitation');
          localStorage.removeItem('invitationOrgId');
          
          return;
        }
        
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

        // Check if user has a profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error checking profile:', profileError);
        }

        const userHasProfile = !!profileData;
        setHasProfile(userHasProfile);

        if (userHasProfile) {
          setProfile(profileData);
          // Set avatar preview if profile has an avatar
          if (profileData.avatar_url) {
            setAvatarPreview(profileData.avatar_url);
          }
        }

        // Get onboarding progress from 'onboarding_progress' table
        const { data: progress, error: progressError } = await supabase
          .from('onboarding_progress')
          .select('current_step, completed_steps')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (progressError && progressError.code !== 'PGRST116') {
          console.error('Error fetching onboarding progress:', progressError);
        }

        // If we have progress data, update the state
        if (progress) {
          setCurrentStep(progress.current_step);
          setCompletedSteps(progress.completed_steps || []);
        } else {
          // For first-time users, initialize based on what they've completed
          const initialCompletedSteps = [];
          if (userHasOrg) initialCompletedSteps.push("organization");
          if (userHasProfile) initialCompletedSteps.push("profile");
          
          setCompletedSteps(initialCompletedSteps);
          
          // Determine first incomplete step
          if (!userHasOrg) {
            setCurrentStep("organization");
          } else if (!userHasProfile) {
            setCurrentStep("profile");
          } else {
            setCurrentStep("invite");
          }
        }
      } catch (error) {
        console.error('Error loading onboarding progress:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load your onboarding progress. Please try again."
        });
      } finally {
        setLoading(false);
      }
    };

    loadOnboardingProgress();
  }, [user, toast]);

  // Save onboarding progress to Supabase
  const saveProgress = async (step: string, completed: string[]) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('onboarding_progress')
        .upsert({
          user_id: user.id,
          current_step: step,
          completed_steps: completed,
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving onboarding progress:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save your progress. Please try again."
      });
    }
  };

  // Form handlers
  const organizationForm = useForm<z.infer<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization?.name || "",
      domain: "",
    },
  });

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile?.name || "",
      jobTitle: profile?.job_title || "",
    },
  });

  // Move to next step
  const moveToNextStep = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1].id;
      setCurrentStep(nextStep);
      saveProgress(nextStep, completedSteps);
    } else {
      // All steps completed, redirect to dashboard
      navigate("/dashboard");
    }
  };

  // Handle organization submit
  const handleOrganizationSubmit = async (data: z.infer<typeof organizationSchema>) => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // If we already have an organization, update it
      if (organization) {
        const { error } = await supabase
          .from("organizations")
          .update({
            name: data.name,
            domain: data.domain,
            logo_url: logoPreview || organization.logo_url,
          })
          .eq("id", organization.id);
          
        if (error) throw error;
        
        setOrganization(prev => prev ? {
          ...prev,
          name: data.name,
          logo_url: logoPreview || prev.logo_url,
        } : null);
        
        toast({
          title: "Organization updated",
          description: "Your organization information has been updated successfully"
        });
        
        setIsEditing(false);
        return;
      }
      
      // Create a new organization
      const { data: newOrg, error } = await supabase
        .from("organizations")
        .insert({
          name: data.name,
          domain: data.domain,
          logo_url: logoPreview,
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Add user as a member and admin of the organization
      const { error: memberError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: newOrg.id,
          user_id: user.id,
          role: "admin",
        });
        
      if (memberError) throw memberError;
      
      setOrganization(newOrg);
      setHasOrganization(true);
      
      // Mark step as completed
      const newCompletedSteps = [...completedSteps, "organization"];
      setCompletedSteps(newCompletedSteps);
      await saveProgress("profile", newCompletedSteps);
      
      // Move to next step
      moveToNextStep();
      
      toast({
        title: "Organization created",
        description: "Your organization has been created successfully"
      });
    } catch (error: any) {
      console.error("Error creating/updating organization:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create/update organization"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle profile submit
  const handleProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
    if (!user || !organization) return;
    
    try {
      setLoading(true);
      
      // If we already have a profile, update it
      if (profile) {
        const { error } = await supabase
          .from("profiles")
          .update({
            name: data.name,
            job_title: data.jobTitle,
            avatar_url: avatarPreview || profile.avatar_url,
          })
          .eq("id", profile.id);
          
        if (error) throw error;
        
        setProfile(prev => prev ? {
          ...prev,
          name: data.name,
          job_title: data.jobTitle,
          avatar_url: avatarPreview || prev.avatar_url,
        } : null);
        
        toast({
          title: "Profile updated",
          description: "Your profile information has been updated successfully"
        });
        
        setIsProfileEditing(false);
        return;
      }
      
      // Create a new profile
      const { data: newProfile, error } = await supabase
        .from("profiles")
        .insert({
          user_id: user.id,
          name: data.name,
          email: user.email,
          job_title: data.jobTitle,
          avatar_url: avatarPreview,
          organization_id: organization.id,
          role: "admin", // First user is admin
        })
        .select()
        .single();
        
      if (error) throw error;
      
      setProfile(newProfile);
      setHasProfile(true);
      
      // Mark step as completed
      const newCompletedSteps = [...completedSteps, "profile"];
      setCompletedSteps(newCompletedSteps);
      
      // If user was invited, skip to dashboard
      if (isInvited) {
        navigate("/dashboard");
        return;
      }
      
      await saveProgress("invite", newCompletedSteps);
      
      // Move to next step
      moveToNextStep();
      
      toast({
        title: "Profile created",
        description: "Your profile has been created successfully"
      });
    } catch (error: any) {
      console.error("Error creating/updating profile:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create/update profile"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle file uploads
  const handleLogoUpload = async (file: File) => {
    try {
      // Create object URL for preview
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
      setLogoFile(file);
      
      // Upload to Supabase storage
      const result = await uploadToSupabase(file, "logos");
      if (result) {
        setLogoPreview(result);
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload organization logo"
      });
    }
  };
  
  const handleAvatarUpload = async (file: File) => {
    try {
      // Create object URL for preview
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
      setAvatarFile(file);
      
      // Upload to Supabase storage
      const result = await uploadToSupabase(file, "avatars");
      if (result) {
        setAvatarPreview(result);
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload profile avatar"
      });
    }
  };
  
  const uploadToSupabase = async (file: File, bucketName: string) => {
    if (!user) return null;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          upsert: true,
        });
        
      if (error) throw error;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);
        
      return urlData.publicUrl;
    } catch (error) {
      console.error(`Error uploading to ${bucketName}:`, error);
      return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#407c87]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <img 
                src="/src/assets/logo.svg"
                alt="Logo"
                className="h-8"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Progress steps */}
          {!isInvited && (
            <div className="flex justify-between mb-10">
              {steps.map((step, index) => (
                <div 
                  key={step.id} 
                  className={`flex flex-col items-center ${index < steps.length - 1 ? 'w-full' : ''}`}
                >
                  <div 
                    className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      completedSteps.includes(step.id) 
                        ? 'bg-[#407c87] text-white'
                        : currentStep === step.id
                          ? 'border-2 border-[#407c87] text-[#407c87]'
                          : 'border-2 border-gray-300 text-gray-400'
                    }`}
                    onClick={() => {
                      // Only allow clicking on completed steps or current step
                      if (completedSteps.includes(step.id) || currentStep === step.id) {
                        setCurrentStep(step.id);
                        saveProgress(step.id, completedSteps);
                      }
                    }}
                    style={{ cursor: completedSteps.includes(step.id) || currentStep === step.id ? 'pointer' : 'default' }}
                  >
                    {completedSteps.includes(step.id) ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="text-sm mt-2 font-medium text-gray-600">
                    {step.label}
                  </div>
                  
                  {/* Connector line */}
                  {index < steps.length - 1 && (
                    <div className="w-full h-0.5 bg-gray-200 mt-5 relative">
                      {completedSteps.includes(step.id) && (
                        <div 
                          className="absolute top-0 left-0 h-full bg-[#407c87]"
                          style={{ width: completedSteps.includes(steps[index + 1].id) ? '100%' : '50%' }}
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Step content */}
          <Card className="shadow-md border-0">
            <CardContent className="p-6">
              {/* Organization step */}
              {currentStep === "organization" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold">Organization</h2>
                    <p className="text-gray-500">
                      Set up your organization details
                    </p>
                  </div>
                  
                  {organization && !isEditing ? (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-4">
                        <div className="h-16 w-16 flex-shrink-0 rounded-md border overflow-hidden">
                          {organization.logo_url ? (
                            <img 
                              src={organization.logo_url} 
                              alt={organization.name} 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                              <span className="text-xl font-bold text-gray-400">
                                {organization.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-lg">{organization.name}</h3>
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => setIsEditing(true)}
                        variant="outline"
                        className="mt-4"
                      >
                        Edit Details
                      </Button>
                      
                      <div className="flex justify-end mt-6">
                        <Button
                          onClick={() => {
                            const newCompletedSteps = [...completedSteps];
                            if (!completedSteps.includes("organization")) {
                              newCompletedSteps.push("organization");
                              setCompletedSteps(newCompletedSteps);
                            }
                            saveProgress("profile", newCompletedSteps);
                            moveToNextStep();
                          }}
                          className="bg-[#407c87] hover:bg-[#386d77]"
                        >
                          Continue
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Form {...organizationForm}>
                      <form onSubmit={organizationForm.handleSubmit(handleOrganizationSubmit)} className="space-y-6">
                        <div className="flex flex-col items-center justify-center py-4">
                          <div className="relative h-24 w-24 rounded-md border border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden">
                            {logoPreview ? (
                              <img 
                                src={logoPreview} 
                                alt="Logo Preview" 
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Upload className="h-8 w-8 text-gray-400" />
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleLogoUpload(file);
                                }
                              }}
                            />
                          </div>
                          <div className="mt-2 text-xs text-gray-500">Upload logo (optional)</div>
                        </div>
                        
                        <FormField
                          control={organizationForm.control}
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
                        
                        <FormField
                          control={organizationForm.control}
                          name="domain"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization Domain</FormLabel>
                              <FormControl>
                                <Input placeholder="acme.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end">
                          {organization && (
                            <Button
                              type="button"
                              variant="outline"
                              className="mr-2"
                              onClick={() => setIsEditing(false)}
                            >
                              Cancel
                            </Button>
                          )}
                          <Button 
                            type="submit"
                            className="bg-[#407c87] hover:bg-[#386d77]"
                            disabled={loading}
                          >
                            {loading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {organization ? "Updating..." : "Creating..."}
                              </>
                            ) : (
                              organization ? "Update" : "Continue"
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}
                </div>
              )}
              
              {/* Profile step */}
              {currentStep === "profile" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold">Profile</h2>
                    <p className="text-gray-500">
                      Set up your personal profile
                    </p>
                  </div>
                  
                  {profile && !isProfileEditing ? (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-4">
                        <div className="h-16 w-16 flex-shrink-0 rounded-full border overflow-hidden">
                          {profile.avatar_url ? (
                            <img 
                              src={profile.avatar_url} 
                              alt={profile.name} 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                              <span className="text-xl font-bold text-gray-400">
                                {profile.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-lg">{profile.name}</h3>
                          <p className="text-gray-500">{profile.job_title}</p>
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => setIsProfileEditing(true)}
                        variant="outline"
                        className="mt-4"
                      >
                        Edit Details
                      </Button>
                      
                      <div className="flex justify-end mt-6">
                        <Button
                          onClick={() => {
                            const newCompletedSteps = [...completedSteps];
                            if (!completedSteps.includes("profile")) {
                              newCompletedSteps.push("profile");
                              setCompletedSteps(newCompletedSteps);
                            }
                            
                            // If user was invited, skip to dashboard
                            if (isInvited) {
                              navigate("/dashboard");
                              return;
                            }
                            
                            saveProgress("invite", newCompletedSteps);
                            moveToNextStep();
                          }}
                          className="bg-[#407c87] hover:bg-[#386d77]"
                        >
                          Continue
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-6">
                        <div className="flex flex-col items-center justify-center py-4">
                          <div className="relative h-24 w-24 rounded-full border border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden">
                            {avatarPreview ? (
                              <img 
                                src={avatarPreview} 
                                alt="Avatar Preview" 
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Upload className="h-8 w-8 text-gray-400" />
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleAvatarUpload(file);
                                }
                              }}
                            />
                          </div>
                          <div className="mt-2 text-xs text-gray-500">Upload profile picture (optional)</div>
                        </div>
                        
                        <FormField
                          control={profileForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="John Doe" {...field} />
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
                                <Input placeholder="Software Engineer" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end">
                          {profile && (
                            <Button
                              type="button"
                              variant="outline"
                              className="mr-2"
                              onClick={() => setIsProfileEditing(false)}
                            >
                              Cancel
                            </Button>
                          )}
                          <Button 
                            type="submit"
                            className="bg-[#407c87] hover:bg-[#386d77]"
                            disabled={loading}
                          >
                            {loading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {profile ? "Updating..." : "Creating..."}
                              </>
                            ) : (
                              profile ? "Update" : "Continue"
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}
                </div>
              )}
              
              {/* Invite step */}
              {currentStep === "invite" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold">Invite your team to your organization</h2>
                    <p className="text-gray-500">
                      Add colleagues by email. We work best with your teammates
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Invite People</label>
                      <div className="mt-1 p-2 border rounded-md flex flex-wrap gap-2 min-h-[120px]">
                        {inviteEmails.map((email, index) => (
                          <div key={index} className="bg-gray-100 rounded-md py-1 px-2 flex items-center gap-1">
                            <span className="text-sm">{email}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 rounded-full p-0"
                              onClick={() => {
                                const newEmails = [...inviteEmails];
                                newEmails.splice(index, 1);
                                setInviteEmails(newEmails);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        <input
                          type="text"
                          className="flex-grow bg-transparent border-none outline-none placeholder:text-gray-400 text-sm"
                          placeholder="Type or paste in one or multiple emails separated by commas, spaces, or line breaks."
                          value={currentInviteInput}
                          onChange={(e) => setCurrentInviteInput(e.target.value)}
                          onKeyDown={(e) => {
                            // Add email on Enter, comma, or space
                            if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
                              e.preventDefault();
                              
                              const value = currentInviteInput.trim();
                              if (value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                                if (!inviteEmails.includes(value)) {
                                  setInviteEmails([...inviteEmails, value]);
                                }
                                setCurrentInviteInput('');
                              }
                            }
                            
                            // Remove last email on Backspace if input is empty
                            if (e.key === 'Backspace' && currentInviteInput === '' && inviteEmails.length > 0) {
                              const newEmails = [...inviteEmails];
                              newEmails.pop();
                              setInviteEmails(newEmails);
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pastedText = e.clipboardData.getData('text');
                            
                            // Split by common separators: commas, spaces, newlines
                            const emailsArray = pastedText
                              .split(/[\s,;\n]+/)
                              .map(email => email.trim())
                              .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
                              
                            if (emailsArray.length > 0) {
                              // Add new unique emails
                              const newEmails = [...inviteEmails];
                              emailsArray.forEach(email => {
                                if (!newEmails.includes(email)) {
                                  newEmails.push(email);
                                }
                              });
                              setInviteEmails(newEmails);
                            }
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Link className="h-5 w-5 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-600">Copy invitation link</span>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Checkbox 
                        id="auto-join" 
                        checked={allowAutoJoin}
                        onCheckedChange={(checked) => setAllowAutoJoin(checked as boolean)}
                        className="mt-1"
                      />
                      <label htmlFor="auto-join" className="text-sm">
                        Anyone with a "@company.com" email can join your workspace
                      </label>
                    </div>
                  </div>
                  
                  
                  <Button
                    onClick={async () => {
                      try {
                        setLoading(true);
                        
                        // Save invites to database if there are any
                        if (inviteEmails.length > 0 && user && organization) {
                          // Send invites
                          for (const email of inviteEmails) {
                            // First, save to database
                            const { error } = await supabase
                              .from("invitations")
                              .insert({
                                organization_id: organization.id,
                                email: email,
                                invited_by: user.id,
                                auto_join: allowAutoJoin
                              });
                              
                            if (error) throw error;
                            
                            // Then send invitation email
                            const result = await sendInvitationEmail(
                              email,
                              organization.name,
                              profile?.name || user.email || "A team member",
                              organization.id
                            );
                            
                            if (!result.success) {
                              console.warn(`Warning: Could not send invitation email to ${email}: ${result.error}`);
                            }
                          }
                          
                          toast({
                            title: "Success",
                            description: `${inviteEmails.length} invitation${inviteEmails.length === 1 ? "" : "s"} sent`
                          });
                        }
                        
                        // Mark step as completed
                        const newCompletedSteps = [...completedSteps, "invite"];
                        setCompletedSteps(newCompletedSteps);
                        await saveProgress("workspace", newCompletedSteps);
                        moveToNextStep();
                      } catch (error: any) {
                        console.error("Error sending invitations:", error);
                        toast({
                          variant: "destructive",
                          title: "Error",
                          description: error.message || "Failed to send invitations"
                        });
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="w-full bg-[#407c87] hover:bg-[#386d77] mt-4"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending invites...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </div>
              )}
              
              {/* Workspace step */}
              {currentStep === "workspace" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold">Set up your workspace</h2>
                    <p className="text-gray-500">
                      Configure your team's workspace
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="border rounded-md p-4">
                      <div className="flex items-center space-x-3">
                        <Checkbox id="enable-chat" />
                        <div>
                          <label htmlFor="enable-chat" className="font-medium">
                            Enable team chat
                          </label>
                          <p className="text-gray-500 text-sm mt-1">
                            Allow your team to communicate through built-in messaging
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-md p-4">
                      <div className="flex items-center space-x-3">
                        <Checkbox id="enable-files" defaultChecked />
                        <div>
                          <label htmlFor="enable-files" className="font-medium">
                            Enable file sharing
                          </label>
                          <p className="text-gray-500 text-sm mt-1">
                            Allow your team to share files and documents
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-md p-4">
                      <div className="flex items-center space-x-3">
                        <Checkbox id="enable-calendar" defaultChecked />
                        <div>
                          <label htmlFor="enable-calendar" className="font-medium">
                            Enable team calendar
                          </label>
                          <p className="text-gray-500 text-sm mt-1">
                            Schedule meetings and events with your team
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={async () => {
                      try {
                        setLoading(true);
                        // Mark step as completed and finish onboarding
                        const newCompletedSteps = [...completedSteps, "workspace"];
                        setCompletedSteps(newCompletedSteps);
                        await saveProgress("completed", newCompletedSteps);
                        
                        // Navigate to dashboard
                        navigate("/dashboard");
                        
                        toast({
                          title: "Setup complete",
                          description: "Your workspace has been set up successfully"
                        });
                      } catch (error: any) {
                        console.error("Error completing onboarding:", error);
                        toast({
                          variant: "destructive",
                          title: "Error",
                          description: error.message || "Failed to complete onboarding"
                        });
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="w-full bg-[#407c87] hover:bg-[#386d77] mt-4"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Finishing setup...
                      </>
                    ) : (
                      "Finish Setup"
                    )}
                  </Button>
                </div>
              )}
              
              {/* Navigation buttons */}
              {!isInvited && (
                <div className="flex justify-between mt-8">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const currentIndex = steps.findIndex(step => step.id === currentStep);
                      if (currentIndex > 0) {
                        const prevStep = steps[currentIndex - 1].id;
                        setCurrentStep(prevStep);
                        saveProgress(prevStep, completedSteps);
                      }
                    }}
                    disabled={currentStep === steps[0].id}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  
                  {/* Skip button for optional steps (invite) */}
                  {currentStep === "invite" && (
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        const newCompletedSteps = [...completedSteps, "invite"];
                        setCompletedSteps(newCompletedSteps);
                        await saveProgress("workspace", newCompletedSteps);
                        moveToNextStep();
                      }}
                    >
                      Skip
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
