import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, User } from "lucide-react";

interface UsernameModalProps {
  isOpen: boolean;
  onSubmit: (username: string, avatarBase64?: string) => void;
}

export const UsernameModal = ({ isOpen, onSubmit }: UsernameModalProps) => {
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Resize image before converting to base64
  const resizeImage = (file: File, maxSize = 128): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject("No canvas context");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/png", 0.7));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatar(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async () => {
    if (!username.trim()) return;
    if (avatar) {
      try {
        const base64 = await resizeImage(avatar, 128);
        onSubmit(username.trim(), base64);
      } catch (e) {
        alert("Failed to process avatar image.");
        onSubmit(username.trim(), undefined);
      }
    } else {
      onSubmit(username.trim(), undefined);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => { }}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground text-center text-xl">
            Welcome to the Chatroom
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-center">
            Choose your username and optional profile picture to join the conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-foreground">
              Choose your username
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username..."
              className="bg-input border-border text-foreground"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-foreground">Choose your avatar (optional)</Label>
            <div className="flex items-center space-x-4">
              {previewUrl ? (
                <img src={previewUrl} alt="Avatar Preview" className="w-12 h-12 rounded-full object-cover border" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <label className="flex items-center cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                <span className="text-sm">Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>
          </div>
        </div>
        <Button className="w-full mt-4" onClick={handleSubmit} disabled={!username.trim()}>
          Join Chat
        </Button>
      </DialogContent>
    </Dialog>
  );
};