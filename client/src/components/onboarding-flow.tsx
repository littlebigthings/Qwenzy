import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Building2, UserCircle, Share, Briefcase, DownloadCloud, ChevronRight } from "lucide-react"
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

const organizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
});

export function OnboardingFlow() {
  const [loading, setLoading] = useState(true)
  const [existingOrganizations, setExistingOrganizations] = useState<Organization[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [showOrgSetup, setShowOrgSetup] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [organizationLogoUrl, setOrganizationLogoUrl] = useState<string | null>(null)
  const { toast } = useToast()
  const [, setLocation] = useLocation()
  const { user } = useAuth()

  const orgForm = useForm<z.infer<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
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

      const { data: invitations, error: inviteError } = await supabase
        .from('invitations')
        .select('*')
        .eq('email', user.email)
        .eq('accepted', false)

      if (inviteError) throw inviteError

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
      setIsAdmin(invitations.length === 0)

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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      const file = event.target.files?.[0]
      if (!file) return

      if (file.size > 800 * 1024) {
        throw new Error("File size must be less than 800KB")
      }

      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        throw new Error("Please upload a JPG, PNG, or GIF file")
      }

      const fileExt = file.name.split('.').pop()
      const filePath = `${user?.id}/${Math.random()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('organizations')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('organizations')
        .getPublicUrl(filePath)

      setOrganizationLogoUrl(publicUrl)

    } catch (error: any) {
      console.error('Upload error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error uploading organization logo",
      })
    } finally {
      setUploading(false)
    }
  }

  const createOrganization = async (data: z.infer<typeof organizationSchema>) => {
    try {
      if (!user?.id) throw new Error("Missing user information")

      const { data: newOrg, error } = await supabase.from('organizations').insert({
        name: data.name,
        domain: user.email?.split('@')[1] || '',
        logo_url: organizationLogoUrl,
      }).select().single()

      if (error) throw error

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

  if (showOrgSetup) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-8">
            {/* Sidebar */}
            <div className="w-64 space-y-2">
              <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
                <Building2 className="w-5 h-5 text-[#407c87]" />
                <div>
                  <p className="font-medium">Organization</p>
                  <p className="text-sm text-gray-500">Details help any collaborators that join</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3">
                <UserCircle className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium">Profile</p>
                  <p className="text-sm text-gray-500">Setup your account</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3">
                <Share className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium">Invite</p>
                  <p className="text-sm text-gray-500">Grow your team</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3">
                <Briefcase className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium">Workspace</p>
                  <p className="text-sm text-gray-500">Setup your workspace</p>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              <Card>
                <CardContent className="pt-6">
                  <Form {...orgForm}>
                    <form onSubmit={orgForm.handleSubmit(createOrganization)} className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold mb-2">Give your organization a name</h2>
                        <p className="text-sm text-gray-500 mb-4">Details help any collaborators that join</p>
                      </div>

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

                      <div className="space-y-2">
                        <FormLabel>Organization Logo</FormLabel>
                        <div className="flex items-start gap-4">
                          <div className="w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center relative">
                            {organizationLogoUrl ? (
                              <>
                                <img 
                                  src={organizationLogoUrl} 
                                  alt="Organization logo" 
                                  className="w-full h-full object-contain p-2"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="absolute -top-2 -right-2"
                                  onClick={() => setOrganizationLogoUrl(null)}
                                >
                                  Reset
                                </Button>
                              </>
                            ) : (
                              <DownloadCloud className="w-8 h-8 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <Input
                              type="file"
                              accept="image/jpeg,image/png,image/gif"
                              onChange={handleImageUpload}
                              disabled={uploading}
                              className="hidden"
                              id="logo-upload"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById('logo-upload')?.click()}
                              disabled={uploading}
                              className="w-full mb-2"
                            >
                              Upload a photo
                            </Button>
                            <p className="text-xs text-gray-500">
                              Allowed JPG, GIF or PNG. Max size of 800K
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button type="submit" className="w-full">
                          Continue
                        </Button>
                        <Button
                          type="button" 
                          variant="link"
                          className="w-full mt-2 text-gray-500"
                          onClick={() => setShowOrgSetup(false)}
                        >
                          Back to log in
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </div>
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
            onClick={() => setShowOrgSetup(true)} 
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