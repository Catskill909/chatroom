import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Image, X, Smile, FileMusic } from "lucide-react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

interface ChatInputProps {
  onSendMessage: (content: string, image?: File) => void;
}

import { parseBlob } from "music-metadata-browser";
import AudioPlayer from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";

export type ChatInputMessage = {
  content: string;
  imageFile?: File | null;
  audioFile?: File | null;
  audioPreviewUrl?: string | null;
  audioMeta?: { title?: string; artist?: string; album?: string; coverUrl?: string } | null;
};

export const ChatInput = ({ onSendMessage }: { onSendMessage: (msg: ChatInputMessage) => void }) => {
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // --- AUDIO FEATURE STATE ---
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioMeta, setAudioMeta] = useState<{ title?: string; artist?: string; album?: string; coverUrl?: string } | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  
  // --- UPLOAD PROGRESS STATE ---
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<'cover' | 'audio' | 'complete'>('cover');
  // --------------------------

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to get correct backend URL for uploads
  const getBackendUrl = () => {
    if (import.meta.env.DEV) {
      // In development, use VITE_SOCKET_URL or localhost fallback
      return import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
    }
    // In production, use relative URLs (same domain as frontend)
    return '';
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Image is too large. Maximum size is 5MB.');
        return;
      }

      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      console.log('[chat] Image selected:', { name: file.name, size: file.size, type: file.type });
    }
  };

  const handleSend = async () => {
    // Initialize upload progress if we have an audio file
    if (audioFile) {
      setIsUploading(true);
      // Use setTimeout to ensure state updates are processed before continuing
      await new Promise(resolve => {
        setUploadProgress(0);
        setUploadStage('cover');
        setTimeout(resolve, 0);
      });
    }

    // If audioFile present and audioMeta has a cover art buffer, upload cover art
    let coverUrl = null;
    if (audioFile && audioMeta && audioMeta.coverUrl && audioMeta.coverUrl.startsWith('blob:')) {
      try {
        console.log('[DEBUG] Preparing to upload cover art:', audioMeta.coverUrl);
        // Convert blob URL to Blob
        const blob = await fetch(audioMeta.coverUrl).then(r => r.blob());
        const backendUrl = getBackendUrl();
        const formData = new FormData();
        formData.append('cover', blob, 'cover.png');
        const uploadRes = await fetch(`${backendUrl}/upload/cover`, {
          method: 'POST',
          body: formData
        });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          coverUrl = data.url;
          console.log('[DEBUG] Cover art upload successful, received URL:', coverUrl);
          setUploadProgress(30); // Cover art complete
        } else {
          const errText = await uploadRes.text();
          console.warn('[DEBUG] Cover art upload failed, response:', errText);
          coverUrl = '/spalsh_image.png';
          alert('Cover art upload failed. Default image will be used.');
          setUploadProgress(30); // Still progress to audio stage
        }
      } catch (err) {
        console.error('[DEBUG] Cover art upload failed, using fallback:', err);
        coverUrl = '/spalsh_image.png';
        alert('Cover art upload failed. Default image will be used.');
        setUploadProgress(30); // Still progress to audio stage
      }
    }
    // If no cover or upload failed, fallback
    if (!coverUrl) {
      coverUrl = '/spalsh_image.png';
      console.warn('[DEBUG] No cover art URL available, using fallback.');
    }
    let audioUrl = audioPreviewUrl;
    if (audioFile) {
      // Upload audio file to backend
      setUploadStage('audio');
      setUploadProgress(50);
      console.log('[DEBUG] Starting audio upload:', audioFile.name, audioFile.size, audioFile.type);
      const formData = new FormData();
      formData.append('audio', audioFile);
      console.log('[DEBUG] FormData created, uploading to /upload/audio');
      try {
        const backendUrl = getBackendUrl();
        const res = await fetch(`${backendUrl}/upload/audio`, {
          method: 'POST',
          body: formData,
        });
        console.log('[DEBUG] Upload response status:', res.status, res.statusText);
        if (!res.ok) {
          const errorText = await res.text();
          console.error('[DEBUG] Upload failed with response:', errorText);
          throw new Error(`Audio upload failed: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        console.log('[DEBUG] Upload successful, received URL:', data.url);
        audioUrl = data.url;
        console.log('[DEBUG] Setting progress to 100%');
        // Use functional update and await the state update
        await new Promise(resolve => {
          setUploadProgress(100);
          setUploadStage('complete');
          console.log('[DEBUG] Progress set to 100%, waiting for visual update');
          // Ensure the UI has time to update to 100%
          setTimeout(resolve, 100);
        });
      } catch (err) {
        console.error('[DEBUG] Upload error:', err);
        alert('Audio upload failed. Please try again.');
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }
    }
    
    // If we uploaded an audio file, give time for the 100% progress to be visible
    if (audioFile && isUploading) {
      console.log('[DEBUG] Waiting for progress indicator to show completion');
      await new Promise(resolve => setTimeout(resolve, 1200));
      console.log('[DEBUG] Progress display complete, proceeding with message');
    }
    
    if (message.trim() || selectedImage || audioFile) {
      // Always use backend-served coverUrl, never Blob
      let safeCoverUrl = coverUrl;
      if (safeCoverUrl && safeCoverUrl.startsWith('blob:')) {
        console.warn('[DEBUG] Refusing to send Blob URL as cover art, using fallback.');
        safeCoverUrl = '/spalsh_image.png';
      }
      const msgObj = {
        content: message,
        imageFile: selectedImage,
        audioFile: null, // Do not send the file itself
        audioPreviewUrl: audioUrl, // Use the returned URL
        audioMeta: audioMeta ? { ...audioMeta, coverUrl: safeCoverUrl } : undefined,
      };
      console.log('[DEBUG] Sending message object:', msgObj);
      onSendMessage(msgObj);
      setMessage("");
      setSelectedImage(null);
      setImagePreview(null);
      setAudioFile(null);
      setAudioPreviewUrl(null);
      setAudioMeta(null);
      // Reset upload progress
      console.log('[DEBUG] Resetting upload progress');
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStage('cover');
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (audioInputRef.current) {
        audioInputRef.current.value = "";
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

      {/* Audio File Selected Indicator */}
      {audioFile && (
        <div className="mb-3 relative inline-block bg-muted rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6a3 3 0 116 0v13m-9-4h12" />
            </svg>
            <span className="text-sm text-white">{audioFile.name}</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setAudioFile(null);
              setAudioPreviewUrl(null);
              setAudioMeta(null);
              if (audioInputRef.current) audioInputRef.current.value = "";
            }}
            className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full bg-secondary border border-border hover:bg-accent"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Upload Progress Indicator */}
      {isUploading && (
        <div className="mb-3 bg-muted/50 rounded-lg p-4 border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-foreground">
                {uploadStage === 'cover' && 'Uploading cover art...'}
                {uploadStage === 'audio' && 'Uploading audio file...'}
                {uploadStage === 'complete' && 'Upload complete!'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="bg-input border-border text-foreground pr-12"
          />

          {/* Emoji & Image Upload Buttons */}
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
            {/* Emoji Picker Button */}
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="p-2 h-8 w-8 hover:bg-accent text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label="Open emoji picker"
                >
                  <Smile className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={8} className="p-0 w-auto bg-background border-none shadow-lg">
                <div className="relative">
                  <button
                    className="absolute top-2 right-2 z-10 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowEmojiPicker(false)}
                    aria-label="Close emoji picker"
                    tabIndex={0}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <Picker
                    data={data}
                    theme="dark"
                    onEmojiSelect={(emoji: any) => {
                      if (inputRef.current) {
                        const start = inputRef.current.selectionStart || 0;
                        const end = inputRef.current.selectionEnd || 0;
                        const emojiChar = emoji.native || "";
                        const newMsg =
                          message.slice(0, start) +
                          emojiChar +
                          message.slice(end);
                        setMessage(newMsg);
                        setTimeout(() => {
                          inputRef.current?.focus();
                          inputRef.current?.setSelectionRange(
                            start + emojiChar.length,
                            start + emojiChar.length
                          );
                        }, 0);
                      }
                      setShowEmojiPicker(false);
                    }}
                    previewPosition="none"
                    skinTonePosition="none"
                  />
                </div>
              </PopoverContent>
            </Popover>
            {/* Image Upload Button */}
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
            {/* Audio Upload Button */}
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (!file.type.startsWith("audio/")) {
                  alert("Please select an audio file");
                  return;
                }

                setAudioFile(file);
                const url = URL.createObjectURL(file);
                setAudioPreviewUrl(url);

                // Extract metadata
                try {
                  const metadata = await parseBlob(file);
                  let coverUrl: string | undefined;
                  if (metadata.common.picture && metadata.common.picture.length > 0) {
                    const pic = metadata.common.picture[0];
                    try {
                      coverUrl = URL.createObjectURL(new Blob([pic.data], { type: pic.format }));
                      console.log('[DEBUG] Cover art Blob URL:', coverUrl, pic);
                    } catch (coverErr) {
                      console.error('[DEBUG] Failed to create cover art Blob URL:', coverErr, pic);
                      coverUrl = undefined;
                    }
                  } else {
                    console.warn('[DEBUG] No embedded cover art found in audio metadata:', metadata);
                  }
                  const metaObj = {
                    title: metadata.common.title,
                    artist: metadata.common.artist,
                    album: metadata.common.album,
                    coverUrl: coverUrl,
                  };
                  console.log('[DEBUG] Extracted audio metadata:', metaObj, metadata);
                  setAudioMeta(metaObj);
                  if (!coverUrl) {
                    alert('No embedded cover art found in this audio file. Default image will be used.');
                  }
                } catch (err) {
                  console.error('[DEBUG] Failed to extract audio metadata:', err);
                  setAudioMeta(null);
                  alert('Failed to extract audio metadata. Default image will be used.');
                }
              }}
              className="hidden"
              id="audio-upload"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => document.getElementById('audio-upload')?.click()}
              className="p-2 h-8 w-8 hover:bg-accent text-muted-foreground hover:text-foreground"
              aria-label="Upload audio"
              type="button"
            >
              <FileMusic className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Button
          onClick={handleSend}
          disabled={!message.trim() && !selectedImage && !audioFile}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};