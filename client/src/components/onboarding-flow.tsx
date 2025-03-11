import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Upload, Building2, UserCircle, CheckCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useLocation } from "wouter"
import { useAuth } from "@/hooks/use-auth"

const steps = [
  {
    id: "org-check",
    title: "Organization Check",
    icon: Building2,
    description: "Verify your organization"
  },
  {
    id: "org-setup",
    title: "Organization Setup",
    icon: Building2,
    description: "Set up your organization"
  },
  {
    id: "profile",
    title: "Profile Setup",
    icon: UserCircle,
    description: "Complete your profile"
  },
  {
    id: "complete",
    title: "Complete",
    icon: CheckCircle,
    description: "All set!"
  }
]

const organizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  domain: z.string().min(3, "Domain must be at least 3 characters"),
})

const profileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  jobTitle: z.string().min(2, "Job title must be at least 2 characters"),
})

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState("org-check")
  const [uploading, setUploading] = useState(false)
  const [organizationLogoUrl, setOrganizationLogoUrl] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [foundOrganization, setFoundOrganization] = useState<any>(null)
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

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      jobTitle: "",
    },
  })

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
        setAvatarUrl(publicUrl)
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

  const checkOrganization = async () => {
    if (!user?.email) return

    const domain = user.email.split('@')[1]
    const { data: org, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('domain', domain)
      .single()

    if (error && error.code !== 'PGRST116') {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error checking organization",
      })
      return
    }

    setFoundOrganization(org)
    if (org) {
      toast({
        title: "Organization found",
        description: `Found organization: ${org.name}`,
      })
    } else {
      setCurrentStep('org-setup')
    }
  }

  const createOrganization = async (data: z.infer<typeof organizationSchema>) => {
    try {
      const { error } = await supabase.from('organizations').insert({
        name: data.name,
        domain: data.domain,
        logo_url: organizationLogoUrl,
      }).select().single()

      if (error) throw error

      toast({
        title: "Success",
        description: "Organization created successfully",
      })
      setCurrentStep('profile')
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error creating organization",
      })
    }
  }

  const completeProfile = async (data: z.infer<typeof profileSchema>) => {
    try {
      if (!user?.id || !foundOrganization?.id) throw new Error("Missing user or organization information")

      const { error } = await supabase.from('profiles').insert({
        user_id: user.id,
        first_name: data.firstName,
        last_name: data.lastName,
        job_title: data.jobTitle,
        email: user.email,
        avatar_url: avatarUrl,
        organization_id: foundOrganization.id,
      }).select().single()

      if (error) throw error

      toast({
        title: "Success!",
        description: "Profile completed successfully. Welcome aboard!",
      })
      setCurrentStep('complete')

      // Redirect to home after a short delay
      setTimeout(() => {
        setLocation('/')
      }, 2000)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error completing profile",
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Welcome to Qwenzy</CardTitle>
          <CardDescription>Let's get you set up</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-8">
            {/* Progress Indicator */}
            <div className="w-64 space-y-4">
              {steps.map((step) => {
                const Icon = step.icon
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      currentStep === step.id
                        ? "bg-primary text-primary-foreground"
                        : "text-gray-500"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <div>
                      <p className="font-medium">{step.title}</p>
                      <p className="text-sm opacity-80">{step.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Content Area */}
            <div className="flex-1">
              <Tabs value={currentStep} className="w-full">
                <TabsContent value="org-check">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Checking Your Organization</h3>
                    <p className="text-gray-600">
                      We'll check if your organization is already registered based on your email domain.
                    </p>
                    <Button onClick={checkOrganization}>
                      Check Organization
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="org-setup">
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
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div>
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
                      </div>

                      <Button type="submit">Create Organization</Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="profile">
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(completeProfile)} className="space-y-4">
                      <div className="flex items-center justify-center mb-6">
                        <div className="relative h-24 w-24 rounded-full overflow-hidden bg-gray-100">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gray-100">
                              <Upload className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
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
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}