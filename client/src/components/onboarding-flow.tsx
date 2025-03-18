import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Building2, Plus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useLocation } from "wouter"
import { useAuth } from "@/hooks/use-auth"

const organizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  domain: z.string().min(3, "Domain must be at least 3 characters"),
});

export function OnboardingFlow() {
  const [loading, setLoading] = useState(true)
  const [existingOrganizations, setExistingOrganizations] = useState<Organization[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const { toast } = useToast()
  const [, setLocation] = useLocation()
  const { user } = useAuth()

  const orgForm = useForm<z.infer<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
      domain: user?.email?.split("@")[1] || "",
    },
  })

  useEffect(() => {
    if (user?.email) {
      checkUserStatus()
    }
  }, [user?.email])

  const checkUserStatus = async () => {
    if (!user?.email) return

    try {
      setLoading(true)
      const detectedDomain = user.email.split('@')[1]

      // Check for pending invitations
      const { data: invitations, error: inviteError } = await supabase
        .from('invitations')
        .select('*')
        .eq('email', user.email)
        .eq('accepted', false)

      if (inviteError) throw inviteError

      // Check organizations with matching domain
      const { data: domainOrgs, error: domainError } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          domain,
          logo_url,
          profiles (count)
        `)
        .eq('domain', detectedDomain)

      if (domainError) throw domainError

      setExistingOrganizations(domainOrgs || [])
      setIsAdmin(invitations.length === 0) // First user becomes admin if no invitations exist

    } catch (error: any) {
      console.error('Error checking user status:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error checking user status"
      })
    } finally {
      setLoading(false)
    }
  }

  const createOrganization = async (data: z.infer<typeof organizationSchema>) => {
    try {
      if (!user?.id) throw new Error("Missing user information")

      const { data: newOrg, error } = await supabase.from('organizations').insert({
        name: data.name,
        domain: data.domain,
      }).select().single()

      if (error) throw error

      // Create admin profile
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: user.id,
        email: user.email,
        organization_id: newOrg.id,
        role: 'admin',
      })

      if (profileError) throw profileError

      toast({
        title: "Success",
        description: "Organization created successfully",
      })

      // Redirect to profile setup
      setLocation('/profile-setup')

    } catch (error: any) {
      console.error('Organization creation error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error creating organization",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 w-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#f8fafc]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center text-[#407c87]">Qwenzy</h1>
      </div>

      <Card className="w-full max-w-md">
        <CardContent className="pt-6 space-y-6">
          {/* Domain Detection */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">
              We detected your organization domain as
              <span className="font-medium text-gray-900"> {user?.email?.split('@')[1]}</span>
            </p>
          </div>

          {/* Create Organization Button */}
          <Button 
            onClick={() => orgForm.handleSubmit(createOrganization)()} 
            className="w-full bg-[#407c87] hover:bg-[#386d77] text-white"
          >
            Create an organization
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Team Section */}
          <div className="space-y-4">
            <p className="text-center text-sm text-gray-600">
              Is your team already on Qwenzy?
            </p>
            <p className="text-center text-xs text-gray-500">
              We couldn't find any existing workspaces for the email address {user?.email}.
            </p>
            <button className="text-[#407c87] hover:text-[#386d77] text-sm font-medium text-center w-full">
              Try using a different email address
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

type Organization = {
  id: number;
  name: string;
  domain: string;
  logo_url?: string;
  member_count: number;
};

const OrganizationCard = ({ org, onSelect }: { org: Organization, onSelect: () => void }) => (
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
    {/* ChevronRight className="w-5 h-5 text-gray-400" */}
  </button>
);