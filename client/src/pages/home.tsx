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
import Sidebar from "@/components/dashboard/sidebar"
import ConfirmDialog from "@/components/ui/confirm-dialog"
import info from "@/assets/info-circle.svg";

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
  const [role,setRole] = useState<string | null>(null);
  const [managerWorkspaces, setManagerWorkspaces] = useState<string[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [showRequestDialog,setShowRequestDialog] = useState<boolean>(false);
  const [reqWorkspace, setReqWorkspace] = useState<{
    id: string;
    organization_id: string;
    created_by: string;
  }>(null);
  
  // Add debugging to check if we are getting workspaces
  useEffect(() => {
    if (user) {
      const fetchWorkspaces = async () => {
        try {
          // Step 1: Get user profile
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("job_title, workspace_ids, organization_id")
            .eq("user_id", user.id)
            .single();
  
          if (profileError) {
            console.error("Error fetching profile:", profileError);
            return;
          }
  
          const { job_title, workspace_ids, organization_id } = profile || {};
          let workspaceQuery = supabase.from("workspaces").select("*, profiles(name)").eq("completed", true);
  
          setRole(job_title);
          if (job_title === "Admin" || job_title === "Manager") {
            if(job_title === "Manager"){
              setManagerWorkspaces(workspace_ids);
            }
            workspaceQuery = workspaceQuery.eq("organization_id", organization_id);
            
          } else {
            if (workspace_ids && workspace_ids.length > 0) {
              workspaceQuery = workspaceQuery.in("id", workspace_ids);
            } else {
              setWorkspaces([]);
              return;
            }
          }
  
          const { data, error } = await workspaceQuery;
          console.log("WorkspaceData: ", data);
          if (error) {
            console.error("Error fetching workspaces:", error);
            return;
          }
  
          setWorkspaces(data || []);

          if (job_title === "Admin") {
            const fetchPendingRequests = async () => {
              try {
                const { data: requests, error } = await supabase
                  .from("request_join")
                  .select("*, manager:manager_id(name), organization:workspace_id(name)")
                  .eq("admin_id", user.id)
                  .eq("status", "pending");
          
                if (error) {
                  console.error("Error fetching pending requests:", error);
                  return;
                }
          
                setPendingRequests(requests || []);
              } catch (error) {
                console.error("Error in fetchPendingRequests:", error);
              }
            };
          
            fetchPendingRequests();
          }
          
        } catch (error) {
          console.error("Error in fetchWorkspaces:", error);
        }
      };
  
      fetchWorkspaces();
    }
  }, [user]);
  
  const handleJoinRequest = async (request: any, action: "accepted" | "rejected") => {
    try {
      // 1. Update status in request_join
      const { error: updateError } = await supabase
        .from("request_join")
        .update({ status: action })
        .eq("id", request.id);
  
      if (updateError) {
        console.error("Error updating request_join status:", updateError);
        return;
      }
  
      if (action === "accepted") {
        // 2. Add workspace_id to manager's profile
        const { data: managerProfile, error: profileError } = await supabase
          .from("profiles")
          .select("workspace_ids")
          .eq("user_id", request.manager_id)
          .single();
  
        if (profileError || !managerProfile) {
          console.error("Error fetching manager profile:", profileError);
          return;
        }
  
        const updatedWorkspaceIds = Array.isArray(managerProfile.workspace_ids)
          ? [...new Set([...managerProfile.workspace_ids, request.workspace_id])]
          : [request.workspace_id];
  
        const { error: updateProfileError } = await supabase
          .from("profiles")
          .update({ workspace_ids: updatedWorkspaceIds })
          .eq("user_id", request.manager_id);
  
        if (updateProfileError) {
          console.error("Error updating manager's profile:", updateProfileError);
          return;
        }
      }
  
      // Refresh pending requests
      setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));
    } catch (error) {
      console.error("Error handling join request:", error);
    }
  };
  

  const handleRequestToJoin = async (workspace: {
    id: string;
    organization_id: string;
    created_by: string;
  }) => {
    if (!user || !workspace) return;
  
    const { id: manager_id } = user;
    const { id: workspace_id, organization_id, created_by } = workspace;
  
    try {
      const { data: existingRequest, error: fetchError } = await supabase
        .from("request_join")
        .select("*")
        .eq("workspace_id", workspace_id)
        .eq("manager_id", manager_id)
        .single();
  
      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error checking request:", fetchError.message);
        return;
      }
  
      if (existingRequest) {
        // Step 2: Update existing request
        const { error: updateError } = await supabase
          .from("request_join")
          .update({ status: "pending", created_at: new Date().toISOString() })
          .eq("id", existingRequest.id);
  
        if (updateError) {
          console.error("Error updating request:", updateError.message);
          return;
        }
  
        alert("Request updated to pending.");
      } else {
        const { error: insertError } = await supabase.from("request_join").insert([
          {
            organization_id,
            workspace_id,
            admin_id: created_by,
            manager_id,
            status: "pending",
          },
        ]);
  
        if (insertError) {
          console.error("Error inserting request:", insertError.message);
          return;
        }
  
        alert("Request to join sent successfully.");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  };
  
  const sendRequest = async () => {

    await handleRequestToJoin(reqWorkspace);

  };
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
            setWorkspaces(completedWorkspaces);
            console.log("Fetched workspaces:", completedWorkspaces);
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
          <Sidebar 
            organization={organization}
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
          />

      {/* Main content */}
      <div className="flex-1 overflow-auto bg-[url('/background-pattern.svg')]">
        <main className="p-8">
        {role === "Admin" && pendingRequests.map((req) => (
          <div key={req.id} className="p-4 mb-2 rounded border shadow">
            <p>
              <strong>{req.manager?.name}</strong> wants to join <strong>{req.organization?.name}</strong>
            </p>
            <button onClick={() => handleJoinRequest(req, "accepted")} className="mr-2 bg-green-500 text-white px-3 py-1 rounded">
              Accept
            </button>
            <button onClick={() => handleJoinRequest(req, "rejected")} className="bg-red-500 text-white px-3 py-1 rounded">
              Reject
            </button>
          </div>
        ))}
        {showRequestDialog && (
          <ConfirmDialog
            logo={info}
            title={"Send Request?"}
            subtitle={"Send request to join workspace?"}
            primaryButtonText={"Send"}
            secondaryButtonText={"Not Now"}
            onPrimaryClick={() => {
              sendRequest();     
              setShowRequestDialog(false);
            }}
            onSecondaryClick={() =>{
              setShowRequestDialog(false);
            }}
            onClose={() =>{
              setShowRequestDialog(false);
            }}
          ></ConfirmDialog>
        )}

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
                {(role === "Admin" || role === "Manager") && (
                  <Button 
                    className="bg-[#2c6e49] hover:bg-[#245a3a] text-white"
                    onClick={handleCreateWorkspace}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Create a workspace
                  </Button>
                )}
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
                {(role === "Admin" || role === "Manager") && (
                  <Button 
                    className="bg-[#2c6e49] hover:bg-[#245a3a] text-white"
                    onClick={handleCreateWorkspace}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Create a workspace
                  </Button>
                )}

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
                          {workspace.profiles?.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <div className="font-medium">{workspace.profiles?.name}</div>
                          <div className="text-xs text-gray-500">Owner</div>
                        </div>
                      </div>
                      <div className="col-span-1 px-2">
                        <div className="flex -space-x-2">
                          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-medium border-2 border-white z-10">
                            {workspace.profiles?.name?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium border-2 border-white z-0">
                            A
                          </div>
                        </div>
                      </div>
                      <div className="col-span-1 px-2 text-right pr-6">
                        {role === 'Manager' ? (
                          managerWorkspaces.includes(workspace.id) ? (
                            <Button
                              variant="outline"
                              className="text-[#2c6e49] border-[#2c6e49] hover:bg-[#f0f9f6]"
                              onClick={() => {
                                // Navigate to workspace
                              }}
                            >
                              View
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              className="text-gray-600 border-gray-400 hover:bg-gray-100"
                              onClick={() => {
                                setReqWorkspace(workspace);
                                setShowRequestDialog(true);
                              }}
                            >
                              Request to Join
                            </Button>
                          )
                        ) : (
                          <Button
                            variant="outline"
                            className="text-[#2c6e49] border-[#2c6e49] hover:bg-[#f0f9f6]"
                            onClick={() => {
                              // Navigate to workspace
                            }}
                          >
                            View
                          </Button>
                        )}
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
