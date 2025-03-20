import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";

export function OrganizationList() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[url('/bg.png')] bg-cover">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold text-gray-900">Qwenzy</h1>
          <p className="text-sm text-gray-500">
            We detected your organization domain as company.com
          </p>
        </div>

        <Button
          onClick={() => setLocation("/organization-setup")}
          className="w-full bg-[#407c87] hover:bg-[#386d77]"
        >
          Create an organization
        </Button>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            Not seeing your organization?
            <br />
            Try using a different email address
          </p>
        </div>
      </Card>
    </div>
  );
}