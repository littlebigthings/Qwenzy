import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";

interface WorkspaceFormStep1Props {
  workspaceName: string;
  setWorkspaceName: (name: string) => void;
  logoFile: File | null;
  setLogoFile: (file: File | null) => void;
  logoPreview: string | null;
  setLogoPreview: (preview: string | null) => void;
  onContinue: () => void;
}

export function WorkspaceFormStep1({
  workspaceName,
  setWorkspaceName,
  logoFile,
  setLogoFile,
  logoPreview,
  setLogoPreview,
  onContinue,
}: WorkspaceFormStep1Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (800KB max)
      if (file.size > 800 * 1024) {
        alert("File is too large. Maximum size is 800KB.");
        return;
      }
      
      // Check file type
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        alert("Only JPG, PNG, and GIF files are allowed.");
        return;
      }
      
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleContinue = () => {
    if (!workspaceName.trim()) {
      alert("Please enter a workspace name");
      return;
    }
    onContinue();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <Label htmlFor="workspace-name">Workspace name</Label>
        <Input 
          id="workspace-name"
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          className="border-gray-300 focus-visible:ring-[#407c87]"
          placeholder="Website SEO"
        />
        <p className="text-xs text-gray-400">
          Your workspace name has been set as initially added. You can change it now if you want
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="workspace-logo">Workspace Logo</Label>
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 bg-gray-100 flex items-center justify-center relative border border-gray-200 rounded-sm">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
            ) : (
              <Upload className="h-5 w-5 text-gray-400" />
            )}
          </div>
          
          <div className="space-x-2">
            <Button 
              type="button"
              variant="outline"
              className="bg-[#407c87] text-white hover:bg-[#386d77]"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload a photo
            </Button>
            
            <Button 
              type="button"
              variant="outline"
              className="border-gray-200 text-gray-500"
              onClick={resetLogo}
              disabled={!logoPreview}
            >
              Reset
            </Button>
            
            <input 
              type="file"
              id="logo-upload"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Allowed JPG, GIF or PNG. Max size of 800K
        </p>
      </div>
      
      <Button 
        className="bg-[#407c87] hover:bg-[#386d77] w-full h-12 mt-4"
        onClick={handleContinue}
      >
        Continue
      </Button>
    </div>
  );
}
