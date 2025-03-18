import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Building2, Plus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useLocation } from "wouter"
import { useAuth } from "@/hooks/use-auth"

type Organization = {
  id: number;
  name: string;
  domain: string;
  logo_url?: string;
  member_count: number;
};

const OrganizationCard = ({ org, onSelect }: { org: Organization; onSelect: () => void }) => (
  <div 
    onClick={onSelect}
    className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-200 mb-2 cursor-pointer"
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
    <Plus className="w-5 h-5 text-gray-400" />
  </div>
);

const organizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  domain: z.string().min(3, "Domain must be at least 3 characters"),
});

export function OnboardingFlow() {
  const [loading, setLoading] = useState(true);
  const [existingOrganizations, setExistingOrganizations] = useState<Organization[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const orgForm = useForm<z.infer<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
      domain: user?.email?.split("@")[1] || "",
    },
  });

  useEffect(() => {
    if (user?.email) {
      checkUserStatus();
    }
  }, [user?.email]);

  const checkUserStatus = async () => {
    if (!user?.email || loading) return;

    try {
      setLoading(true);

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

      // Get detected domain from email
      const detectedDomain = user.email.split("@")[1];

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
      // Set admin status if it's a new user (no orgs exist)
      setIsAdmin(uniqueOrgs.length === 0);

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

      const { data: newOrg, error } = await supabase
        .from("organizations")
        .insert({
          name: data.name,
          domain: data.domain,
        })
        .select()
        .single();

      if (error) throw error;

      // Create admin profile for first user
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: user.id,
        email: user.email,
        organization_id: newOrg.id,
        role: "admin", // First user is always admin
      });

      if (profileError) throw profileError;

      toast({
        title: "Success",
        description: "Organization created successfully",
      });

      setLocation("/");

    } catch (error: any) {
      console.error("Organization creation error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error creating organization",
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
      <Card className="w-full max-w-xl mx-auto">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-semibold">Welcome to Qwenzy</CardTitle>
          <CardDescription>Get started with your organization</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Domain Detection Banner */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              We detected your organization domain as
              <span className="font-medium text-gray-900 ml-1">
                {user?.email?.split("@")[1]}
              </span>
            </p>
          </div>

          {/* Create Organization Section - Show at top for admins */}
          {isAdmin && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Create an organization</h3>
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

          {/* Divider when both sections are shown */}
          {existingOrganizations.length > 0 && <div className="text-center text-gray-500">or</div>}

          {/* Existing Organizations Section */}
          {existingOrganizations.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Open an organization</h3>
              </div>
              <div className="space-y-2">
                {existingOrganizations.map((org) => (
                  <OrganizationCard
                    key={org.id}
                    org={org}
                    onSelect={() => setLocation("/")}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-500 text-center">
                Not seeing your organization?{" "}
                <button className="text-[#407c87] hover:text-[#386d77] font-medium">
                  Try using a different email address
                </button>
              </p>
            </div>
          )}

          {/* Show Create Organization at bottom for non-admins */}
          {!isAdmin && existingOrganizations.length === 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Create an organization</h3>
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
        </CardContent>
      </Card>
    </div>
  );
}