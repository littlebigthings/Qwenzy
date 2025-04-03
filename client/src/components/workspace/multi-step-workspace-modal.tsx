import { useState } from "react";
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
        const filename = `workspace-${Date.now()}.${logoFile.name.split('.').pop()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('workspace')
          .upload(filename, logoFile);

        if (uploadError) {
          throw new Error(`Error uploading logo: ${uploadError.message}`);
        }

        const { data } = supabase.storage
          .from('workspace')
          .getPublicUrl(filename);

        logoUrl = data.publicUrl;
      }

      // Get organization ID
      const { data: orgMemberData, error: orgError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (orgError) {
        throw new Error(`Error getting organization: ${orgError.message}`);
      }

      // Create workspace
      const { data, error } = await supabase
        .from('workspaces')
        .insert({
          name: workspaceName.trim(),
          organization_id: orgMemberData.organization_id,
          created_by: user.id,
          logo_url: logoUrl,
          completed: true,
          updated_at: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Workspace created successfully",
      });

      resetForm();
      onComplete(data.id);
    } catch (error: any) {
      console.error("Error creating workspace:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to create workspace: ${error.message}`,
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
        />
      )}
    </Modal>
  );
}
