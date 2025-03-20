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

export function OnboardingFlow() {
  // Get completed steps from local storage on initial load
  const getInitialCompletedSteps = () => {
    const savedSteps = localStorage.getItem("completedOnboardingSteps");
    return savedSteps ? JSON.parse(savedSteps) : [];
  };

  const [currentStep, setCurrentStep] = useState(() => {
    const completed = getInitialCompletedSteps();
    // Find the first incomplete step
    const nextStep = steps.find(step => !completed.includes(step.id));
    return nextStep ? nextStep.id : steps[0].id;
  });

  const [completedSteps, setCompletedSteps] = useState(getInitialCompletedSteps);
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, setHasOrganization } = useAuth();

  // Save completed steps to local storage whenever they change
  useEffect(() => {
    localStorage.setItem("completedOnboardingSteps", JSON.stringify(completedSteps));
  }, [completedSteps]);

  // Form setup for organization creation
  const orgForm = useForm<z.infer<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
    },
  });

  // Move to the next incomplete step
  const moveToNextStep = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    } else {
      // All steps completed, redirect to main app
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

  // Upload logo to Supabase storage
  const uploadToSupabase = async (file: File) => {
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

      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = fileName; // Simplified path, no folders

      // Upload to the "organizations" bucket
      const { data, error: uploadError } = await supabase.storage
        .from("organizations")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        console.error("Supabase storage error:", uploadError);
        if (uploadError.message.includes("policy")) {
          throw new Error("Storage permission denied. Please try again.");
        }
        throw new Error("Failed to upload logo");
      }

      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("organizations").getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error("Upload to Supabase error:", error);
      toast({
        variant: "destructive",
        title: "Upload Error",
        description: error.message || "Failed to upload logo to storage",
      });
      return null;
    }
  };

  // Create organization and set user as admin
  const createOrganization = async (data: z.infer<typeof organizationSchema>) => {
    try {
      if (!user?.id) throw new Error("Missing user information");

      setLoading(true);

      // Upload logo if exists
      let logoUrl = null;
      if (logoFile) {
        try {
          logoUrl = await uploadToSupabase(logoFile);
        } catch (error) {
          console.error("Logo upload failed:", error);
          // Continue without logo if upload fails
        }
      }

      // Create organization first
      const { data: newOrg, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: data.name,
          logo_url: logoUrl,
        })
        .select()
        .single();

      if (orgError) {
        console.error("Organization creation error:", orgError);
        throw new Error("Failed to create organization");
      }

      // Create organization membership with is_owner=true
      const { error: membershipError } = await supabase
        .from("organization_members")
        .insert({
          user_id: user.id,
          organization_id: newOrg.id,
          is_owner: true, // This makes the user an admin
        });

      if (membershipError) {
        console.error("Membership creation error:", membershipError);
        throw new Error("Failed to set up organization membership");
      }

      // Update global auth state
      setHasOrganization(true);

      toast({
        title: "Success",
        description: "Organization created successfully! You are now the admin.",
      });

      // Update completed steps and move to next step
      const newCompletedSteps = [...completedSteps, "organization"];
      setCompletedSteps(newCompletedSteps);
      moveToNextStep();

    } catch (error: any) {
      console.error("Organization creation error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error creating organization",
      });
    } finally {
      setLoading(false);
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
            {steps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = currentStep === step.id;
              const isClickable =
                index === 0 || completedSteps.includes(steps[index - 1].id);

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
          {currentStep === "organization" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">
                  Give your organization a name
                </h2>
                <p className="text-gray-500">
                  Details help any collaborators that join
                </p>
              </div>

              <Form {...orgForm}>
                <form
                  onSubmit={orgForm.handleSubmit(createOrganization)}
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
                          />
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          Use a unique name that represents your organization.
                          Letters, numbers, spaces, dots and hyphens are
                          allowed.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <FormLabel>Organization Logo</FormLabel>
                    <div className="mt-2">
                      <div className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Upload className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif"
                          className="hidden"
                          id="logo-upload"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLogoUpload(file);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            document.getElementById("logo-upload")?.click();
                          }}
                        >
                          Upload a photo
                        </Button>
                        {logoPreview && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setLogoFile(null);
                              setLogoPreview(null);
                            }}
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        Allowed JPG, GIF or PNG. Max size of 800K
                      </p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#407c87] hover:bg-[#386d77]"
                  >
                    Continue
                  </Button>
                </form>
              </Form>
            </div>
          )}
          {currentStep === "profile" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">Set up your profile</h2>
                <p className="text-gray-500">Tell us about yourself</p>
              </div>
              {/* Profile setup form will be implemented here */}
              <Button
                onClick={() => {
                  setCompletedSteps([...completedSteps, "profile"]);
                  moveToNextStep();
                }}
              >
                Continue to next step
              </Button>
            </div>
          )}
          {currentStep === "invite" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">Invite team members</h2>
                <p className="text-gray-500">
                  Collaborate with your team members
                </p>
              </div>
              {/* Invite members form will be implemented here */}
              <Button
                onClick={() => {
                  setCompletedSteps([...completedSteps, "invite"]);
                  moveToNextStep();
                }}
              >
                Continue to next step
              </Button>
            </div>
          )}
          {currentStep === "workspace" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">Set up your workspace</h2>
                <p className="text-gray-500">
                  Configure your workspace settings
                </p>
              </div>
              {/* Workspace setup form will be implemented here */}
              <Button
                onClick={() => {
                  setCompletedSteps([...completedSteps, "workspace"]);
                  moveToNextStep();
                }}
              >
                Complete Setup
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}