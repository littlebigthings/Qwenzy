import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, X , ChevronDown} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface WorkspaceFormStep2Props {
  onPrevious: () => void;
  onComplete: () => void;
  setEmails: React.Dispatch<React.SetStateAction<string[]>>;
  setEmailRoles: React.Dispatch<React.SetStateAction<{ [email: string]: string }>>;
  emails: string[];
  emailRoles: { [email: string]: string };
  currentUserRole: string | null;
  currentUserOrg: string | null;
}


export function WorkspaceFormStep2({
  onPrevious,
  onComplete,
  setEmails,
  setEmailRoles,
  emails,
  emailRoles,
  currentUserRole,
  currentUserOrg
}: WorkspaceFormStep2Props) {
  const [currentEmail, setCurrentEmail] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [suggestions, setSuggestions] = useState<{ email: string; status: "sent" | "accepted" }[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsValid(emailRegex.test(currentEmail) || currentEmail === "");
  }, [currentEmail]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!currentEmail || currentEmail.length < 2 || !currentUserOrg) {
        setSuggestions([]);
        return;
      }

      setLoadingSuggestions(true);

      try {
        const [profilesRes, invitationsRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("email")
            .eq("organization_id", currentUserOrg)
            .ilike("email", `%${currentEmail}%`),

          supabase
            .from("invitations")
            .select("email, accepted")
            .eq("organization_id", currentUserOrg)
            .eq("accepted", false)
            .ilike("email", `%${currentEmail}%`)
        ]);

        const profileEmails =
          profilesRes.data?.map((p) => ({
            email: p.email,
            status: "accepted" as const
          })) || [];

        const invitationEmails =
          invitationsRes.data?.map((i) => ({
            email: i.email,
            status: "sent" as const
          })) || [];

        const combined = [...profileEmails, ...invitationEmails];
        const seen = new Set();
        const filtered = combined.filter(({ email }) => {
          const lower = email.toLowerCase();
          if (seen.has(lower) || emails.includes(lower)) return false;
          seen.add(lower);
          return true;
        });

        setSuggestions(filtered);
      } catch (err) {
        console.error("Failed to fetch suggestions", err);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    const timeout = setTimeout(fetchSuggestions, 100);
    return () => clearTimeout(timeout);
  }, [currentEmail, emails, currentUserOrg]);

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
            autoComplete="off"
            onChange={(e) => setCurrentEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type or paste in emails"
            className={`border-gray-300 focus-visible:ring-[#407c87] ${!isValid && currentEmail ? "border-red-500" : ""}`}
          />
          {!isValid && currentEmail && (
            <p className="text-xs text-red-500 mt-1">Please enter a valid email address</p>
          )}
          {suggestions.length > 0 && (
            <div className="absolute z-10 bg-white border border-gray-300 rounded mt-1 w-full max-h-60 overflow-y-auto shadow-lg">
              {suggestions.map((sugg, i) => (
                <button
                  key={i}
                  type="button"
                  className={`flex justify-between items-center w-full text-left px-3 py-2 hover:bg-gray-100 text-sm ${
                    sugg.status === "accepted" ? "bg-green-50" : ""
                  }`}
                  onClick={() => {
                    setEmails((prev) => [...prev, sugg.email]);
                    setCurrentEmail("");
                    setSuggestions([]);
                  }}
                >
                  <span>{sugg.email}</span>
                  <span className="text-xs text-gray-500">
                    {sugg.status === "accepted" ? "Invite accepted" : "Invite sent"}
                  </span>
                </button>
              ))}
            </div>
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
                  {currentUserRole !== "Manager" && <option value="Manager">Manager</option>}
                  <option value="User">User</option>
                  <option value="Admin">Guest User</option>
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
