import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Building2, DownloadCloud } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useLocation } from "wouter"
import { useAuth } from "@/hooks/use-auth"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const organizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
});

export function OnboardingFlow() {
  const [loading, setLoading] = useState(true)
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
    setLoading(false)
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      const file = event.target.files?.[0]
      if (!file) return

      if (file.size > 800 * 1024) { // 800KB limit
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
    <div className="min-h-screen flex p-4 bg-[#f8fafc]">
      <div className="w-64 space-y-2">
        <Tabs defaultValue="organization">
          <TabsList>
            <TabsTrigger value="organization">
              <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
                <Building2 className="w-5 h-5 text-[#407c87]" />
                <div>
                  <p className="font-medium">Organization</p>
                  <p className="text-sm text-gray-500">Details help any collaborators that join</p>
                </div>
              </div>
            </TabsTrigger>
            {/* Add more tabs here later */}
          </TabsList>
          <TabsContent value="organization">
            <Card className="w-full max-w-2xl">
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

                    <Button type="submit" className="w-full">
                      Continue
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
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