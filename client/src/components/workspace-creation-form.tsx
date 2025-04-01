import { useState } from "react"
import { DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

interface WorkspaceCreationFormProps {
  onComplete: () => void
}

export function WorkspaceCreationForm({ onComplete }: WorkspaceCreationFormProps) {
  const { user } = useAuth()
  const [workspaceName, setWorkspaceName] = useState("Website SEO")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      
      // Check file size (800KB max)
      if (file.size > 800 * 1024) {
        alert("File is too large. Maximum size is 800KB.")
        return
      }
      
      // Check file type
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        alert("Only JPG, PNG, and GIF files are allowed.")
        return
      }
      
      setLogoFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const resetLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
  }

  const handleSubmit = async () => {
    if (!workspaceName.trim()) {
      alert("Please enter a workspace name")
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Upload logo if there's a file
      let logoUrl = null
      if (logoFile && user) {
        const fileName = `workspace-logo-${Date.now()}`
        const fileExt = logoFile.name.split('.').pop()
        const filePath = `workspaces/${fileName}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('workspace-assets')
          .upload(filePath, logoFile)
          
        if (uploadError) {
          throw uploadError
        }
        
        // Get the public URL
        const { data } = supabase.storage
          .from('workspace-assets')
          .getPublicUrl(filePath)
          
        logoUrl = data.publicUrl
      }
      
      // Create the workspace in database
      const { data: workspace, error } = await supabase
        .from('workspaces')
        .insert({
          name: workspaceName,
          organization_id: user?.id, // Assuming organization ID is stored or accessible here
          logo_url: logoUrl,
          is_complete: true
        })
        .select()
        .single()
        
      if (error) {
        throw error
      }
      
      onComplete()
    } catch (error) {
      console.error("Error creating workspace:", error)
      alert("Failed to create workspace. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DialogContent className="max-w-md rounded-lg p-6 border-0 shadow-lg">
      <div className="flex flex-col space-y-5">
        <button className="absolute right-5 top-5 text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
        
        <div>
          <p className="text-sm text-gray-500">Step 1</p>
          <h2 className="text-xl font-medium text-gray-800 mb-1">Create Workspace</h2>
          <p className="text-sm text-gray-500">Let us know what your team is working on right now</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="workspace-name">Workspace name</Label>
          <Input 
            id="workspace-name"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            className="border-gray-300 focus-visible:ring-[#2c6e49]"
          />
          <p className="text-xs text-gray-400">
            Your workspace name has been set as initially added. You can change it now if you want
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="workspace-logo">Workspace Logo</Label>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-gray-100 flex items-center justify-center relative border border-gray-200 rounded-sm">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
              ) : (
                <Upload className="h-5 w-5 text-gray-400" />
              )}
            </div>
            
            <div className="space-x-2">
              <Button 
                type="button"
                variant="outline"
                className="bg-[#2c6e49] text-white hover:bg-[#245a3a]"
                onClick={() => document.getElementById('logo-upload')?.click()}
              >
                Upload a photo
              </Button>
              
              <Button 
                type="button"
                variant="outline"
                className="border-gray-200 text-gray-500"
                onClick={resetLogo}
                disabled={!logoPreview}
              >
                Reset
              </Button>
              
              <input 
                type="file"
                id="logo-upload"
                accept="image/jpeg,image/png,image/gif"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Allowed JPG, GIF or PNG. Max size of 800K
          </p>
        </div>
        
        <Button 
          className="bg-[#2c6e49] hover:bg-[#245a3a] w-full h-12 mt-4"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Continue"}
        </Button>
      </div>
    </DialogContent>
  )
}
