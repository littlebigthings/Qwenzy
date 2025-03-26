import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ChevronLeft, ChevronRight, X, Link } from "lucide-react";
import { sendInvitationEmail } from "@/lib/invitation";

type InviteSectionProps = {
  user: any;
  organization: any;
  completedSteps: string[];
  setCompletedSteps: (steps: string[]) => void;
  saveProgress: (step: string, completed: string[]) => Promise<void>;
  setCurrentStep: (step: string) => void;
  moveToNextStep: () => void;
};

export function InviteSection({
  user,
  organization,
  completedSteps,
  setCompletedSteps,
  saveProgress,
  setCurrentStep,
  moveToNextStep
}: InviteSectionProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [currentInviteInput, setCurrentInviteInput] = useState<string>("");
  const [allowAutoJoin, setAllowAutoJoin] = useState<boolean>(true);

  const handleInviteSubmit = async () => {
    try {
      setLoading(true);
      
      // Send invites if there are any
      if (inviteEmails.length > 0 && user && organization) {
        // Use sendInvitationEmail function from invitation.ts
        let successCount = 0;
        
        for (const email of inviteEmails) {
          const result = await sendInvitationEmail(
            email,
            organization.name,
            user.user_metadata?.full_name || "A team member",
            user.email || "",
            organization.id
          );
          
          if (result.success) {
            successCount++;
          } else {
            console.error(`Failed to send invitation to ${email}:`, result.error);
          }
        }
        
        toast({
          title: "Success",
          description: `${successCount} invitation${successCount === 1 ? "" : "s"} sent`
        });
      }
      
      // Mark step as completed
      const newCompletedSteps = [...completedSteps, "invite"];
      setCompletedSteps(newCompletedSteps);
      await saveProgress("workspace", newCompletedSteps);
      moveToNextStep();
    } catch (error: any) {
      console.error("Error sending invitations:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send invitations"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Invite your team to your organization</h2>
        <p className="text-gray-500">
          Add colleagues by email. We work best with your teammates
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Invite People</label>
          <div className="mt-1 p-2 border rounded-md flex flex-wrap gap-2 min-h-[120px]">
            {inviteEmails.map((email, index) => (
              <div key={index} className="bg-gray-100 rounded-md py-1 px-2 flex items-center gap-1">
                <span className="text-sm">{email}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5 rounded-full p-0"
                  onClick={() => {
                    const newEmails = [...inviteEmails];
                    newEmails.splice(index, 1);
                    setInviteEmails(newEmails);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <input
              type="text"
              className="flex-grow bg-transparent border-none outline-none placeholder:text-gray-400 text-sm"
              placeholder="Type or paste in one or multiple emails separated by commas, spaces, or line breaks."
              value={currentInviteInput}
              onChange={(e) => setCurrentInviteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
                  e.preventDefault();
                  const value = currentInviteInput.trim();
                  if (value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    if (!inviteEmails.includes(value)) {
                      setInviteEmails([...inviteEmails, value]);
                    }
                    setCurrentInviteInput('');
                  }
                } else if (e.key === 'Backspace' && !currentInviteInput && inviteEmails.length > 0) {
                  // Remove the last email if input is empty and backspace is pressed
                  const newEmails = [...inviteEmails];
                  newEmails.pop();
                  setInviteEmails(newEmails);
                }
              }}
              onBlur={() => {
                // Add email on blur if it's valid
                const value = currentInviteInput.trim();
                if (value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                  if (!inviteEmails.includes(value)) {
                    setInviteEmails([...inviteEmails, value]);
                  }
                  setCurrentInviteInput('');
                }
              }}
              onPaste={(e) => {
                // Handle pasting multiple emails
                e.preventDefault();
                const pastedText = e.clipboardData.getData('text');
                const emailsArray = pastedText
                  .split(/[\s,;]+/)
                  .map(email => email.trim())
                  .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
                
                if (emailsArray.length > 0) {
                  const newEmails = [...inviteEmails];
                  emailsArray.forEach(email => {
                    if (!newEmails.includes(email)) {
                      newEmails.push(email);
                    }
                  });
                  setInviteEmails(newEmails);
                }
              }}
            />
          </div>
        </div>
        
        <div className="flex items-center">
          <Link className="h-5 w-5 text-gray-500 mr-2" />
          <span className="text-sm text-gray-600">Copy invitation link</span>
        </div>
        
        <div className="flex items-start gap-2">
          <Checkbox 
            id="auto-join" 
            checked={allowAutoJoin}
            onCheckedChange={(checked) => setAllowAutoJoin(checked as boolean)}
            className="mt-1"
          />
          <label htmlFor="auto-join" className="text-sm">
            Anyone with a "@company.com" email can join your workspace
          </label>
        </div>
      </div>
      
      <div className="flex justify-between mt-6">
        <Button 
          variant="ghost"
          onClick={() => {
            setCurrentStep("profile");
          }}
          className="text-gray-600 flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Go Back
        </Button>
        
        <Button 
          variant="ghost"
          onClick={() => {
            const newCompletedSteps = [...completedSteps, "invite"];
            setCompletedSteps(newCompletedSteps);
            saveProgress("workspace", newCompletedSteps).then(()=>moveToNextStep());
          }}
          className="text-gray-600"
        >
          Skip this step <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      
      <Button
        onClick={handleInviteSubmit}
        className="w-full bg-[#407c87] hover:bg-[#386d77] mt-4"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending invites...
          </>
        ) : (
          "Continue"
        )}
      </Button>
    </div>
  );
}