import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Building2, Plus, ChevronRight } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useLocation } from "wouter"
import { useAuth } from "@/hooks/use-auth"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent } from "@/components/ui/tabs"

type Organization = {
  id: number;
  name: string;
  domain: string;
  logo_url?: string;
  member_count: number;
};

const OrganizationCard = ({ org, onSelect }: { org: Organization; onSelect: () => void }) => (
  <button
    onClick={onSelect}
    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-200 mb-2"
  >
    <div className="flex items-center gap-3">
      {org.logo_url ? (
        <img src={org.logo_url} alt={org.name} className="w-8 h-8 rounded-full" />
      ) : (
        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
          <Building2 className="w-4 h-4 text-gray-500" />
        </div>
      )}
      <div className="text-left">
        <h3 className="font-medium text-gray-900">{org.name}</h3>
        <p className="text-sm text-gray-500">{org.member_count} members</p>
      </div>
    </div>
    <ChevronRight className="w-5 h-5 text-gray-400" />
  </button>
);

const organizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  domain: z.string().min(3, "Domain must be at least 3 characters"),
});

const profileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  jobTitle: z.string().min(2, "Job title must be at least 2 characters"),
});

const teamInviteSchema = z.object({
  emails: z.string().min(1, "Please enter at least one email"),
  allowDomainJoin: z.boolean().default(false),
});

export function OnboardingFlow() {
  const [loading, setLoading] = useState(true);
  const [existingOrganizations, setExistingOrganizations] = useState<Organization[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [emails, setEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [currentStep, setCurrentStep] = useState('profile'); // Added state for step management


  const orgForm = useForm<z.infer<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
      domain: user?.email?.split("@")[1] || "",
    },
  });

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      jobTitle: "",
    },
  });

  const teamInviteForm = useForm<z.infer<typeof teamInviteSchema>>({
    resolver: zodResolver(teamInviteSchema),
    defaultValues: {
      allowDomainJoin: false,
    },
  });

  useEffect(() => {
    if (user?.email) {
      checkUserStatus();
    }
  }, [user?.email]);

  const checkUserStatus = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);

      // Get detected domain from email
      const detectedDomain = user.email.split("@")[1];

      // Check if user is already a member of any organization
      const { data: memberOrgs, error: memberError } = await supabase
        .from("profiles")
        .select(`
          organizations (
            id,
            name,
            domain,
            logo_url,
            profiles (count)
          )
        `)
        .eq("email", user.email);

      if (memberError) throw memberError;

      // Check for pending invitations
      const { data: invitations, error: inviteError } = await supabase
        .from("invitations")
        .select("*")
        .eq("email", user.email)
        .eq("accepted", false);

      if (inviteError) throw inviteError;

      // Check organizations with matching domain
      const { data: domainOrgs, error: domainError } = await supabase
        .from("organizations")
        .select(`
          id,
          name,
          domain,
          logo_url,
          profiles (count)
        `)
        .eq("domain", detectedDomain);

      if (domainError) throw domainError;

      // Combine and format organizations
      const formattedOrgs = [
        ...(memberOrgs?.map((m) => ({
          ...m.organizations,
          member_count: m.organizations.profiles[0].count,
        })) || []),
        ...(domainOrgs?.map((org) => ({
          ...org,
          member_count: org.profiles[0].count,
        })) || []),
      ];

      // Remove duplicates
      const uniqueOrgs = Array.from(new Set(formattedOrgs.map((org) => org.id)))
        .map((id) => formattedOrgs.find((org) => org.id === id))
        .filter(Boolean) as Organization[];

      setExistingOrganizations(uniqueOrgs);
      setIsAdmin(uniqueOrgs.length === 0 && invitations.length === 0);
    } catch (error: any) {
      console.error("Error checking user status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error checking user status",
      });
    } finally {
      setLoading(false);
    }
  };

  const createOrganization = async (data: z.infer<typeof organizationSchema>) => {
    try {
      if (!user?.id) throw new Error("Missing user information");

      const { data: newOrg, error } = await supabase.from("organizations").insert({
        name: data.name,
        domain: data.domain,
      }).select().single();

      if (error) throw error;

      // Create admin profile
      const { error: profileError } = await supabase.from("profiles").insert({
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

      // Update to stay on organization setup until profile is completed
      setLocation("/organization-setup");
    } catch (error: any) {
      console.error("Organization creation error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error creating organization",
      });
    }
  };

  const completeProfile = async (data: z.infer<typeof profileSchema>) => {
    try {
      if (!user?.id) throw new Error("Missing user information");
      if (!user.email) throw new Error("Missing user email");

      let orgId = null; // Initialize orgId

      if (!orgId) {
        const { data: org, error: orgError } = await supabase
          .from("organizations")
          .select("id")
          .eq("domain", user.email.split("@")[1])
          .single();

        if (orgError) throw new Error("Error fetching organization");
        if (!org?.id) throw new Error("Organization not found");
        orgId = org.id;
      }

      const { error } = await supabase.from("profiles").insert({
        user_id: user.id,
        first_name: data.firstName,
        last_name: data.lastName,
        job_title: data.jobTitle,
        email: user.email,
        organization_id: orgId,
      }).select().single();

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Profile completed successfully",
      });
      setCurrentStep('team')
    } catch (error: any) {
      console.error("Profile completion error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error completing profile",
      });
    }
  };

  const handleTeamInvites = async (data: z.infer<typeof teamInviteSchema>) => {
    try {
      if (!organizationId) throw new Error("Organization not found");
      if (!user?.id) throw new Error("User not found");

      const { error } = await supabase.from("invitations").insert(
        emails.map((email) => ({
          organization_id: organizationId,
          email,
          invited_by: user.id,
          auto_join: data.allowDomainJoin,
        }))
      );

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Team invites have been sent successfully.",
      });
      setCurrentStep("complete");

      setTimeout(() => {
        setLocation("/");
      }, 2000);
    } catch (error: any) {
      console.error("Team invite error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error sending team invites",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f8fafc]">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Qwenzy</CardTitle>
          <CardDescription>Get started with your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Domain Detection Banner */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">
              We detected your organization domain as
              <span className="font-medium text-gray-900"> {user?.email?.split("@")[1]}</span>
            </p>
          </div>

          {/* Create Organization Section */}
          {(isAdmin || existingOrganizations.length === 0) && (
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Create an organization</h3>
              <Form {...orgForm}>
                <form onSubmit={orgForm.handleSubmit(createOrganization)} className="space-y-4">
                  <FormField
                    control={orgForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization name</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Inc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full bg-[#407c87] hover:bg-[#386d77]">
                    Create organization
                  </Button>
                </form>
              </Form>
            </div>
          )}

          {/* Existing Organizations */}
          {existingOrganizations.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Open an organization</h3>
                <p className="text-sm text-gray-500">
                  Not seeing your organization?{" "}
                  <button className="text-[#407c87] hover:text-[#386d77] font-medium">
                    Try using a different email address
                  </button>
                </p>
              </div>
              <div className="space-y-2">
                {existingOrganizations.map((org) => (
                  <OrganizationCard
                    key={org.id}
                    org={org}
                    onSelect={() => {
                      setLocation("/profile-setup");
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <Tabs value={currentStep} className="w-full">
            <TabsContent value="profile">
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(completeProfile)} className="space-y-4">
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative h-24 w-24 rounded-full overflow-hidden bg-gray-100">
                      <div className="h-full w-full flex items-center justify-center bg-gray-100">
                        {/* Upload component missing - needs to be imported and added here */}
                        {/* Placeholder */}
                      </div>
                    </div>
                  </div>


                  <FormField
                    control={profileForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
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

                  <Button type="submit" className="w-full">
                    Complete Profile
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="team">
              <Form {...teamInviteForm}>
                <form onSubmit={teamInviteForm.handleSubmit(handleTeamInvites)} className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Enter email address"
                        value={currentEmail}
                        onChange={(e) => setCurrentEmail(e.target.value)}
                        type="email"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          if (currentEmail && !emails.includes(currentEmail)) {
                            setEmails([...emails, currentEmail]);
                            setCurrentEmail("");
                          }
                        }}
                        variant="outline"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {emails.length > 0 && (
                      <div className="space-y-2">
                        {emails.map((email, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <span>{email}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEmails(emails.filter((_, i) => i !== index))}
                            >
                              {/* Trash icon missing - needs to be imported and added here */}
                              {/* Placeholder */}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="auto-join"
                        checked={teamInviteForm.watch("allowDomainJoin")}
                        onCheckedChange={(checked) => teamInviteForm.setValue("allowDomainJoin", checked)}
                      />
                      <Label htmlFor="auto-join">
                        Allow anyone with matching email domain to join automatically
                      </Label>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={emails.length === 0}>
                    Send Invites & Complete Setup
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="complete">
              <div className="text-center space-y-4">
                {/* CheckCircle icon missing - needs to be imported and added here */}
                {/* Placeholder */}
                <h3 className="text-2xl font-bold">All Set!</h3>
                <p className="text-gray-600">
                  Your profile and organization setup is complete. You'll be redirected to your dashboard shortly.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}