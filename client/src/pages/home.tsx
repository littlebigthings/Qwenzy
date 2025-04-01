import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { ChevronDown, BarChartIcon, PlusIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useLocation } from "wouter"
import { supabase } from "@/lib/supabase"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function Home() {
  const { user } = useAuth()
  const [location, navigate] = useLocation()
  const [organization, setOrganization] = useState({ name: "Lit Big Things", id: "" })
  const [userName, setUserName] = useState("Sarah")
  const [activeMenu, setActiveMenu] = useState("dashboard") // Default active menu is dashboard
  const [workspaceName, setWorkspaceName] = useState("")
  const [workspaceDescription, setWorkspaceDescription] = useState("")

  useEffect(() => {
    // Get organization and user data
    const fetchData = async () => {
      if (user) {
        // Update with real user name when available
        setUserName(user.email?.split('@')[0] || "User")
        
        // Fetch user's organization
        try {
          const { data: memberships, error } = await supabase
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
                name: orgData.name || "My Organization"
              })
            }
          }
        } catch (error) {
          console.error("Error fetching organization:", error)
        }
      }
    }
    
    fetchData()
  }, [user])

  const createWorkspace = async () => {
    if (!workspaceName.trim()) return
    
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .insert([
          { 
            name: workspaceName,
            description: workspaceDescription,
            organization_id: organization.id,
            created_by: user?.id
          }
        ])
        .select()
        
      if (error) throw error
      
      // Reset form
      setWorkspaceName("")
      setWorkspaceDescription("")
      
      // Navigate to the new workspace (commented out for now)
      // if (data && data[0]) {
      //   navigate(`/workspace/${data[0].id}`)
      // }
    } catch (error) {
      console.error("Error creating workspace:", error)
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-56 bg-white shadow-sm z-10 border-r">
        {/* Header */}
        <div className="p-4 bg-[#2c6e49] text-white flex items-center">
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
              <div 
                className={`flex items-center px-4 py-2 cursor-pointer ${activeMenu === 'dashboard' 
                  ? 'bg-[#2c6e49] text-white' 
                  : 'text-gray-600 hover:bg-gray-100'}`}
                onClick={() => {
                  setActiveMenu('dashboard');
                  navigate('/dashboard');
                }}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
                <svg className="w-5 h-5 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </li>
            <li>
              <div
                className={`flex items-center px-4 py-2 cursor-pointer ${activeMenu === 'updates' 
                  ? 'bg-[#2c6e49] text-white' 
                  : 'text-gray-600 hover:bg-gray-100'}`}
                onClick={() => {
                  setActiveMenu('updates');
                  navigate('/updates');
                }}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Updates
                <span className="ml-auto bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</span>
                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </li>

            {/* APPLICATION section */}
            <li className="mt-6 px-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">APPLICATION</p>
            </li>
            <li>
              <button 
                className={`w-full flex items-center px-4 py-2 ${activeMenu === 'list' 
                  ? 'bg-[#2c6e49] text-white' 
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
                  <div
                    className={`block px-4 py-2 cursor-pointer ${activeMenu === 'list-main' 
                      ? 'bg-[#2c6e49] text-white' 
                      : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => {
                      setActiveMenu('list-main');
                      navigate('/list');
                    }}
                  >List</div>
                </li>
                <li>
                  <div
                    className={`block px-4 py-2 cursor-pointer ${activeMenu === 'list-1' 
                      ? 'bg-[#2c6e49] text-white' 
                      : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => {
                      setActiveMenu('list-1');
                      navigate('/list/1');
                    }}
                  >List</div>
                </li>
                <li>
                  <div
                    className={`block px-4 py-2 cursor-pointer ${activeMenu === 'list-2' 
                      ? 'bg-[#2c6e49] text-white' 
                      : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => {
                      setActiveMenu('list-2');
                      navigate('/list/2');
                    }}
                  >List</div>
                </li>
                <li>
                  <div
                    className={`block px-4 py-2 cursor-pointer ${activeMenu === 'list-3' 
                      ? 'bg-[#2c6e49] text-white' 
                      : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => {
                      setActiveMenu('list-3');
                      navigate('/list/3');
                    }}
                  >List</div>
                </li>
              </ul>
            </li>

            <li>
              <div
                className={`flex items-center px-4 py-2 cursor-pointer ${activeMenu === 'roles' 
                  ? 'bg-[#2c6e49] text-white' 
                  : 'text-gray-600 hover:bg-gray-100'}`}
                onClick={() => {
                  setActiveMenu('roles');
                  navigate('/roles');
                }}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Roles & Permissions
                <svg className="w-5 h-5 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
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
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-[#2c6e49] hover:bg-[#245a3a] flex items-center mx-auto">
                    <PlusIcon className="w-4 h-4 mr-2" /> Create a workspace
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Create a workspace</DialogTitle>
                    <DialogDescription>
                      Create a new workspace to organize your projects and collaborate with your team.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="workspace-name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="workspace-name"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        className="col-span-3"
                        placeholder="Enter workspace name"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="workspace-description" className="text-right">
                        Description
                      </Label>
                      <Textarea
                        id="workspace-description"
                        value={workspaceDescription}
                        onChange={(e) => setWorkspaceDescription(e.target.value)}
                        className="col-span-3"
                        placeholder="Enter workspace description"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button 
                      type="submit" 
                      className="bg-[#2c6e49] hover:bg-[#245a3a]"
                      onClick={createWorkspace}
                    >
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
    </div>
  )
}
