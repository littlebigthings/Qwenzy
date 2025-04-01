import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ArrowRight, Info } from "lucide-react"
import { WorkspaceCreationForm } from "./workspace-creation-form"

interface WorkspaceCompletionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

export function WorkspaceCompletionDialog({
  open,
  onOpenChange,
  onComplete
}: WorkspaceCompletionDialogProps) {
  const [showDetailedForm, setShowDetailedForm] = useState(false)

  const handleContinue = () => {
    setShowDetailedForm(true)
  }

  const handleFormComplete = () => {
    setShowDetailedForm(false)
    onComplete()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!showDetailedForm ? (
        <DialogContent className="max-w-md rounded-lg p-6 border-0 shadow-lg">
          <div className="flex flex-col items-start space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#E9F1EE] rounded-md flex items-center justify-center">
                <Info className="h-6 w-6 text-[#2c6e49]" />
              </div>
              <h2 className="text-2xl font-medium text-gray-800">Complete creating a workspace</h2>
            </div>
            
            <p className="text-gray-600 text-lg pl-14">
              Add team members, projects & tasks and much more to your workspace
            </p>

            <div className="flex w-full justify-start pt-2 pl-14 space-x-4">
              <Button 
                onClick={handleContinue}
                className="bg-[#2c6e49] hover:bg-[#245a3a] text-white px-6 py-6 text-lg h-auto"
              >
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-500 border-0 px-6 py-6 text-lg h-auto"
              >
                Not now
              </Button>
            </div>
          </div>
        </DialogContent>
      ) : (
        <WorkspaceCreationForm onComplete={handleFormComplete} />
      )}
    </Dialog>
  )
}
