import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Image, X } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (content: string, image?: File) => void;
}

export const ChatInput = ({ onSendMessage }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleSend = () => {
    if (message.trim() || selectedImage) {
      onSendMessage(message, selectedImage || undefined);
      setMessage("");
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-card border-t border-border p-4">
      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-3 relative inline-block">
          <img
            src={imagePreview}
            alt="Selected image"
            className="max-w-32 max-h-32 rounded-lg border border-border object-cover"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={removeImage}
            className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full bg-secondary border border-border hover:bg-accent"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="bg-input border-border text-foreground pr-12"
          />
          
          {/* Image Upload Button */}
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              id="image-upload"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => document.getElementById('image-upload')?.click()}
              className="p-2 h-8 w-8 hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <Image className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Button
          onClick={handleSend}
          disabled={!message.trim() && !selectedImage}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};