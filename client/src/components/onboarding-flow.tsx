import { useState, useEffect } from "react";
import { z } from "zod";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CheckCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { useProgress } from "@/hooks/use-progress";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import AvatarUpload from "./avatar-upload";
import { markInvitationAsAccepted } from "@/lib/invitations";

const organizationSchema = z.object({
  name: z.string().min(2, {
    message: "Organization name must be at least 2 characters.",
  }),
  domain: z.string().min(2, {
    message: "Domain must be at least 2 characters.",
  }),
  description: z.string().optional(),
});

const profileSchema = z.object({
  fullName: z.string().min(2, {
    message: "Full name must be at least 2 characters.",
  }),
  jobTitle: z.string().min(2, {
    message: "Job title must be at least 2 characters.",
  }),
  department: z.string().min(2, {
    message: "Department must be at least 2 characters.",
  }),
});

const workspaceSchema = z.object({
  name: z.string().min(2, {
    message: "Workspace name must be at least 2 characters.",
  }),
  description: z.string().optional(),
});

const inviteSchema = z.object({
  emails: z.string(),
});

type Organization = {
  id: string;
  name: string;
  domain: string;
  logo_url: string | null;
};

type Step = {
  id: string;
  title: string;
  description: string;
};

const steps: Step[] = [
  {
    id: "organization",
    title: "Organization Setup",
    description: "Set up your organization details",
  },
  {
    id: "profile",
    title: "Profile Setup",
    description: "Set up your profile details",
  },
  {
    id: "workspace",
    title: "Workspace Creation",
    description: "Create your first workspace",
  },
  {
    id: "invite",
    title: "Invite Team Members",
    description: "Invite your team members",
  }
];

interface OnboardingFlowProps {
  orgId?: string | null;
}

export function OnboardingFlow({orgId}: OnboardingFlowProps) {
  const { user, hasOrganization, setHasOrganization } = useAuth();
  const { toast } = useToast();
  const { getProgress, saveProgress } = useProgress();
  const [, setLocation] = useLocation();
  const [isInvitation, setIsInvitation] = useState<boolean>(false);
  const [invitationOrgId, setInvitationOrgId] = useState<string>("null");
  const [invitationChecked, setInvitationChecked] = useState<boolean>(false);
  const [organizationId, setOrganizationId] = useState<string | null>(orgId || null);
  
  // State for organization, steps, and loading
  const [currentStep, setCurrentStep] = useState<string>("organization");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userHasOrg, setUserHasOrg] = useState<boolean>(false);
  
  // State for file uploads
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Initialize forms
  const organizationForm = useForm<z.infer<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
      domain: "",
      description: "",
    },
  });

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      jobTitle: "",
      department: "",
    },
  });

  const workspaceForm = useForm<z.infer<typeof workspaceSchema>>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const inviteForm = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      emails: "",
    },
  });

  // Load onboarding progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      if (user) {
        try {
          // Check if user is coming from an invitation
          const url = window.location.href;
          const inviteParam = new URLSearchParams(url.split("?")[1]).get("invite");
          const orgIdParam = new URLSearchParams(url.split("?")[1]).get("orgId");
          
          if (inviteParam) {
            setIsInvitation(true);
            setInvitationOrgId(inviteParam);
          } else if (orgIdParam) {
            setOrganizationId(orgIdParam);
          }
          
          setInvitationChecked(true);

          // Load saved progress
          const progress = await getProgress();
          if (progress?.step && progress?.completed) {
            setCurrentStep(progress.step);
            setCompletedSteps(progress.completed);
          }
          
          // Check if user has an organization
          const { data: orgs } = await supabase
            .from("organizations")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();
          
          // Check if user is a member of any organization
          const { data: memberships } = await supabase
            .from("organization_members")
            .select("organization_id")
            .eq("user_id", user.id)
            .limit(1);
            
          const userHasOrganization = orgs || (memberships && memberships.length > 0);
          setUserHasOrg(!!userHasOrganization);
          setHasOrganization(!!userHasOrganization);
          
          if (orgs) {
            setOrganization(orgs);
            
            // If user has an org and no progress yet, start at profile
            if (!progress?.step) {
              const initialStep = isInvitation ? 'profile' : (userHasOrganization ? 'profile' : 'organization');
              setCurrentStep(initialStep);
              await saveProgress(initialStep, []);
            }
          }
          
        } catch (error) {
          console.error("Error loading progress:", error);
        }
      }
    };
    
    loadProgress();
  }, [user, getProgress, saveProgress, setHasOrganization]);
  
  // Handle invited user flow
  useEffect(() => {
    if (isInvitation && invitationOrgId !== "null" && user && invitationChecked) {
      // For invited users, we should skip directly to profile setup
      const loadInvitedOrganization = async () => {
        try {
          // Check if the user is already a member of this organization
          const { data: existingMembership } = await supabase
            .from("organization_members")
            .select("organization_id")
            .eq("user_id", user.id)
            .eq("organization_id", invitationOrgId)
            .maybeSingle();
            
          if (existingMembership) {
            // User is already a member, redirect to home
            setHasOrganization(true);
            setLocation("/");
            return;
          }
          
          // Load the organization details
          const { data: org, error } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", invitationOrgId)
            .single();
            
          if (error || !org) throw new Error("Organization not found");
          
          setOrganization(org);
          setCurrentStep("profile");
          
          // Create organization membership for the user
          const { error: membershipError } = await supabase
            .from("organization_members")
            .insert({
              user_id: user.id,
              organization_id: invitationOrgId,
              is_owner: false
            });
              
          if (membershipError) {
            console.error("Error creating membership:", membershipError);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to join organization. Please try again.",
            });
            return;
          }
          
          // Mark the invitation as accepted
          if (user.email) {
            await markInvitationAsAccepted(user.email, invitationOrgId);
          }
          
          // Save progress
          await saveProgress("profile", []);
          
        } catch (error: any) {
          console.error("Error handling invitation:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: error.message || "Error joining organization",
          });
        }
      };
      
      loadInvitedOrganization();
    }
  }, [user, isInvitation, invitationOrgId, setHasOrganization, invitationChecked]);

  // Initialize form with organization data if it exists
  useEffect(() => {
    if (organization) {
      organizationForm.reset({
        name: organization.name || "",
        domain: organization.domain || "",
        description: "",
      });
      
      if (organization.logo_url) {
        setLogoPreview(organization.logo_url);
      }
    }
  }, [organization, organizationForm]);
  
  // Load user profile data for profile form
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user?.id) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();
            
          if (profile) {
            profileForm.reset({
              fullName: profile.name || "",
              jobTitle: profile.job_title || "",
              department: profile.department || "",
            });
            
            if (profile.avatar_url) {
              setAvatarPreview(profile.avatar_url);
            }
          }
        } catch (error) {
          console.error("Error loading profile:", error);
        }
      }
    };
    
    loadUserProfile();
  }, [user, profileForm]);

  // Handle logo upload
  const handleLogoUpload = async (file: File) => {
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };
  
  // Handle avatar upload
  const handleAvatarUpload = async (file: File) => {
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };
  
  // Upload file to Supabase Storage
  const uploadToSupabase = async (file: File, bucketName: string) => {
    if (!user?.id) throw new Error("User not authenticated");
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${fileName}`;
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, { upsert: true });
      
    if (error) throw error;
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
      
    return publicUrlData.publicUrl;
  };
  
  // Handle organization form submission
  const handleOrganizationSubmit = async (data: z.infer<typeof organizationSchema>) => {
    try {
      if (!user?.id) throw new Error("Missing user information");
      
      setLoading(true);
      
      // Upload logo if exists
      let logoUrl = null;
      if (logoFile) {
        logoUrl = await uploadToSupabase(logoFile, "logos");
      } else if (logoPreview) {
        logoUrl = logoPreview;
      }
      
      // Create or update organization
      if (organization?.id) {
        // Update existing organization
        const { error: updateError } = await supabase
          .from("organizations")
          .update({
            name: data.name,
            domain: data.domain,
            description: data.description || "",
            logo_url: logoUrl,
          })
          .eq("id", organization.id);
          
        if (updateError) throw updateError;
        
        setOrganization({
          ...organization,
          name: data.name,
          domain: data.domain,
          logo_url: logoUrl,
        });
      } else {
        // Create new organization
        const { data: newOrg, error: insertError } = await supabase
          .from("organizations")
          .insert({
            name: data.name,
            domain: data.domain,
            description: data.description || "",
            logo_url: logoUrl,
            user_id: user.id,
          })
          .select()
          .single();
          
        if (insertError) throw insertError;
        
        setOrganization(newOrg);
        
        // Create organization membership
        const { error: membershipError } = await supabase
          .from("organization_members")
          .insert({
            user_id: user.id,
            organization_id: newOrg.id,
            is_owner: true,
          });
        
        if (membershipError) throw membershipError;
      }
      
      // Update completed steps and move to next step
      const newCompleted = [...completedSteps, "organization"];
      setCompletedSteps(newCompleted);
      
      // Move to profile step
      setCurrentStep("profile");
      await saveProgress("profile", newCompleted);
      
      toast({
        title: "Organization saved",
        description: "Your organization has been saved successfully.",
      });
    } catch (error: any) {
      console.error("Error saving organization:", error);
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
      // For direct organizationId parameter, use that
      // Otherwise use the organization from state
      let finalOrgId = organization?.id;
      if (isInvitation && invitationOrgId !== "null") {
        finalOrgId = invitationOrgId;
      } else if (organizationId) {
        finalOrgId = organizationId;
      }
      
      if (!finalOrgId) throw new Error("Missing organization information");

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
      
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
        
      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            name: data.fullName,
            first_name: firstName,
            last_name: lastName,
            job_title: data.jobTitle,
            department: data.department,
            avatar_url: avatarUrl,
            organization_id: finalOrgId,
          })
          .eq("user_id", user.id);
        
        if (updateError) throw updateError;
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            organization_id: finalOrgId,
            name: data.fullName,
            avatar_url: avatarUrl,
            email: user.email,
            first_name: firstName,
            last_name: lastName,
            job_title: data.jobTitle,
            department: data.department,
          });
        
        if (insertError) throw insertError;
      }
      
      // Update completed steps and move to next step
      let newCompleted = [...completedSteps];
      if (!newCompleted.includes("profile")) {
        newCompleted = [...completedSteps, "profile"];
        
        // For invited users, mark the invitation as accepted
        if (isInvitation && invitationOrgId && user?.email) {
          try {
            await markInvitationAsAccepted(user.email, invitationOrgId);

          } catch (invitationError) {
            console.error("Error marking invitation as accepted:", invitationError);
            // Non-blocking error
          }
        }
        
        if (isInvitation) {
          // For invited users, go directly to home page after profile setup
          await saveProgress("completed", newCompleted);
          
          toast({
            title: "Profile saved",
            description: "You have joined the organization successfully.",
          });
          
          setHasOrganization(true);
          setLocation("/");
          return;
        } else {
          // For normal users, go to workspace step
          setCurrentStep("workspace");
          await saveProgress("workspace", newCompleted);
          
          toast({
            title: "Profile saved",
            description: "Your profile has been saved successfully.",
          });
        }
      }
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error processing profile",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle workspace form submission
  const handleWorkspaceSubmit = async (data: z.infer<typeof workspaceSchema>) => {
    try {
      if (!user?.id) throw new Error("Missing user information");
      if (!organization?.id) throw new Error("Missing organization information");
      
      setLoading(true);
      
      // Create workspace
      const { error: insertError } = await supabase
        .from("workspaces")
        .insert({
          name: data.name,
          description: data.description || "",
          organization_id: organization.id,
          created_by: user.id,
        });
      
      if (insertError) throw insertError;
      
      // Update completed steps and move to next step
      const newCompleted = [...completedSteps, "workspace"];
      setCompletedSteps(newCompleted);
      
      // Move to invite step
      setCurrentStep("invite");
      await saveProgress("invite", newCompleted);
      
      toast({
        title: "Workspace created",
        description: "Your workspace has been created successfully.",
      });
      
      // Reset the form
      workspaceForm.reset({
        name: "",
        description: "",
      });
    } catch (error: any) {
      console.error("Error creating workspace:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error creating workspace",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle invite form submission
  const handleInviteSubmit = async (data: z.infer<typeof inviteSchema>) => {
    try {
      if (!user?.id) throw new Error("Missing user information");
      if (!organization?.id) throw new Error("Missing organization information");
      
      setLoading(true);
      
      // Get valid email addresses
      const emailList = data.emails
        .split(",")
        .map(email => email.trim())
        .filter(email => email.length > 0);
      
      if (emailList.length === 0) {
        toast({
          description: "Please enter at least one valid email address.",
        });
        return;
      }
      
      // Create invitations
      const invitations = emailList.map(email => ({
        email,
        organization_id: organization.id,
        invited_by: user.id,
        status: "pending",
      }));
      
      const { error: insertError } = await supabase
        .from("invitations")
        .insert(invitations);
      
      if (insertError) throw insertError;
      
      // Update completed steps
      const newCompleted = [...completedSteps, "invite"];
      setCompletedSteps(newCompleted);
      
      // Mark onboarding as completed
      await saveProgress("completed", newCompleted);
      
      toast({
        title: "Invitations sent",
        description: `Invitations have been sent to ${emailList.length} email(s).`,
      });
      
      // Redirect to home
      setHasOrganization(true);
      setLocation("/");
    } catch (error: any) {
      console.error("Error sending invitations:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error sending invitations",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Skip inviting team members
  const skipInvite = async () => {
    try {
      // Update completed steps
      const newCompleted = [...completedSteps, "invite"];
      setCompletedSteps(newCompleted);
      
      // Mark onboarding as completed
      await saveProgress("completed", newCompleted);
      
      toast({
        title: "Setup completed",
        description: "Your onboarding process has been completed.",
      });
      
      // Redirect to home
      setHasOrganization(true);
      setLocation("/");
    } catch (error: any) {
      console.error("Error skipping invitations:", error);
    }
  };
  
  // Move to next step
  const moveToNextStep = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1].id;
      setCurrentStep(nextStep);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gray-50">
      <div className="w-full max-w-4xl px-4 py-8">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-3xl font-bold text-center">Complete Your Setup</h1>
          <p className="text-gray-600 text-center mt-2">Follow these steps to set up your account</p>
        </div>
        
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center space-x-2">
            <div className="relative w-full max-w-3xl flex items-center">
              <div className="absolute w-full h-1 bg-gray-200"></div>
              <div className="absolute h-1 bg-blue-600" style={{ 
                width: `${((completedSteps.length / steps.length) * 100)}%`
              }}></div>
              
              <div className="flex w-full items-center justify-between relative z-10">
                {steps
                  // For invited users, only show profile step
                  .filter(step => !isInvitation || (step.id === "profile"))
                  .map((step, index) => {
                    const isCompleted = completedSteps.includes(step.id);
                    const isCurrent = currentStep === step.id;
                    
                    // For invited users, make both steps clickable
                    const isClickable = isInvitation || 
                      index === 0 || 
                      completedSteps.includes(steps[index - 1]?.id);
                    
                    return (
                      <div 
                        key={step.id}
                        className="flex flex-col items-center"
                      >
                        <button
                          onClick={() => {
                            if (isClickable) {
                              setCurrentStep(step.id);
                            }
                          }}
                          className={`flex items-center justify-center w-10 h-10 rounded-full transition ${
                            isCurrent 
                              ? "bg-blue-600 text-white" 
                              : isCompleted 
                                ? "bg-green-500 text-white" 
                                : "bg-white border border-gray-300 text-gray-400"
                          } ${isClickable ? "cursor-pointer" : "cursor-not-allowed"}`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <span>{index + 1}</span>
                          )}
                        </button>
                        
                        <div className="text-sm mt-2 font-medium text-center">
                          {step.title}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
        
        <Card className="shadow-lg p-8">
          {currentStep === "organization" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Organization Setup</h2>
                <p className="text-gray-600 mt-1">Set up your organization details</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="logo">Organization Logo</Label>
                <AvatarUpload
                  setFile={handleLogoUpload}
                  previewUrl={logoPreview}
                  className="w-32 h-32"
                />
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
                        <FormDescription>
                          This will be used to verify email addresses for your team members.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={organizationForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Briefly describe your organization"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-4 flex justify-end">
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          Next
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
          
          {currentStep === "profile" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Profile Setup</h2>
                <p className="text-gray-600 mt-1">Set up your profile details</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="avatar">Profile Picture</Label>
                <AvatarUpload
                  setFile={handleAvatarUpload}
                  previewUrl={avatarPreview}
                  className="w-32 h-32"
                />
              </div>
              
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
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
                  
                  <FormField
                    control={profileForm.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Product Manager" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input placeholder="Product" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-4 flex justify-end">
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          {isInvitation ? 'Save & Continue' : 'Next'}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
          
          {currentStep === "workspace" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Create Your First Workspace</h2>
                <p className="text-gray-600 mt-1">Set up your workspace details</p>
              </div>
              
              <Form {...workspaceForm}>
                <form onSubmit={workspaceForm.handleSubmit(handleWorkspaceSubmit)} className="space-y-4">
                  <FormField
                    control={workspaceForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Workspace Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Marketing Team" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={workspaceForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Briefly describe this workspace"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-4 flex justify-end">
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          Next
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
          
          {currentStep === "invite" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Invite Team Members</h2>
                <p className="text-gray-600 mt-1">Invite your team members to join your organization</p>
              </div>
              
              <Form {...inviteForm}>
                <form onSubmit={inviteForm.handleSubmit(handleInviteSubmit)} className="space-y-4">
                  <FormField
                    control={inviteForm.control}
                    name="emails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Addresses</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter email addresses, separated by commas"
                            {...field}
                            rows={4}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter one or more email addresses separated by commas.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-4 flex justify-between">
                    <Button type="button" variant="outline" onClick={skipInvite}>
                      Skip for now
                    </Button>
                    
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send Invitations"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
