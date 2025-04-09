import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, X , ChevronDown} from "lucide-react";

interface WorkspaceFormStep2Props {
  onPrevious: () => void;
  onComplete: () => void;
  setEmails: React.Dispatch<React.SetStateAction<string[]>>;
  setEmailRoles: React.Dispatch<React.SetStateAction<{ [email: string]: string }>>;
  emails: string[];
  emailRoles: { [email: string]: string };
}


export function WorkspaceFormStep2({
  onPrevious,
  onComplete,
  setEmails,
  setEmailRoles,
  emails,
  emailRoles
}: WorkspaceFormStep2Props) {
  const [currentEmail, setCurrentEmail] = useState("");
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsValid(emailRegex.test(currentEmail) || currentEmail === "");
  }, [currentEmail]);

  const handleAddEmail = () => {
    if (currentEmail && isValid && !emails.includes(currentEmail)) {
      const updated = [...emails, currentEmail];
      setEmails(updated);
      setCurrentEmail("");
    }
  };
  const handleRoleChange = (email: string, role: string) => {
    setEmailRoles(prev => ({ ...prev, [email]: role }));
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
        <div className="flex flex-wrap gap-2 mt-2 items-center">
        {emails.map((email, index) => (
          <div
            key={index}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-1 bg-gray-100 text-gray-700 text-sm px-2 py-1 rounded">
              <span>{email}</span>
              <button
                type="button"
                onClick={() => removeEmail(email)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="relative">
              <select
                  value={emailRoles[email] || "Client"}
                  onChange={(e) => handleRoleChange(email, e.target.value)}
                  className="bg-violet-100 text-violet-700 text-sm rounded px-2 py-1 appearance-none pr-6"
                >
                  <option value="Client">Client</option>
                  <option value="Manager">Manager</option>
                  <option value="User">User</option>
                  <option value="Admin">Admin</option>
                </select>
              <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>
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
