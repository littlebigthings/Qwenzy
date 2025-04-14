import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2,ChevronDown, BarChartIcon, Upload, Plus,MoreVertical } from "lucide-react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useEffect, useState, useRef } from "react"
import { Link } from "wouter"
import { supabase } from "@/lib/supabase"
import Modal from "@/components/ui/modal"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { MultiStepWorkspaceModal } from "@/components/workspace/multi-step-workspace-modal"
import Sidebar from "@/components/dashboard/sidebar"
import { WorkspaceFormStep2 } from "@/components/workspace/workspace-form-step2";
import ConfirmDialog from "@/components/ui/confirm-dialog"
import info from "@/assets/info-circle.svg";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export default function Home() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [organization, setOrganization] = useState({ name: "", id: "" })
  const [userName, setUserName] = useState("")
  const [activeMenu, setActiveMenu] = useState("dashboard")
  const [showWorkspacePrompt, setShowWorkspacePrompt] = useState(false)
  const [workspaceName, setWorkspaceName] = useState("")
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef(null)
  const [workspaces, setWorkspaces] = useState([])
  const [hasIncompleteWorkspace, setHasIncompleteWorkspace] = useState(false)
  const [incompleteWorkspaceName, setIncompleteWorkspaceName] = useState("")
  const [role,setRole] = useState<string | null>(null);
  const [managerWorkspaces, setManagerWorkspaces] = useState<string[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [showRequestDialog,setShowRequestDialog] = useState<boolean>(false);
  const [emailRoles, setEmailRoles] = useState<{ [email: string]: string }>({});
  const [editWorkspaceId,setEditWorkspaceId] = useState<string>("");
  const [showAddUser,setShowAddUser] = useState<boolean>(false);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);
  const [emails, setEmails] = useState<string[]>([]);
  const [reqWorkspace, setReqWorkspace] = useState<{
    id: string;
    organization_id: string;
    created_by: string;
  }>();
  const [selectedWorkspace, setSelectedWorkspace] = useState<{
    team_members: []
    name: string
  }>();
  const [teamMembers, setTeamMembers] = useState<{ email: string; role: string,id: string }[]>([]);
  const [showEditModal,setShowEditModal] = useState<boolean>(false);
  const [isEditingName,setIsEditingName] = useState<boolean>(false);

  useEffect(() => {
    console.log(isEditingName);
  },[isEditingName])
  
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
          setUserOrgId(profile.organization_id);
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
  const getProfileByUserId = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("email, job_title")
      .eq("user_id", userId)
      .single();
  
    if (error) {
      console.error("Failed to fetch profile:", error.message);
      throw new Error("Profile not found");
    }
  
    return data;
  }

  useEffect(() => {
    const fetchMembers = async () => {
      if (!selectedWorkspace) return;
  
      const teamMembers = selectedWorkspace.team_members || [];
  
      const members = await Promise.all(
        teamMembers.map(async (id) => {
          try {
            // Try fetching from profiles first
            const { data: profile } = await supabase
              .from("profiles")
              .select("email, job_title,user_id")
              .eq("user_id", id)
              .single();
  
            if (profile) {
              return {
                email: profile.email,
                role: profile.job_title,
                id: profile.user_id
              };
            }
  
            const { data: invitation } = await supabase
              .from("invitations")
              .select("email, role,id")
              .eq("id", id)
              .single();
  
            if (invitation) {
              return {
                email: invitation.email,
                role: invitation.role,
                id: invitation.id
              };
            }
  
            return null;
          } catch (error) {
            console.error("Error fetching member info:", error);
            return null;
          }
        })
      );
  
      const filteredMembers = members.filter((m) => m !== null) as {
        email: string;
        role: string;
        id: string;
      }[];
  
      setTeamMembers(filteredMembers);
    };
  
    fetchMembers();
  }, [selectedWorkspace]);
  
  
  const handleRoleChange = (email: string, role: string) => {
    setEmailRoles(prev => ({ ...prev, [email]: role }));
  };
  const populateEmailRolesFromTeam = async (teamMembers: string[]) => {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, email, job_title")
      .in("user_id", teamMembers);
  
    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return;
    }
  
    const profileUserIds = (profilesData || []).map(p => p.user_id);
  
    for (const profile of profilesData || []) {
      if (profile.email && profile.job_title) {
        handleRoleChange(profile.email, profile.job_title);
      }
    }
  
    const remainingIds = teamMembers.filter(id => !profileUserIds.includes(id));
  
    if (remainingIds.length > 0) {
      const { data: invitationsData, error: invitationsError } = await supabase
        .from("invitations")
        .select("id, email, role")
        .in("id", remainingIds);
  
      if (invitationsError) {
        console.error("Error fetching invitations:", invitationsError);
        return;
      }
  
      for (const invitation of invitationsData || []) {
        if (invitation.email && invitation.role) {
          handleRoleChange(invitation.email, invitation.role);
        }
      }
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
  const handleLogoChange = async (file: File) => {
    try {
      if (!file) return null;

      // Check file size (800KB max)
      if (file.size > 800 * 1024) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "File size must be less than 800K",
        });
        return null;
      }

      // Check file type
      if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "File must be JPG, PNG or GIF",
        });
        return null;
      }

      // Create file preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      setLogoFile(file);
      return file;
    } catch (error: any) {
      console.error("Logo upload error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error preparing logo",
      });
      return null;
    }
  };

  // Reset logo
  const resetLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const uploadToSupabase = async (file: File, bucketName: string) => {
    try {
      if (!file || !user?.id) return null;

      // Check file size (800KB max)
      if (file.size > 800 * 1024) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "File size must be less than 800K",
        });
        return null;
      }

      // Check file type
      if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "File must be JPG, PNG or GIF",
        });
        return null;
      }

      // Use user-specific folder structure for RLS compliance
      // Use user-specific folder structure for RLS compliance
      // Ensure UUID is properly formatted for storage path (no need for toString as it is already a string)
      const userId = user.id;
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`; // Include user ID in path


      // Upload to the specified bucket
      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true, // Change to upsert to overwrite if exists
          contentType: file.type,
        });

      if (uploadError) {
        console.error("Supabase storage error:", uploadError);
        if (uploadError.message.includes("policy")) {
          throw new Error("Storage permission denied. Please try again.");
        }
        throw new Error("Failed to upload file");
      }

      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucketName).getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error("Upload to Supabase error:", error);
      toast({
        variant: "destructive",
        title: "Upload Error",
        description: error.message || "Failed to upload file to storage",
      });
      return null;
    }
  };

  const handleComplete = async (workspaceId: string) => {

    const teamMemberIds: string[] = [];
    // setIsSubmitting(true);
  
    try {
  
  
      const { data: orgMemberData, error: orgError } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user?.id)
        .single();
  
      if (orgError) throw new Error(`Error getting organization: ${orgError.message}`);
      const organizationId = orgMemberData.organization_id;
  
  
      // Handle user roles and invitations
      for (const email of emails) {
        const role = emailRoles[email] || "Client";
  
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, workspace_ids")
          .eq("email", email)
          .single();
        console.log(profile);
        if (profile) {

          const updatedProfileWorkspaceIds = Array.from(new Set([
            ...(profile.workspace_ids || []),
            workspaceId,
          ]));
        
          console.log("updatedProfileWorkspaceIds: ",updatedProfileWorkspaceIds);
          const { data: updatedProfile, error: updateProfileError } = await supabase
          .from("profiles")
          .update({
            workspace_ids: updatedProfileWorkspaceIds,
            job_title: role,
          })
          .eq("user_id", profile.user_id)
          .select("*");
          teamMemberIds.push(profile.user_id);
          if (updateProfileError) {
            console.error("Error updating profile:", updateProfileError);
          } else {
            console.log("Profile update successful:", updatedProfile);
          }
          teamMemberIds.push(profile.user_id);
        } else {
          // If not in profiles, then check in invitations
          const { data: existingInvitation } = await supabase
            .from("invitations")
            .select("id, accepted, workspace_ids")
            .eq("email", email)
            .eq("organization_id", organizationId)
            .single();
  
          if (existingInvitation) {
            if (!existingInvitation.accepted) {

              const updatedWorkspaceIds = Array.from(new Set([
                ...(existingInvitation.workspace_ids || []),
                workspaceId,
              ]));
  
              await supabase
                .from("invitations")
                .update({
                  workspace_ids: updatedWorkspaceIds,
                  role,
                  invited_by: user?.id,
                  created_at: new Date().toISOString(),
                })
                .eq("id", existingInvitation.id);
                
              teamMemberIds.push(existingInvitation.id);
                              
              }
          } else {
            const { data: insertedInvitation, error: invitationError } = await supabase
            .from("invitations")
            .insert({
              email,
              organization_id: organizationId,
              invited_by: user?.id,
              role,
              created_at: new Date().toISOString(),
              accepted: false,
              auto_join: true,
              workspace_ids: role === "Manager" ? [] : [workspaceId],
            })
            .select("id")
            .single();
        
            if (invitationError) {
              console.error("Error inserting invitation:", invitationError);
            } else {
              teamMemberIds.push(insertedInvitation.id);
            }
          }
  
          // Create email content
          const link = "http://localhost:3000/signup";
          console.log(`
            To: ${email}
            Subject: You're invited to join "${workspaceName}" as ${role}
  
            Message:
            Hi there,
  
            You’ve been invited to join the workspace "${workspaceName}" as a ${role}.
            Please accept the invitation by clicking the link below:
  
            ${link}
  
            — Your Team
          `);
        }
      }
  
      toast({
        title: "Success",
        description: "Workspace created and invitations handled",
      });
  
      resetForm();
      // onComplete(workspaceId);
      await supabase
      .from("workspaces")
      .update({ team_members: teamMemberIds })
      .eq("id", workspaceId);
    } catch (error: any) {
      console.error("Error creating workspace or sending invitations:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to complete setup: ${error.message}`,
      });
    } finally {
      // setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    // setCurrentStep(1);
    setWorkspaceName("");
    setLogoFile(null);
    setLogoPreview(null);
  };

  const updateWorkspaceDetails = async () => {
    if (!editWorkspaceId) return;
  
    try {
      // setLoading(true);
  
      let logoUrl = logoPreview;
      if (logoFile) {
        logoUrl = await uploadToSupabase(logoFile, "workspace");
      }
  
      await supabase
        .from("workspaces")
        .update({
          name: workspaceName,
          logo_url: logoUrl,
        })
        .eq("id", editWorkspaceId);
  
      for (const member of teamMembers) {
        const newRole = emailRoles[member.email];
        if (!newRole) continue;
  
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", member.email)
          .maybeSingle();
  
        if (profile?.id) {
          await supabase
            .from("profiles")
            .update({ job_title: newRole })
            .eq("id", profile.id);
        } else {
          const { data: invitation } = await supabase
            .from("invitations")
            .select("id")
            .eq("email", member.email)
            .maybeSingle();
  
          if (invitation?.id) {
            await supabase
              .from("invitations")
              .update({ role: newRole })
              .eq("id", invitation.id);
          }
        }
      }
  
      toast({
        title: "Workspace Updated",
        description: "Your changes have been saved successfully.",
      });
  
      setShowEditModal(false);
    } catch (error) {
      console.error("Update workspace error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong while saving changes.",
      });
    } finally {
      // setLoading(false);
    }
  };
  
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

  const removeTeamMember = async (teamMemberId: string, workspaceId: string) => {
    try {
      // Try to remove from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("workspace_ids")
        .eq("user_id", teamMemberId)
        .maybeSingle();
  
      if (profile) {
        const updatedWorkspaceIds = (profile.workspace_ids || []).filter(
          (id: string) => id !== workspaceId
        );
  
        await supabase
          .from("profiles")
          .update({ workspace_ids: updatedWorkspaceIds })
          .eq("user_id", teamMemberId);
      } else {
        const { data: invitation } = await supabase
          .from("invitations")
          .select("workspace_ids")
          .eq("id", teamMemberId)
          .maybeSingle();
  
        if (invitation) {
          const updatedInvitationWorkspaceIds = (invitation.workspace_ids || []).filter(
            (id: string) => id !== workspaceId
          );
  
          await supabase
            .from("invitations")
            .update({ workspace_ids: updatedInvitationWorkspaceIds })
            .eq("id", teamMemberId);
        }
      }
  
      // Remove from workspace's team_members
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("team_members")
        .eq("id", workspaceId)
        .single();
  
      if (workspace?.team_members) {
        const updatedTeam = workspace.team_members.filter(
          (id: string) => id !== teamMemberId
        );
  
        await supabase
          .from("workspaces")
          .update({ team_members: updatedTeam })
          .eq("id", workspaceId);
      }
  
      toast({
        title: "Removed",
        description: "Team member removed successfully.",
      });
    } catch (error) {
      console.error("Error removing team member:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove team member.",
      });
    }
  };
  

  const handleCreateWorkspace = () => {
    if (hasIncompleteWorkspace) {
      setWorkspaceName(incompleteWorkspaceName)
      setShowWorkspacePrompt(true)
    } else {
      setWorkspaceName("")
      setShowWorkspaceModal(true)
    }
  }

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
            <div className="mx-auto bg-white rounded-lg shadow-sm p-8 mb-8 text-center border border-[#eaecee]">
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
          <div className="mx-auto">
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
              <div className="grid grid-cols-11 py-3 border-b text-sm text-gray-500 font-medium">
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
                    <div key={workspace.id} className="grid grid-cols-11 items-center py-4 border-b hover:bg-gray-50 transition-colors">
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
                                // Navigate to workspace project page
                                window.location.href = `/project/${workspace.id}`;
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
                              // Navigate to workspace project page
                              window.location.href = `/project/${workspace.id}`;
                            }}
                          >
                            View
                          </Button>
                        )}
                      </div>
                      <div className="col-span-1 px-2 text-right pr-6">
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <button className="p-2 rounded-full hover:bg-gray-100">
                              <MoreVertical className="h-5 w-5 text-gray-600" />
                            </button>
                          </DropdownMenu.Trigger>

                          <DropdownMenu.Content
                            side="bottom"
                            align="end"
                            className="bg-white border border-gray-200 rounded-md shadow-md p-1 w-40"
                          >
                            <DropdownMenu.Item
                              onSelect={() => {
                                setSelectedWorkspace(workspace);
                                setWorkspaceName(workspace?.name);
                                setLogoPreview(workspace?.logo_url)
                                setLogoFile(workspace?.logo_url)
                                populateEmailRolesFromTeam(workspace?.team_members)
                                setEditWorkspaceId(workspace?.id)
                                setShowEditModal(true);
                              }}                              
                              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer"
                            >
                              Edit
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              onSelect={() => console.log("Archive clicked")}
                              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer"
                            >
                              Archive
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              onSelect={() => console.log("Delete clicked")}
                              className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                            >
                              Delete
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Root>
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
          <Modal
            isOpen={showEditModal}
            title="Edit workspace"
            onClose={() => setShowEditModal(false)}
          >
            <div className="p-6">
              <p className="text-gray-500 mb-4">
                Add colleagues & clients by email and define their permissions and roles
              </p>

              {/* Workspace Name */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700">Workspace name</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className={`border rounded-md px-3 py-2 w-full text-sm text-gray-700 ${
                      isEditingName ? "bg-white" : "bg-gray-100"
                    }`}
                    disabled={!isEditingName}
                  />
                  <button onClick={() => setIsEditingName((prev) => !prev)}>
                    <Pencil className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Your workspace name has been set as initially added. You can change it by clicking the edit icon
                </p>
              </div>

              <div className="mb-6">
                <div>Your workspace logo</div>
                <div className="flex items-start gap-4 mt-2">
                  <div className="h-24 w-24 border border-dashed rounded flex items-center justify-center bg-gray-50">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-full w-full object-cover rounded"
                      />
                    ) : (
                      <Upload className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <label
                        htmlFor="logo-upload"
                        className="inline-flex items-center justify-center px-4 py-2 rounded cursor-pointer transition-colors bg-[#407c87] text-white hover:bg-[#386d77]"
                      >
                        Upload a photo
                        <input
                          id="logo-upload"
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/png,image/gif"
                          onChange={(e) => handleLogoChange(e.target.files?.[0])}
                        />
                      </label>
                      {logoPreview && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setLogoPreview(null);
                            setLogoFile(null);
                          }}
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Allowed JPG, GIF or PNG. Max size of 800K
                    </p>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="mb-6">
                <button onClick={()=> {setShowAddUser(true)}} className="w-full bg-[#7aa9a1] text-white py-2 rounded text-sm font-medium">
                  + Add people
                </button>
                <div className="mt-4 max-h-60 overflow-y-auto divide-y border rounded">
                  {teamMembers.map((member, index) => (
                    <div key={index} className="flex justify-between items-center py-2 px-3">
                      <div>
                        <div className="text-sm">{member.email}</div>
                        <div className="text-xs text-gray-500">{member.role}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <select
                            value={emailRoles[member.email] || "Client"}
                            onChange={(e) => handleRoleChange(member.email, e.target.value)}
                            className="bg-violet-100 text-violet-700 text-sm rounded px-2 py-1 appearance-none pr-6"
                          >
                            <option value="Client">Client</option>
                            {role !== "Manager" && <option value="Manager">Manager</option>}
                            <option value="User">User</option>
                            <option value="Admin">Guest User</option>
                          </select>
                          <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                        </div>

                        <Trash2 onClick={() => removeTeamMember(member.id,editWorkspaceId)} className="text-gray-400 cursor-pointer" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <Button onClick={() => {updateWorkspaceDetails()}} className="w-full bg-[#2c6e49] text-white hover:bg-[#245a3a]">
                  Save & continue
                </Button>
              </div>
            </div>
          </Modal>

          <MultiStepWorkspaceModal
            isOpen={showWorkspaceModal}
            onClose={() => setShowWorkspaceModal(false)}
            onComplete={handleWorkspaceCreated}
          />
            {showAddUser === true && (
              <Modal
              isOpen={showAddUser}
              title=""
              onClose={() => setShowAddUser(false)}>
                <WorkspaceFormStep2
                  onPrevious={()=> {setShowAddUser(false)}}
                  onComplete={() => handleComplete(editWorkspaceId)}
                  setEmailRoles={setEmailRoles}
                  emailRoles={emailRoles}
                  setEmails={setEmails}
                  emails={emails}
                  currentUserRole={role}
                  currentUserOrg={userOrgId}
                />
              </Modal>
          )}
        </main>
      </div>

    </div>
  )
}
