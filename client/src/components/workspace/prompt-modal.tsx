import { Button } from "@/components/ui/button"
import Modal from "@/components/ui/modal"

interface WorkspacePromptModalProps {
  isOpen: boolean
  onClose: () => void
  onContinue: () => void
}

export function WorkspacePromptModal({ isOpen, onClose, onContinue }: WorkspacePromptModalProps) {
  return (
    <Modal
      title="Complete creating a workspace"
      onClose={onClose}
      isOpen={isOpen}
    >
      <div className="space-y-6">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-[#edf2f0] rounded-md flex items-center justify-center">
            <div className="w-6 h-6 text-[#579189] flex items-center justify-center">
              i
            </div>
          </div>
          <p className="text-gray-600 text-lg">
            Add team members, projects & tasks and much more to your workspace
          </p>
        </div>
        
        <div className="flex space-x-4 mt-6">
          <Button 
            className="flex-1 bg-[#2c6e49] hover:bg-[#245a3a] h-12"
            onClick={onContinue}
          >
            Continue
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 border-gray-200 text-gray-500 h-12"
            onClick={onClose}
          >
            Not now
          </Button>
        </div>
      </div>
    </Modal>
  )
}