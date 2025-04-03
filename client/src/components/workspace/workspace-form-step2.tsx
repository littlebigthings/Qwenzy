import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, X } from "lucide-react";

interface WorkspaceFormStep2Props {
  onPrevious: () => void;
  onComplete: () => void;
}

export function WorkspaceFormStep2({
  onPrevious,
  onComplete,
}: WorkspaceFormStep2Props) {
  const [emails, setEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsValid(emailRegex.test(currentEmail) || currentEmail === "");
  }, [currentEmail]);

  const handleAddEmail = () => {
    if (currentEmail && isValid && !emails.includes(currentEmail)) {
      setEmails([...emails, currentEmail]);
      setCurrentEmail("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter(email => email !== emailToRemove));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <Label htmlFor="invite-emails">Invite to workspace</Label>
        <div className="relative">
          <Input
            id="invite-emails"
            value={currentEmail}
            onChange={(e) => setCurrentEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type or paste in emails"
            className={`border-gray-300 focus-visible:ring-[#407c87] ${
              !isValid && currentEmail ? "border-red-500" : ""
            }`}
          />
          {!isValid && currentEmail && (
            <p className="text-xs text-red-500 mt-1">
              Please enter a valid email address
            </p>
          )}
        </div>

        {/* Email chips */}
        <div className="flex flex-wrap gap-2 mt-2">
          {emails.map((email, index) => (
            <div
              key={index}
              className="flex items-center gap-1 bg-gray-100 text-gray-700 text-sm px-2 py-1 rounded"
            >
              <span>{email}</span>
              <button
                type="button"
                onClick={() => removeEmail(email)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col space-y-3 pt-4">
        <Button
          className="bg-[#407c87] hover:bg-[#386d77] w-full h-12"
          onClick={onComplete}
        >
          Continue
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 flex items-center justify-center"
          onClick={onPrevious}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    </div>
  );
}
