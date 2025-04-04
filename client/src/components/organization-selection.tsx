import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BackgroundPattern } from "@/components/background-pattern";
import { useAuthContext } from "@/providers/auth-provider";
import { supabase } from "@/lib/supabase";

type Organization = {
  id: string;
  name: string;
  logo_url: string | null;
  members_count: number;
};

export function OrganizationSelection() {
  const [, navigate] = useLocation();
  const { user } = useAuthContext();
  const [domain, setDomain] = useState<string>("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user?.email) return;
    
    // Extract domain from user email
    const emailParts = user.email.split('@');
    if (emailParts.length > 1) {
      setDomain(emailParts[1]);
    }
    
    // Fetch organizations matching the user's domain
    const fetchOrganizations = async () => {
      setLoading(true);
      try {
        // In a real implementation, this would query organizations 
        // where the domain matches the user's email domain
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, logo_url, domain')
          .eq('domain', emailParts[1]);
          
        if (error) {
          console.error('Error fetching organizations:', error);
          return;
        }
        
        if (data) {
          // Transform to include members count
          // In a real implementation, we'd query the actual member count
          const orgsWithMembers = data.map(org => ({
            ...org,
            members_count: Math.floor(Math.random() * 5) + 1
          }));
          
          setOrganizations(orgsWithMembers);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrganizations();
  }, [user]);

  const handleCreateOrganization = () => {
    console.log("Navigating to organization setup");
    console.log("Current location before navigation:", window.location.pathname);
    navigate("/organization-setup");
    // Force a reload if navigation isn't working
    setTimeout(() => {
      console.log("Current location after navigation attempt:", window.location.pathname);
      if (window.location.pathname !== "/organization-setup") {
        console.log("Navigation failed, forcing redirect");
        window.location.href = "/organization-setup";
      }
    }, 100);
  };

  const handleSelectOrganization = (orgId: string) => {
    // Set selected organization and navigate to the dashboard
    navigate("/organization-setup"); 
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
      <BackgroundPattern />
      
      <div className="w-full max-w-md z-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#407c87]">Qwenzy</h1>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5">
            <div className="bg-slate-100 rounded p-4 mb-4">
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
              <p className="text-sm font-medium mb-3">Is your team already on Qwenzy?</p>
              
              {!loading && organizations.length > 0 ? (
                <div className="space-y-2">
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      className="w-full flex items-center justify-between p-3 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                      onClick={() => handleSelectOrganization(org.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 bg-[#407c87] text-white">
                          <AvatarFallback>
                            {org.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <p className="font-medium text-gray-900">{org.name}</p>
                          <p className="text-sm text-slate-500">
                            {org.members_count} {org.members_count === 1 ? 'member' : 'members'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </button>
                  ))}
                </div>
              ) : !loading ? (
                <div className="p-4 text-center text-slate-500 text-sm">
                  <p>We couldn't find any existing workspaces for the email domain <span className="font-medium">{domain}</span>.</p>
                </div>
              ) : (
                <div className="p-4 text-center text-slate-500 text-sm">
                  <p>Searching for organizations...</p>
                </div>
              )}
              
              <div className="mt-6 text-center">
                <p className="text-sm text-slate-500">
                  Not seeing your organization?
                </p>
                <p className="text-sm text-[#407c87] hover:underline cursor-pointer">
                  Try using a different email address
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
