import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export function OrganizationList() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Extract domain from user's email
  const getDomain = () => {
    if (!user?.email) return "your organization";
    return user.email.split("@")[1];
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[url('/bg.png')] bg-cover">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Qwenzy</h1>
          <p className="text-sm text-gray-600 leading-6">
            We detected your organization domain as {getDomain()}
          </p>
        </div>

        <Button
          onClick={() => setLocation("/organization-setup")}
          className="w-full h-11 bg-[#407c87] hover:bg-[#386d77] text-white font-medium"
        >
          Create an organization
        </Button>

        <div className="text-center space-y-1">
          <p className="text-sm text-gray-500">Not seeing your organization?</p>
          <p className="text-sm text-gray-500">Try using a different email address</p>
        </div>
      </Card>
    </div>
  );
}