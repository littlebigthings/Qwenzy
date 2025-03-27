import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BackgroundPattern } from "@/components/background-pattern";

// Sample organization data for UI demonstration
const sampleOrganizations = [
  { id: "1", name: "Lil Big Things", logo_url: null, members_count: 3 },
  { id: "2", name: "Acme", logo_url: null, members_count: 2 },
];

export function OrganizationSelection() {
  const [, setLocation] = useLocation();
  const [domain] = useState("company.com");

  const handleCreateOrganization = () => {
    setLocation("/organization-setup");
  };

  const handleSelectOrganization = (orgId: string) => {
    // Set selected organization and navigate to the dashboard
    setLocation("/"); 
  };

  return (
    <div className="min-h-screen flex flex-col">
      <BackgroundPattern />
      
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-[#407c87]">Qwenzy</h1>
          </div>
          
          <Card className="shadow-md">
            <CardContent className="p-6 space-y-4">
              <div className="bg-slate-50 rounded p-4">
                <p className="text-sm text-slate-600">
                  We detected your organization domain as <span className="font-medium">{domain}</span>.
                </p>
                <Button 
                  variant="default" 
                  className="w-full mt-2 bg-[#407c87] hover:bg-[#386d77]"
                  onClick={handleCreateOrganization}
                >
                  Create an organization
                </Button>
              </div>
              
              <div className="flex items-center my-4">
                <Separator className="flex-1" />
                <span className="px-2 text-xs text-slate-500">or</span>
                <Separator className="flex-1" />
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Is your team already on Qwenzy?</p>
                <div className="space-y-2">
                  {sampleOrganizations.map((org) => (
                    <button
                      key={org.id}
                      className="w-full flex items-center justify-between p-2 hover:bg-slate-50 rounded transition-colors"
                      onClick={() => handleSelectOrganization(org.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {org.logo_url ? (
                            <AvatarImage src={org.logo_url} alt={org.name} />
                          ) : (
                            <AvatarFallback className="bg-[#407c87] text-white">
                              {org.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="text-left">
                          <p className="font-medium">{org.name}</p>
                          <p className="text-xs text-slate-500">
                            {org.members_count} {org.members_count === 1 ? 'member' : 'members'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-xs text-slate-500">
                  Not seeing your organization?
                  <br />
                  <button 
                    className="text-[#407c87] hover:underline"
                    onClick={() => window.location.reload()}
                  >
                    Try using a different email address
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
