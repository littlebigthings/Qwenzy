import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { ChevronDown, BarChartIcon, Upload, Plus } from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { Link } from "wouter"
import { supabase } from "@/lib/supabase"
import Modal from "@/components/ui/modal"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { MultiStepWorkspaceModal } from "@/components/workspace/multi-step-workspace-modal"

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
  const [workspaces, setWorkspaces] = useState([])
  const [hasIncompleteWorkspace, setHasIncompleteWorkspace] = useState(false)
  const [incompleteWorkspaceName, setIncompleteWorkspaceName] = useState("")

  // Add debugging to check if we are getting workspaces
  useEffect(() => {
    if (user) {
      const fetchWorkspaces = async () => {
        try {
          const { data, error } = await supabase
            .from("workspaces")
            .select("*")
            .eq("created_by", user.id)
            .eq("completed", true)
          
          console.log("DEBUG - Fetched workspaces:", data)
          console.log("DEBUG - User ID:", user.id)
          
          if (error) {
            console.error("Error fetching workspaces:", error)
            return
          }
          
          if (data && data.length > 0) {
            setWorkspaces(data)
            console.log("Setting workspaces:", data)
          } else {
            console.log("No completed workspaces found")
          }
        } catch (error) {
          console.error("Error in fetchWorkspaces:", error)
        }
      }
      
      fetchWorkspaces()
    }
  }, [user])

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

          // Check for incomplete workspaces
          const { data: incompleteWorkspaces } = await supabase
            .from('workspaces')
            .select('name, completed')
            .eq('created_by', user.id)
            .eq('completed', false) 
            .limit(1)

          if (incompleteWorkspaces && incompleteWorkspaces.length > 0) {
            setHasIncompleteWorkspace(true)
            setIncompleteWorkspaceName(incompleteWorkspaces[0].name)
          } else {
            setHasIncompleteWorkspace(false)
          }
          
          // Fetch completed workspaces
          const { data: completedWorkspaces } = await supabase
            .from("workspaces")
            .select("*")
            .eq("created_by", user.id)
            .eq("completed", true)
            .order("updated_at", { ascending: false })

          if (completedWorkspaces && completedWorkspaces.length > 0) {
            setWorkspaces(completedWorkspaces)
            console.log("Fetched workspaces:", completedWorkspaces)
          }
        } catch (error) {
          console.error("Error fetching data:", error)
        }
      }
    }
    
    fetchData()
  }, [user])

  // Function to handle creating a new workspace
  const handleCreateWorkspace = () => {
    if (hasIncompleteWorkspace) {
      setWorkspaceName(incompleteWorkspaceName)
      setShowWorkspacePrompt(true)
    } else {
      setWorkspaceName("")
      setShowWorkspaceModal(true)
    }
  }

  // Function to handle the completion of workspace creation
  const handleWorkspaceCreated = async (workspaceId) => {
    setShowWorkspaceModal(false);
    
    // Refresh workspaces list
    if (user) {
      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .eq("created_by", user.id)
        .eq("completed", true)
        .order("updated_at", { ascending: false });
        
      if (error) {
        console.error("Error refreshing workspaces:", error);
      } else if (data) {
        setWorkspaces(data);
      }
    }
  };

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
              <button 
                className={`w-full flex items-center px-4 py-2 ${activeMenu === 'dashboard' 
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
              </button>
            </li>
            <li>
              <button 
                className={`w-full flex items-center px-4 py-2 ${activeMenu === 'updates' 
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
              </button>
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
                  <button className={`w-full text-left px-4 py-2 ${activeMenu === 'list-main' 
                    ? 'bg-[#579189] text-white' 
                    : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => setActiveMenu('list-main')}
                  >
                    List
                  </button>
                </li>
                <li>
                  <button className={`w-full text-left px-4 py-2 ${activeMenu === 'list-1' 
                    ? 'bg-[#579189] text-white' 
                    : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => setActiveMenu('list-1')}
                  >
                    List
                  </button>
                </li>
                <li>
                  <button className={`w-full text-left px-4 py-2 ${activeMenu === 'list-2' 
                    ? 'bg-[#579189] text-white' 
                    : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => setActiveMenu('list-2')}
                  >
                    List
                  </button>
                </li>
                <li>
                  <button className={`w-full text-left px-4 py-2 ${activeMenu === 'list-3' 
                    ? 'bg-[#579189] text-white' 
                    : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => setActiveMenu('list-3')}
                  >
                    List
                  </button>
                </li>
              </ul>
            </li>

            <li>
              <button 
                className={`w-full flex items-center px-4 py-2 ${activeMenu === 'roles' 
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
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto bg-[url('/background-pattern.svg')]">
        <main className="p-8">
          {/* Welcome section - Only shows when no workspaces exist */}
          {workspaces.length === 0 && (
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8 mb-8 text-center border border-[#eaecee]">
              <h1 className="text-3xl font-medium text-[#2c6e49] mb-4">Welcome {userName}!</h1>
              
              <div className="max-w-md mx-auto">
                <h2 className="text-xl font-medium mb-2">Kickstart Your Workspace Creation</h2>
                <p className="text-gray-600 mb-6">
                  A workspace is your central hub for organizing projects, tasks, and 
                  teams. Create one to start managing your work efficiently and 
                  collaborate seamlessly
                </p>
                
                <Button 
                  className="bg-[#2c6e49] hover:bg-[#245a3a] flex items-center mx-auto"
                  onClick={handleCreateWorkspace}
                >
                  <Plus className="h-4 w-4 mr-2" /> Create a workspace
                </Button>
              </div>
            </div>
          )}

          {/* Workspaces Section - Updated to match the design */}
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-medium text-gray-800">Workspaces</h2>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Input 
                    type="text" 
                    placeholder="Search" 
                    className="pl-9 w-72 focus:outline-none focus:ring-1 focus:ring-[#2c6e49]" 
                  />
                  <svg className="w-5 h-5 absolute left-2 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <Button 
                  className="bg-[#2c6e49] hover:bg-[#245a3a] text-white"
                  onClick={handleCreateWorkspace}
                >
                  <Plus className="h-4 w-4 mr-2" /> Create a workspace
                </Button>
              </div>
            </div>
            
            {/* Workspace table */}
            <div className="bg-white rounded-lg shadow-sm border border-[#eaecee]">
              {/* Workspace Table Headers */}
              <div className="grid grid-cols-10 py-3 border-b text-sm text-gray-500 font-medium">
                <div className="col-span-1 px-6"></div>
                <div className="col-span-4 px-2">Name</div>
                <div className="col-span-3 px-2">Owner</div>
                <div className="col-span-1 px-2">Team</div>
                <div className="col-span-1 px-2 text-right pr-6"></div>
              </div>
              
              {/* Workspace Rows */}
              {workspaces.length > 0 ? (
                <div>
                  {workspaces.map((workspace) => (
                    <div key={workspace.id} className="grid grid-cols-10 items-center py-4 border-b hover:bg-gray-50 transition-colors">
                      <div className="col-span-1 px-6 text-gray-500 text-sm font-medium text-center">WS</div>
                      <div className="col-span-4 px-2">
                        <div className="font-medium">{workspace.name}</div>
                        <div className="text-xs text-gray-500">{new Date(workspace.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      </div>
                      <div className="col-span-3 px-2 flex items-center">
                        <div className="w-8 h-8 bg-[#2c6e49] rounded-full flex items-center justify-center text-white font-medium mr-2">
                          {userName?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <div className="font-medium">{userName}</div>
                          <div className="text-xs text-gray-500">Owner</div>
                        </div>
                      </div>
                      <div className="col-span-1 px-2">
                        <div className="flex -space-x-2">
                          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-medium border-2 border-white z-10">
                            {userName?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium border-2 border-white z-0">
                            A
                          </div>
                        </div>
                      </div>
                      <div className="col-span-1 px-2 text-right pr-6">
                        <Button 
                          variant="outline" 
                          className="text-[#2c6e49] border-[#2c6e49] hover:bg-[#f0f9f6]"
                          onClick={() => {
                            // Open workspace
                          }}
                        >
                          Open
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No workspaces found
                </div>
              )}
            </div>
          </div>

          {/* Complete creation modal - only shows when there's an incomplete workspace */}
          {showWorkspacePrompt && (
            <Modal
              isOpen={showWorkspacePrompt}
              title="Complete creating a workspace"
              onClose={() => setShowWorkspacePrompt(false)}
            >
              <div className="p-5">
                <p className="text-center text-gray-600 mb-4">
                  You have started creating a workspace called <span className="font-medium">{workspaceName}</span>.
                  Would you like to continue where you left off?
                </p>
                <div className="flex justify-center space-x-4 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowWorkspacePrompt(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-[#2c6e49] hover:bg-[#245a3a]"
                    onClick={() => { setShowWorkspacePrompt(false); setShowWorkspaceModal(true); }}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </Modal>
          )}
          
          {/* Multi-step Workspace creation modal */}
          <MultiStepWorkspaceModal
            isOpen={showWorkspaceModal}
            onClose={() => setShowWorkspaceModal(false)}
            onComplete={handleWorkspaceCreated}
          />
        </main>
      </div>
    </div>
  )
}
