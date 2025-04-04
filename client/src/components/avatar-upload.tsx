import { useState, useRef } from "react";
import { Camera, Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface AvatarUploadProps {
  setFile: (file: File) => void;
  previewUrl?: string | null;
  className?: string;
}

export default function AvatarUpload({ 
  setFile, 
  previewUrl, 
  className = "w-24 h-24" 
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(previewUrl || null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 800KB)
    if (file.size > 800 * 1024) {
      setError("File size must be less than 800KB");
      return;
    }

    // Validate file type (jpg, png, gif)
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError("Only JPG, PNG, and GIF files are allowed");
      return;
    }

    setError(null);
    
    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    
    // Pass file to parent
    setFile(file);
    
    // Close dialog
    setIsDialogOpen(false);
  };

  const handleButtonClick = () => {
    setIsDialogOpen(true);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    toast({
      title: "Camera unavailable",
      description: "This feature is not available in the browser.",
      variant: "destructive",
    });
  };

  return (
    <>
      <div
        className={`relative group cursor-pointer ${className}`}
        onClick={handleButtonClick}
      >
        <Avatar className={`${className} border border-gray-200`}>
          {preview ? (
            <AvatarImage src={preview} alt="Avatar" />
          ) : (
            <AvatarFallback className="bg-gray-100 text-gray-400">
              <Upload className="w-1/3 h-1/3" />
            </AvatarFallback>
          )}
        </Avatar>
        <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">Upload a photo</span>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload a photo</DialogTitle>
            <DialogDescription>
              Upload a photo to use as your avatar. JPG, PNG or GIF, max 800KB.
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-md">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={handleUploadClick}
              className="flex flex-col items-center justify-center h-32 gap-2"
            >
              <Upload className="w-8 h-8" />
              <span>Upload a file</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleCameraClick}
              className="flex flex-col items-center justify-center h-32 gap-2"
            >
              <Camera className="w-8 h-8" />
              <span>Use camera</span>
            </Button>
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/jpeg,image/png,image/gif"
            onChange={handleFileChange}
          />
          
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
