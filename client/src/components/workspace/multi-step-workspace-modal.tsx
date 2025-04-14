import { useState, useEffect } from "react";
import Modal from "@/components/ui/modal";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { WorkspaceFormStep1 } from "./workspace-form-step1";
import { WorkspaceFormStep2 } from "./workspace-form-step2";

interface MultiStepWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (workspaceId: number) => void;
}

export function MultiStepWorkspaceModal({
  isOpen,
  onClose,
  onComplete,
}: MultiStepWorkspaceModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);
  const [emailRoles, setEmailRoles] = useState<{ [email: string]: string }>({});
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserOrg, setCurrentUserOrg] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user?.id) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("job_title, organization_id")
          .eq("user_id", user.id)
          .single();
  
        if (error) {
          console.error("Error fetching user profile:", error);
        } else {
          setCurrentUserRole(profile?.job_title || null);
          setCurrentUserOrg(profile?.organization_id || null);
        }
      }
    };
  
    fetchUserRole();
  }, [user?.id]);
  
  const resetForm = () => {
    setCurrentStep(1);
    setWorkspaceName("");
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const goToNextStep = () => {
    setCurrentStep(currentStep + 1);
  };

  const goToPreviousStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleComplete = async () => {

    const teamMemberIds: string[] = [];

    if (!workspaceName.trim() || !user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Workspace name is required",
      });
      return;
    }
  
    setIsSubmitting(true);
  
    try {
      // Upload logo if present
      let logoUrl = null;
      if (logoFile) {
        const filename = `workspace-${Date.now()}.${logoFile.name.split(".").pop()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("workspace")
          .upload(filename, logoFile);
  
        if (uploadError) throw new Error(`Error uploading logo: ${uploadError.message}`);
  
        const { data } = supabase.storage.from("workspace").getPublicUrl(filename);
        logoUrl = data.publicUrl;
      }
  
      const { data: orgMemberData, error: orgError } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();
  
      if (orgError) throw new Error(`Error getting organization: ${orgError.message}`);
      const organizationId = orgMemberData.organization_id;
  
      // Create workspace
      const { data: workspaceData, error: workspaceError } = await supabase
        .from("workspaces")
        .insert({
          name: workspaceName.trim(),
          organization_id: organizationId,
          created_by: user.id,
          logo_url: logoUrl,
          completed: true,
          updated_at: new Date().toISOString().split("T")[0],
        })
        .select()
        .single();
  
      if (workspaceError) throw workspaceError;
      const workspaceId = workspaceData.id;
  
      console.log("workspaceId: ",workspaceId);
      // Handle user roles and invitations
      for (const email of emails) {
        const role = emailRoles[email] || "Client";
  
        // First check if user exists in profiles
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
                  invited_by: user.id,
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
              invited_by: user.id,
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
      onComplete(workspaceId);
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
      setIsSubmitting(false);
    }
  };
  

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      step={currentStep}
      title={currentStep === 1 ? "Create Workspace" : "Start with your team"}
      subtitle={
        currentStep === 1
          ? "Let us know what your team is working on right now"
          : "Add colleagues & clients by email and define their permissions and roles"
      }
      maxWidth="xl"
    >
      {currentStep === 1 ? (
        <WorkspaceFormStep1
          workspaceName={workspaceName}
          setWorkspaceName={setWorkspaceName}
          logoFile={logoFile}
          setLogoFile={setLogoFile}
          logoPreview={logoPreview}
          setLogoPreview={setLogoPreview}
          onContinue={goToNextStep}
        />
      ) : (
        <WorkspaceFormStep2
          onPrevious={goToPreviousStep}
          onComplete={handleComplete}
          setEmailRoles={setEmailRoles}
          emailRoles={emailRoles}
          setEmails={setEmails}
          emails={emails}
          currentUserRole={currentUserRole}
          currentUserOrg={currentUserOrg}
        />
      )}
    </Modal>
  );
}
