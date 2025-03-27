import { useState, useEffect } from 'react';
import { getInviterInfo } from '@/lib/invitation-handler';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BackgroundPattern } from '@/components/background-pattern';
import { useToast } from '@/hooks/use-toast';

export default function TestInvitation() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string>('c937809d-2b4b-49bb-a38b-b78aca1dae41');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);

  const testInviterInfo = async () => {
    try {
      setLoading(true);
      console.log("Testing getInviterInfo with userId:", userId);
      const inviterInfo = await getInviterInfo(userId);
      console.log("Result:", inviterInfo);
      setResult(inviterInfo);
      
      toast({
        title: inviterInfo.success ? "Success" : "Error",
        description: inviterInfo.success 
          ? `Email found: ${inviterInfo.email || "No email found"}` 
          : `Error: ${inviterInfo.error}`,
        variant: inviterInfo.success ? "default" : "destructive"
      });
    } catch (error) {
      console.error("Test failed:", error);
      toast({
        title: "Error",
        description: "Test failed. See console for details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#f8fafc]">
      <BackgroundPattern />
      
      <Card className="relative z-10 w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-900">Test Invitation Handler</h2>
          <p className="text-base text-gray-600 mt-2">
            Test the getInviterInfo function with different user IDs
          </p>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="h-12 px-4 rounded-md border-gray-200"
            />
          </div>
          
          <Button
            onClick={testInviterInfo}
            disabled={loading}
            className="w-full h-12 bg-[#407c87] hover:bg-[#386d77] text-white font-medium rounded-md"
          >
            {loading ? "Testing..." : "Test getInviterInfo"}
          </Button>
          
          {result && (
            <div className="mt-6 p-4 rounded-md bg-gray-100">
              <h3 className="font-medium mb-2">Result:</h3>
              <pre className="text-sm overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
