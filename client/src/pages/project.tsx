import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/dashboard/sidebar";
import { Plus, BarChart2 } from "lucide-react";

export default function ProjectPage() {
  const [, params] = useRoute("/project/:workspaceId");
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [organization, setOrganization] = useState({ name: "", id: "" });
  const [activeMenu, setActiveMenu] = useState("dashboard");

  useEffect(() => {
    const fetchWorkspaceDetails = async () => {
      if (!params?.workspaceId || !user) return;

      try {
        setLoading(true);
        // Fetch workspace details
        const { data: workspaceData, error: workspaceError } = await supabase
          .from("workspaces")
          .select("*, profiles(name)")
          .eq("id", params.workspaceId)
          .single();

        if (workspaceError) {
          console.error("Error fetching workspace:", workspaceError);
          return;
        }

        setWorkspace(workspaceData);

        // Fetch organization details
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", workspaceData.organization_id)
          .single();

        if (orgError) {
          console.error("Error fetching organization:", orgError);
        } else if (orgData) {
          setOrganization({
            id: orgData.id,
            name: orgData.name,
          });
        }

        // Fetch projects (for future implementation)
        // For now, we'll just have an empty array
        setProjects([]);
      } catch (error) {
        console.error("Error in fetchWorkspaceDetails:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaceDetails();
  }, [params?.workspaceId, user]);

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar
          organization={organization}
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#2c6e49]"></div>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex min-h-screen">
        <Sidebar
          organization={organization}
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
        />
        <div className="flex-1 p-8">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center border border-[#eaecee]">
            <h1 className="text-xl font-medium text-gray-800 mb-2">Workspace not found</h1>
            <p className="text-gray-600 mb-4">
              The workspace you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button
              className="bg-[#2c6e49] hover:bg-[#245a3a] text-white"
              onClick={() => setLocation("/")}
            >
              Go back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        organization={organization}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
      />

      <div className="flex-1 overflow-auto bg-[url('/background-pattern.svg')]">
        <main className="p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-medium text-gray-800">
                Driving Success at {workspace.name}
              </h1>
              <div className="flex items-center space-x-1">
                <div className="flex -space-x-2 mr-2">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-medium border-2 border-white z-10">
                    {workspace.profiles?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium border-2 border-white z-0">
                    A
                  </div>
                </div>
                <Button variant="outline" className="border-gray-300">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 15 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="mr-2"
                  >
                    <path
                      d="M4.5 3C4.22386 3 4 3.22386 4 3.5C4 3.77614 4.22386 4 4.5 4H10.5C10.7761 4 11 3.77614 11 3.5C11 3.22386 10.7761 3 10.5 3H4.5ZM3 7.5C3 7.22386 3.22386 7 3.5 7H11.5C11.7761 7 12 7.22386 12 7.5C12 7.77614 11.7761 8 11.5 8H3.5C3.22386 8 3 7.77614 3 7.5ZM2 11.5C2 11.2239 2.22386 11 2.5 11H12.5C12.7761 11 13 11.2239 13 11.5C13 11.7761 12.7761 12 12.5 12H2.5C2.22386 12 2 11.7761 2 11.5Z"
                      fill="currentColor"
                      fillRule="evenodd"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                </Button>
              </div>
            </div>

            {/* Projects Section */}
            <div className="bg-white rounded-lg shadow-sm border border-[#eaecee] mb-6">
              <div className="p-6 border-b border-[#eaecee]">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-medium text-gray-800">Projects</h2>
                  <Button className="bg-[#2c6e49] hover:bg-[#245a3a] text-white">
                    <Plus className="h-4 w-4 mr-2" /> Create a project
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {projects.length} projects in this workspace
                </p>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="all">
                <div className="px-6 border-b border-[#eaecee]">
                  <TabsList className="mt-1">
                    <TabsTrigger value="all" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#2c6e49] data-[state=active]:shadow-none">
                      All Projects
                    </TabsTrigger>
                    <TabsTrigger value="overdue" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#2c6e49] data-[state=active]:shadow-none">
                      Overdue
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#2c6e49] data-[state=active]:shadow-none">
                      Completed
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="all" className="p-6 flex flex-col items-center justify-center min-h-[300px]">
                  {projects.length === 0 && (
                    <div className="text-center max-w-md">
                      <div className="rounded-full bg-gray-100 p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <BarChart2 className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-800 mb-2">Create a project to start tracking your projects</h3>
                      <p className="text-gray-500 mb-6">
                        Projects help you organize and track your work. Start by creating your first project.
                      </p>
                      <Button className="bg-[#2c6e49] hover:bg-[#245a3a] text-white">
                        <Plus className="h-4 w-4 mr-2" /> Create a project
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="overdue" className="p-6 text-center text-gray-500">
                  No overdue projects found.
                </TabsContent>
                
                <TabsContent value="completed" className="p-6 text-center text-gray-500">
                  No completed projects found.
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}