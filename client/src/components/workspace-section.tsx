import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Briefcase, ArrowLeft, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const workspaceFormSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Workspace name must be at least 2 characters" })
    .max(50, { message: "Workspace name must be less than 50 characters" }),
});

type WorkspaceSectionProps = {
  user: any;
  organization: any;
  completedSteps: string[];
  setCompletedSteps: (steps: string[]) => void;
  saveProgress: (step: string, completed: string[]) => Promise<void>;
  setCurrentStep: (step: string) => void;
  moveToNextStep: () => void;
};

export function WorkspaceSection({
  user,
  organization,
  completedSteps,
  setCompletedSteps,
  saveProgress,
  setCurrentStep,
  moveToNextStep,
}: WorkspaceSectionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof workspaceFormSchema>>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof workspaceFormSchema>) => {
    setIsSubmitting(true);
    try {
      // Create the workspace
      const workspaceData = {
        name: data.name,
        organizationId: parseInt(organization.id, 10),
        createdBy: parseInt(user.id, 10),
      };
      console.log("Creating workspace with data:", workspaceData);
      
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(workspaceData),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("Workspace created successfully:", result);
      } else {
        const errorData = await response.text();
        console.error("Error response from server:", errorData);
      }

      if (!response.ok) {
        throw new Error("Failed to create workspace");
      }

      // Update completed steps
      const newCompleted = [...completedSteps, "workspace"];
      setCompletedSteps(newCompleted);
      await saveProgress("completed", newCompleted);

      toast({
        title: "Workspace created!",
        description: `Your workspace "${data.name}" has been created.`,
      });

      // Move to completed state
      moveToNextStep();
    } catch (error) {
      console.error("Error creating workspace:", error);
      toast({
        title: "Error",
        description: "Failed to create workspace. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      // Mark this step as completed even though we're skipping
      const newCompleted = [...completedSteps, "workspace"];
      setCompletedSteps(newCompleted);
      await saveProgress("completed", newCompleted);
      
      toast({
        title: "Setup completed",
        description: "You can create workspaces later from the dashboard.",
      });
      
      // Move to completed state
      moveToNextStep();
    } catch (error) {
      console.error("Error skipping workspace:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setCurrentStep("invite");
  };

  return (
    <div className="workspace-section w-full max-w-[600px] space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight text-gray-700">Create Workspace</h2>
        <p className="text-muted-foreground text-gray-500">
          Let us know what your team is working on right now
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-600 font-medium">Workspace name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Example: Autumn Campaign" 
                    className="h-12 text-gray-700 border-gray-300 rounded-md" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            className="w-full h-12 bg-[#4b6858] hover:bg-[#3d5446] text-white font-medium rounded-md mt-6" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Continue"}
          </Button>
        </form>
      </Form>

      <div className="flex justify-between mt-6 pt-4">
        <Button 
          variant="ghost" 
          onClick={handleBack} 
          disabled={isSubmitting}
          className="text-gray-500 hover:text-gray-700 flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>

        <Button 
          variant="ghost" 
          onClick={handleSkip} 
          disabled={isSubmitting}
          className="text-gray-500 hover:text-gray-700 flex items-center"
        >
          Skip this step <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
