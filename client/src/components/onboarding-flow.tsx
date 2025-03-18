import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Upload, Building2, UserCircle, CheckCircle, X, Users, Plus, ChevronRight, Trash } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useLocation } from "wouter"
import { useAuth } from "@/hooks/use-auth"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

type Organization = {
  id: number;
  name: string;
  domain: string;
  logo_url?: string;
  member_count: number;
}

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
    <ChevronRight className="w-5 h-5 text-gray-400" />
  </button>
);

const organizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  domain: z.string().min(3, "Domain must be at least 3 characters"),
})

const profileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  jobTitle: z.string().min(2, "Job title must be at least 2 characters"),
})

const teamInviteSchema = z.object({
  emails: z.string().min(1, "Please enter at least one email"),
  allowDomainJoin: z.boolean().default(false),
})

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [organizationLogoUrl, setOrganizationLogoUrl] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<number | null>(null)
  const [existingOrganizations, setExistingOrganizations] = useState<Organization[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const { toast } = useToast()
  const [, setLocation] = useLocation()
  const { user } = useAuth()
  const [emails, setEmails] = useState<string[]>([])
  const [currentEmail, setCurrentEmail] = useState('')
  const [loading, setLoading] = useState(true)

  const orgForm = useForm<z.infer<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
      domain: user?.email?.split("@")[1] || "",
    },
  })

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      jobTitle: "",
    },
  })

  const teamInviteForm = useForm<z.infer<typeof teamInviteSchema>>({
    resolver: zodResolver(teamInviteSchema),
    defaultValues: {
      allowDomainJoin: false,
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

      const { data: memberOrgs, error: memberError } = await supabase
        .from('profiles')
        .select('organization_id, organizations(*)')
        .eq('email', user.email)

      if (memberError) throw memberError

      const { data: invitations, error: inviteError } = await supabase
        .from('invitations')
        .select('*')
        .eq('email', user.email)
        .eq('accepted', false)

      if (inviteError) throw inviteError

      const domain = user.email.split('@')[1]
      const { data: domainOrgs, error: domainError } = await supabase
        .from('organizations')
        .select('*')
        .eq('domain', domain)

      if (domainError) throw domainError

      const allOrgs = [
        ...(memberOrgs?.map(m => m.organizations) || []),
        ...(domainOrgs || [])
      ]

      const uniqueOrgs = Array.from(new Set(allOrgs.map(org => org.id)))
        .map(id => allOrgs.find(org => org.id === id))
        .filter(Boolean) as Organization[]

      setExistingOrganizations(uniqueOrgs)

      const isNewAdmin = uniqueOrgs.length === 0 && invitations.length === 0
      setIsAdmin(isNewAdmin)

      if (uniqueOrgs.length === 0 && invitations.length === 0) {
        setCurrentStep('org-setup')
      } else if (uniqueOrgs.length > 0) {
        setCurrentStep('org-select')
      } else {
        setCurrentStep('org-select')
      }

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
        logo_url: organizationLogoUrl,
      }).select().single()

      if (error) throw error

      setOrganizationId(newOrg.id)

      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: user.id,
        email: user.email,
        organization_id: newOrg.id,
        role: isAdmin ? 'admin' : 'member',
      })

      if (profileError) throw profileError

      toast({
        title: "Success",
        description: "Organization created successfully",
      })
      setCurrentStep('profile')
    } catch (error: any) {
      console.error('Organization creation error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error creating organization",
      })
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'logo') => {
    try {
      setUploading(true)
      const file = event.target.files?.[0]
      if (!file) return

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("File size must be less than 5MB")
      }

      if (!file.type.startsWith('image/')) {
        throw new Error("Please upload an image file")
      }

      const fileExt = file.name.split('.').pop()
      const folder = type === 'avatar' ? 'avatars' : 'organizations'
      const filePath = `${user?.id}/${Math.random()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from(folder)
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from(folder)
        .getPublicUrl(filePath)

      if (type === 'avatar') {
        //setAvatarUrl(publicUrl)
      } else {
        setOrganizationLogoUrl(publicUrl)
      }

      toast({
        title: "Success",
        description: `${type === 'avatar' ? 'Profile picture' : 'Organization logo'} uploaded successfully`,
      })
    } catch (error: any) {
      console.error('Upload error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || `Error uploading ${type === 'avatar' ? 'profile picture' : 'organization logo'}`,
      })
    } finally {
      setUploading(false)
    }
  }

  const completeProfile = async (data: z.infer<typeof profileSchema>) => {
    try {
      if (!user?.id) throw new Error("Missing user information")
      if (!user.email) throw new Error("Missing user email")

      let orgId = organizationId
      if (!orgId) {
        const domain = user.email.split('@')[1]
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('domain', domain)
          .single()

        if (orgError) throw new Error("Error fetching organization")
        if (!org?.id) throw new Error("Organization not found")
        orgId = org.id
        setOrganizationId(orgId)
      }

      const { error } = await supabase.from('profiles').insert({
        user_id: user.id,
        first_name: data.firstName,
        last_name: data.lastName,
        job_title: data.jobTitle,
        email: user.email,
        organization_id: orgId,
      }).select().single()

      if (error) throw error

      toast({
        title: "Success!",
        description: "Profile completed successfully",
      })
      setCurrentStep('team')
    } catch (error: any) {
      console.error('Profile completion error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error completing profile",
      })
    }
  }

  const handleTeamInvites = async (data: z.infer<typeof teamInviteSchema>) => {
    try {
      if (!organizationId) throw new Error("Organization not found")
      if (!user?.id) throw new Error("User not found")

      const { error } = await supabase.from('invitations').insert(
        emails.map(email => ({
          organization_id: organizationId,
          email,
          invited_by: user.id,
          auto_join: data.allowDomainJoin
        }))
      )

      if (error) throw error

      toast({
        title: "Success!",
        description: "Team invites have been sent successfully.",
      })
      setCurrentStep('complete')

      setTimeout(() => {
        setLocation('/')
      }, 2000)
    } catch (error: any) {
      console.error('Team invite error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error sending team invites",
      })
    }
  }

  const resetLogo = () => {
    setOrganizationLogoUrl(null)
  }

  const steps = [
    {
      id: "org-setup",
      title: "Organization Setup",
      icon: Building2,
      description: "Set up your organization"
    },
    {
      id: "org-select",
      title: "Organization Selection",
      icon: Building2,
      description: "Select your organization"
    },
    {
      id: "profile",
      title: "Profile Setup",
      icon: UserCircle,
      description: "Complete your profile"
    },
    {
      id: "team",
      title: "Team Invites",
      icon: Users,
      description: "Invite your team"
    },
    {
      id: "complete",
      title: "Complete",
      icon: CheckCircle,
      description: "All set!"
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Welcome to Qwenzy</CardTitle>
          <CardDescription>Get started with your organization</CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 'org-setup' ? (
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Create your organization</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Set up your organization to start collaborating with your team
                </p>
                <Form {...orgForm}>
                  <form onSubmit={orgForm.handleSubmit(createOrganization)} className="space-y-4">
                    <FormField
                      control={orgForm.control}
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
                      control={orgForm.control}
                      name="domain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Domain</FormLabel>
                          <FormControl>
                            <Input {...field} disabled />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      {organizationLogoUrl ? (
                        <div className="relative w-32 h-32 mx-auto">
                          <img
                            src={organizationLogoUrl}
                            alt="Organization logo"
                            className="w-full h-full object-contain rounded-lg border border-gray-200"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                            onClick={resetLogo}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'logo')}
                            disabled={uploading}
                            className="hidden"
                            id="logo-upload"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById('logo-upload')?.click()}
                            disabled={uploading}
                            className="w-full"
                          >
                            {uploading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              'Upload Organization Logo'
                            )}
                          </Button>
                        </>
                      )}
                    </div>

                    <Button type="submit" className="w-full bg-[#407c87] hover:bg-[#386d77]">Create Organization</Button>
                  </form>
                </Form>
              </div>
            </div>
          ) : currentStep === 'org-select' && existingOrganizations.length > 0 ? (
            <div className="space-y-6">
              {isAdmin && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-2">Create an organization</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Set up a new organization for your team
                  </p>
                  <Button
                    onClick={() => setCurrentStep('org-setup')}
                    className="w-full bg-[#407c87] hover:bg-[#386d77]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create an organization
                  </Button>
                </div>
              )}

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Open an organization</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Select an organization you're already a part of
                </p>
                <div className="space-y-2">
                  {existingOrganizations.map((org) => (
                    <OrganizationCard
                      key={org.id}
                      org={org}
                      onSelect={() => {
                        setOrganizationId(org.id)
                        setCurrentStep('profile')
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <Tabs value={currentStep} className="w-full">
            <TabsContent value="profile">
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(completeProfile)} className="space-y-4">
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative h-24 w-24 rounded-full overflow-hidden bg-gray-100">
                      <div className="h-full w-full flex items-center justify-center bg-gray-100">
                        <Upload className="h-8 w-8 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'avatar')}
                    disabled={uploading}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    disabled={uploading}
                    className="w-full"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      'Upload Profile Picture'
                    )}
                  </Button>

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
                            setEmails([...emails, currentEmail])
                            setCurrentEmail('')
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
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="auto-join"
                        checked={teamInviteForm.watch('allowDomainJoin')}
                        onCheckedChange={(checked) =>
                          teamInviteForm.setValue('allowDomainJoin', checked)
                        }
                      />
                      <Label htmlFor="auto-join">
                        Allow anyone with matching email domain to join automatically
                      </Label>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={emails.length === 0}
                  >
                    Send Invites & Complete Setup
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="complete">
              <div className="text-center space-y-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
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
  )
}