import { X, Upload, Volume2, VolumeX } from "lucide-react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useState, useRef, ChangeEvent } from "react";

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
  currentAvatar: string | null;
  onAvatarChange: (avatar: string) => void;
  notificationsEnabled: boolean;
  onNotificationToggle: (enabled: boolean) => void;
}

export const UserSettingsModal = ({
  isOpen,
  onClose,
  currentUser,
  currentAvatar,
  onAvatarChange,
  notificationsEnabled,
  onNotificationToggle,
}: UserSettingsModalProps) => {
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(currentAvatar);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resizeImage = (file: File, maxSize = 128): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      
      reader.onload = (e) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          
          // Calculate new dimensions
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject('Canvas context not available');
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        
        img.onerror = () => reject('Image load error');
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => reject('File read error');
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic image type validation
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    try {
      // Resize image to prevent massive base64 strings
      const compressedImage = await resizeImage(file, 128);
      setPreviewAvatar(compressedImage);
      onAvatarChange(compressedImage);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing image. Please try a different file.');
    }
  };

  const handleRemoveAvatar = () => {
    setPreviewAvatar(null);
    onAvatarChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-card border border-border rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-semibold text-foreground">Your Settings</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-accent/50 transition-colors"
            aria-label="Close settings"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Avatar Section */}
          <div className="space-y-4">
            <h3 className="font-medium text-foreground">Profile Picture</h3>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Avatar className="w-16 h-16">
                  {previewAvatar ? (
                    <AvatarImage src={previewAvatar} alt={currentUser} />
                  ) : (
                    <AvatarFallback className="bg-muted text-2xl">
                      {currentUser.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>
              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                  id="avatar-upload"
                />
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {previewAvatar ? 'Change' : 'Upload'}
                  </Button>
                  {previewAvatar && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveAvatar}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG up to 2MB
                </p>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="font-medium text-foreground">Notifications</h3>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="notification-sound" className="flex items-center gap-2">
                  {notificationsEnabled ? (
                    <Volume2 className="w-4 h-4 text-foreground" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-foreground" />
                  )}
                  Notification Sound
                </Label>
                <p className="text-xs text-muted-foreground">
                  Play sound when new messages arrive
                </p>
              </div>
              <Switch
                id="notification-sound"
                checked={notificationsEnabled}
                onCheckedChange={onNotificationToggle}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This only affects the notification sound, not audio messages in chat.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
};
