import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { clearStorageAndReload } from "@/lib/utils"

export default function Home() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent mb-2">
          Welcome to Qwenzy
        </h1>
        <p className="text-gray-600 mb-8">
          You are signed in as {user?.email}
        </p>
        <div className="space-y-2">
          <Button onClick={signOut} className="w-full">Sign Out</Button>
          <Button 
            onClick={clearStorageAndReload} 
            variant="outline" 
            className="w-full"
          >
            Clear Storage & Restart
          </Button>
        </div>
      </div>
    </div>
  )
}