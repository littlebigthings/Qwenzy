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
    description: "Details help any collaborators that join",
  },
  {
    id: "profile",
    label: "Profile",
    icon: "src/assets/profile.svg",
    active: "src/assets/profile-active.svg",
    description: "Tell us about yourself",
  },
  {
    id: "invite",
    label: "Invite",
    icon: "src/assets/invite.svg",
    active: "src/assets/invite-active.svg",
    description: "Add your teammates",
  },
  {
    id: "workspace",
    label: "Workspace",
    icon: "src/assets/workspace.svg",
    active: "src/assets/workspace-active.svg",
    description: "Setup your workspace",
  },
];

const organizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  logo: z.any().optional(),
});

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState("organization");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const orgForm = useForm<z.infer<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
    },
  });

  const handleLogoUpload = async (file: File) => {
    try {
      if (!file) return null;

      // Check file size (800KB max)
      if (file.size > 800 * 1024) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "File size must be less than 800KB",
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
        description: "Error uploading logo",
      });
      return null;
    }
  };

  const uploadToSupabase = async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from("organization-logos")
      .upload(filePath, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from("organization-logos")
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const createOrganization = async (data: z.infer<typeof organizationSchema>) => {
    try {
      if (!user?.id) throw new Error("Missing user information");

      setLoading(true);

      // Upload logo if exists
      let logoUrl = null;
      if (logoFile) {
        logoUrl = await uploadToSupabase(logoFile);
      }

      const { data: newOrg, error } = await supabase
        .from("organizations")
        .insert({
          name: data.name,
          domain: user.email?.split("@")[1],
          logo_url: logoUrl,
        })
        .select()
        .single();

      if (error) throw error;

      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: user.id,
          email: user.email,
          organization_id: newOrg.id,
          role: "admin",
        });

      if (profileError) throw profileError;

      toast({
        title: "Success",
        description: "Organization created successfully",
      });

      setCompletedSteps([...completedSteps, "organization"]);
      setCurrentStep("profile");

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
                  {/* Icon container */}
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
                    <p className="text-sm text-gray-500 mt-0.5">
                      {step.description}
                    </p>
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
                          <Input placeholder="Multiplier.inc" {...field} />
                        </FormControl>
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/jpeg,image/png,image/gif";
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement)
                                .files?.[0];
                              if (file) handleLogoUpload(file);
                            };
                            input.click();
                          }}
                        >
                          Upload a photo
                        </Button>
                        {logoPreview && (
                          <Button
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
            <div>{/* Profile setup content here */}</div>
          )}
          {currentStep === "invite" && (
            <div>{/* Invite members content here */}</div>
          )}
          {currentStep === "workspace" && (
            <div>{/* Workspace setup content here */}</div>
          )}
        </div>
      </Card>
    </div>
  );
}