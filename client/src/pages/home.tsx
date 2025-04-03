import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { ChevronDown, BarChartIcon, Upload } from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { Link } from "wouter"
import { supabase } from "@/lib/supabase"
import Modal from "@/components/ui/modal"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export default function Home() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [organization, setOrganization] = useState({ name: "", id: "" })
  const [userName, setUserName] = useState("")
  const [activeMenu, setActiveMenu] = useState("dashboard")
  const [showWorkspacePrompt, setShowWorkspacePrompt] = useState(false)
  const [workspaceName, setWorkspaceName] = useState("")
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const fileInputRef = useRef(null)

  // Function to handle logo upload
  const handleLogoUpload = (file) => {
    if (!file) return

    // Check file size (800KB max)
    if (file.size > 800 * 1024) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "File size must be less than 800K",
      })
      return
    }

    // Check file type
    if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "File must be JPG, PNG or GIF",
      })
      return
    }

    setLogoFile(file)
    
    // Create a preview URL for the image
    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  // Reset logo
  const resetLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        setUserName(user.email?.split('@')[0] || "User")
        
        // Fetch user's organization
        try {
          const { data: memberships } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', user.id)
            .limit(1)

          if (memberships && memberships.length > 0) {
            const { data: orgData } = await supabase
              .from('organizations')
              .select('*')
              .eq('id', memberships[0].organization_id)
              .single()
              
            if (orgData) {
              setOrganization({
                id: orgData.id,
                name: orgData.name
              })
            }
          }

          const { data: workspaces } = await supabase
          .from('workspaces')
          .select('name, completed')
          .eq('created_by', user.id)
          .eq('completed', false) 
          .limit(1)

          if (workspaces && workspaces.length > 0) {
            setWorkspaceName(workspaces[0].name)
            setShowWorkspacePrompt(true)
          }
        } catch (error) {
          console.error("Error fetching data:", error)
        }
      }
    }
    
    fetchData()
  }, [user])

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-56 bg-white shadow-sm z-10 border-r">
        {/* Header */}
        <div className="p-4 bg-[#579189] text-white flex items-center">
          <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-[#2c6e49] font-bold">
            {organization.name.charAt(0)}
          </div>
          <span className="font-medium ml-2">{organization.name}</span>
          <button className="ml-auto">
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="py-2">
          <ul>
            <li>
              <Link href="/dashboard">
                <a 
                  className={`flex items-center px-4 py-2 ${activeMenu === 'dashboard' 
                    ? 'bg-[#579189] text-white' 
                    : 'text-gray-600 hover:bg-gray-100'}`}
                  onClick={() => setActiveMenu('dashboard')}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                  <svg className="w-5 h-5 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/updates">
                <a 
                  className={`flex items-center px-4 py-2 ${activeMenu === 'updates' 
                    ? 'bg-[#579189] text-white' 
                    : 'text-gray-600 hover:bg-gray-100'}`}
                  onClick={() => setActiveMenu('updates')}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Updates
                  <span className="ml-auto bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</span>
                  <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </Link>
            </li>

            {/* APPLICATION section */}
            <li className="mt-6 px-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">APPLICATION</p>
            </li>
            <li>
              <button 
                className={`w-full flex items-center px-4 py-2 ${activeMenu === 'list' 
                  ? 'bg-[#579189] text-white' 
                  : 'text-gray-600 hover:bg-gray-100'}`}
                onClick={() => setActiveMenu('list')}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                List
                <svg className="w-5 h-5 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <ul className="pl-10">
                <li>
                  <Link href="/list">
                    <a className={`block px-4 py-2 ${activeMenu === 'list-main' 
                      ? 'bg-[#579189] text-white' 
                      : 'text-gray-600 hover:bg-gray-100'}`}
                      onClick={() => setActiveMenu('list-main')}
                    >List</a>
                  </Link>
                </li>
                <li>
                  <Link href="/list/1">
                    <a className={`block px-4 py-2 ${activeMenu === 'list-1' 
                      ? 'bg-[#579189] text-white' 
                      : 'text-gray-600 hover:bg-gray-100'}`}
                      onClick={() => setActiveMenu('list-1')}
                    >List</a>
                  </Link>
                </li>
                <li>
                  <Link href="/list/2">
                    <a className={`block px-4 py-2 ${activeMenu === 'list-2' 
                      ? 'bg-[#579189] text-white' 
                      : 'text-gray-600 hover:bg-gray-100'}`}
                      onClick={() => setActiveMenu('list-2')}
                    >List</a>
                  </Link>
                </li>
                <li>
                  <Link href="/list/3">
                    <a className={`block px-4 py-2 ${activeMenu === 'list-3' 
                      ? 'bg-[#579189] text-white' 
                      : 'text-gray-600 hover:bg-gray-100'}`}
                      onClick={() => setActiveMenu('list-3')}
                    >List</a>
                  </Link>
                </li>
              </ul>
            </li>

            <li>
              <Link href="/roles">
                <a 
                  className={`flex items-center px-4 py-2 ${activeMenu === 'roles' 
                    ? 'bg-[#579189] text-white' 
                    : 'text-gray-600 hover:bg-gray-100'}`}
                  onClick={() => setActiveMenu('roles')}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Roles & Permissions
                  <svg className="w-5 h-5 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto bg-[url('/background-pattern.svg')]">
        <main className="p-8">
          {/* Welcome section */}
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8 mb-8 text-center">
            <h1 className="text-3xl font-semibold text-[#2c6e49] mb-4">Welcome {userName}!</h1>
            
            <div className="max-w-md mx-auto">
              <h2 className="text-xl font-medium mb-2">Kickstart Your Workspace Creation</h2>
              <p className="text-gray-600 mb-6">
                A workspace is your central hub for organizing projects, tasks, and 
                teams. Create one to start managing your work efficiently and 
                collaborate seamlessly
              </p>
              
              <Button 
                className="bg-[#2c6e49] hover:bg-[#245a3a] flex items-center mx-auto"
                onClick={() => setShowWorkspacePrompt(true)}
              >
                <span className="mr-2">+</span> Create a workspace
              </Button>
            </div>
          </div>

          {/* Projects section */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Active projects */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-700">No Active Projects</h2>
                <button className="text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
              </div>
              
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChartIcon className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-1">
                  Join a workspace or create your own to start adding & tracking your projects
                </p>
              </div>
            </div>

            {/* Recent projects */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-700">No recently opened projects</h2>
              </div>
              
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChartIcon className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-1">
                  Join a workspace or create your own to start adding & tracking your projects
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* First modal */}
      {showWorkspacePrompt && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-[500px]">
            <div className="flex flex-col space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-[#edf2f0] rounded-md flex items-center justify-center">
                  <div className="w-6 h-6 text-[#579189] flex items-center justify-center font-semibold">
                    i
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Complete creating a workspace</h2>
                  <p className="text-gray-600 text-lg">
                    Add team members, projects & tasks and much more to your workspace
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <button 
                  className="flex-1 bg-[#2c6e49] hover:bg-[#245a3a] text-white h-12 rounded-md flex items-center justify-center"
                  onClick={() => { setShowWorkspacePrompt(false); setShowWorkspaceModal(true); }}
                >
                  Continue
                </button>
                <button 
                  className="flex-1 bg-gray-100 text-gray-600 h-12 rounded-md flex items-center justify-center"
                  onClick={() => setShowWorkspacePrompt(false)}
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Second modal */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-[500px] relative">
            <button 
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              onClick={() => setShowWorkspaceModal(false)}
            >
              &times;
            </button>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Step 1</p>
                <h2 className="text-xl font-medium text-gray-800 mb-1">Create Workspace</h2>
                <p className="text-sm text-gray-500">Let us know what your team is working on right now</p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="workspace-name" className="text-sm font-medium text-gray-700">Workspace name</label>
                <input 
                  id="workspace-name"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2"
                />
                <p className="text-xs text-gray-400">
                  Your workspace name has been set as initially added. You can change it now if you want
                </p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="workspace-logo" className="text-sm font-medium text-gray-700">Workspace Logo</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gray-100 flex items-center justify-center border border-gray-200 rounded-sm">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-5 w-5 text-gray-400" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    )}
                  </div>
                  
                  <div className="space-x-2">
                    <input
                      type="file"
                      id="logo-upload"
                      className="hidden"
                      accept="image/jpeg,image/png,image/gif"
                      onChange={(e) => e.target.files && handleLogoUpload(e.target.files[0])}
                      ref={fileInputRef}
                    />
                    <button 
                      className="bg-[#2c6e49] text-white px-3 py-1 rounded-md text-sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload a photo
                    </button>
                    
                    <button 
                      className="border border-gray-200 text-gray-500 px-3 py-1 rounded-md text-sm"
                      onClick={resetLogo}
                      disabled={!logoFile}
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  Allowed JPG, GIF or PNG. Max size of 800K
                </p>
              </div>
              
              <button 
                className="bg-[#2c6e49] hover:bg-[#245a3a] text-white w-full h-12 rounded-md mt-4"
                onClick={async () => {
                  try {
                    // Validate workspace name
                    if (!workspaceName.trim()) {
                      toast({
                        variant: "destructive",
                        title: "Error",
                        description: "Workspace name is required",
                      })
                      return
                    }

                    // Upload logo if exists
                    let logoUrl = null
                    if (logoFile) {
                      const fileExt = logoFile.name.split(".").pop()
                      const fileName = `workspace-${Date.now()}.${fileExt}`
                      const filePath = fileName

                      // Upload to the workspace-logos bucket
                      const { data, error: uploadError } = await supabase.storage
                        .from("workspace-logos")
                        .upload(filePath, logoFile, {
                          cacheControl: "3600",
                          upsert: false,
                          contentType: logoFile.type,
                        })

                      if (uploadError) {
                        console.error("Supabase storage error:", uploadError)
                        toast({
                          variant: "destructive",
                          title: "Error",
                          description: uploadError.message.includes("policy") 
                            ? "Storage permission denied. Please try again."
                            : "Failed to upload file",
                        })
                        return
                      }

                      const { data: urlData } = supabase.storage
                        .from("workspace-logos")
                        .getPublicUrl(filePath)

                      logoUrl = urlData.publicUrl
                    }

                    // Update workspace in database
                    const { data, error } = await supabase
                      .from("workspaces")
                      .update({
                        name: workspaceName.trim(),
                        logo_url: logoUrl,
                        completed: true,
                        updated_at: new Date().toISOString()
                      })
                      .eq("created_by", user?.id)
                      .eq("completed", false)

                    if (error) {
                      console.error("Error updating workspace:", error)
                      toast({
                        variant: "destructive",
                        title: "Error",
                        description: "Failed to create workspace",
                      })
                      return
                    }

                    // Close modal and show success
                    setShowWorkspaceModal(false)
                    toast({
                      title: "Success",
                      description: "Workspace created successfully!",
                    })

                    // Refresh the page to show the new workspace
                    setTimeout(() => {
                      window.location.reload()
                    }, 1500)
                  } catch (error) {
                    console.error("Error creating workspace:", error)
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: "An unexpected error occurred",
                    })
                  }
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
