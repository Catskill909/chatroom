import { useEffect, useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { User, ExternalLink } from "lucide-react";
import AudioPlayer, { RHAP_UI } from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";
import "@/components/audio-player-dark.css";
import "@/components/audio-player-fullwidth.css";
import { MagnifierIcon } from "@/components/ui/MagnifierIcon";
import { ImageModal } from "@/components/ui/ImageModal";
import { LinkPreview } from "./LinkPreview";

export interface Message {
  id: string;
  username: string;
  content: string;
  timestamp: Date;
  avatar?: string;
  image?: string;
  audio?: string;
  audioMeta?: {
    title?: string;
    artist?: string;
    album?: string;
    coverUrl?: string;
  };
}

interface ChatMessageProps {
  message: Message;
  currentUser: string;
}

export const ChatMessage = ({ message, currentUser }: ChatMessageProps) => {
  const isOwn = message.username === currentUser;

  // Modal state for image preview
  const [showImageModal, setShowImageModal] = useState(false);

  // State to trigger re-render every minute
  const [, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60 * 1000); // every minute
    return () => clearInterval(interval);
  }, []);

  // Ensure timestamp is a Date object
  const msgDate = message.timestamp instanceof Date
    ? message.timestamp
    : new Date(message.timestamp);

  // Custom formatter for time units
  function truncateTimeUnits(str: string) {
    return str
      .replace(/\bminutes\b/g, "mins")
      .replace(/\bminute\b/g, "min")
      .replace(/\bhours\b/g, "hr")
      .replace(/\bhour\b/g, "hr")
      .replace(/\bseconds\b/g, "sec")
      .replace(/\bsecond\b/g, "sec")
      .replace(/\bdays\b/g, "d")
      .replace(/\bday\b/g, "d")
      .replace(/\bmonths\b/g, "mo")
      .replace(/\bmonth\b/g, "mo")
      .replace(/\byears\b/g, "yr")
      .replace(/\byear\b/g, "yr");
  }

  return (
    <div className={`w-full max-w-2xl ${isOwn ? 'ml-auto' : ''}`} style={{minWidth: 0}}>
      <div className={`flex space-x-3 p-3 rounded-lg transition-colors hover:bg-chat-hover ${isOwn ? 'bg-chat-bubble-own' : 'bg-chat-bubble-other'}`} style={{minWidth: 0, width: '100%'}}>
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-border overflow-hidden">
            {message.avatar ? (
              <img
                src={message.avatar}
                alt={`${message.username}'s avatar`}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Message Content */}
        <div className="min-w-0 w-full">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-sm text-white">
              {message.username}
            </span>
            <span className="text-xs text-white/70">
              {truncateTimeUnits(formatDistanceToNow(msgDate, { addSuffix: true }))}
            </span>
          </div>

          {/* Audio Message Rendering */}
          {message.audio && (
            <div className="mb-2 flex flex-col bg-muted rounded-lg p-3 w-full min-w-0 overflow-visible audio-player-bubble" style={{minWidth: 0}}>
              <div className="flex items-center mb-2" style={{minWidth: 0}}>
                <img
                  src={message.audioMeta?.coverUrl || "/spalsh_image.png"}
                  alt="Audio cover"
                  className="w-16 h-16 rounded border border-border object-cover mr-3 bg-background"
                  style={{ backgroundColor: "#222" }}
                />
                <div>
                  <div className="font-semibold text-white">{message.audioMeta?.title || "Untitled Audio"}</div>
                  <div className="text-xs text-muted-foreground">{message.audioMeta?.artist || "Unknown Artist"}</div>
                  <div className="text-xs text-muted-foreground">{message.audioMeta?.album || ""}</div>
                </div>
              </div>
              <div className="w-full min-w-0 audio-player-fullwidth" style={{width: '100%', minWidth: 0}}>
                <AudioPlayer
                  src={message.audio}
                  showJumpControls={false}
                  customAdditionalControls={[]}
                  customVolumeControls={[]}
                  layout="horizontal"
                  style={{ background: "transparent", color: "#fff", width: "100%", minWidth: 0 }}
                  className="w-full min-w-0 audio-player-fullwidth"
                  aria-label="Audio message player"
                />
              </div>
              <a
                href={message.audio}
                download={message.audioMeta?.title || "audio"}
                className="mt-2 text-xs text-blue-400 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Download audio
              </a>
            </div>
          )}

          {/* Image Message Rendering */}
          {message.image && (
  <div className="mb-2 relative group">
    <img
      src={message.image}
      alt="Shared image"
      className="w-full h-auto max-w-full max-h-64 sm:max-h-80 rounded-lg border border-border object-cover"
      onLoad={() => console.log("[chat] Image loaded in message")}
      onError={(e) => console.error("[chat] Image load error:", e)}
      style={{ cursor: 'pointer' }}
      onClick={() => setShowImageModal(true)}
    />
    <button
      type="button"
      aria-label="View full image"
      className="absolute top-2 left-2 bg-black/70 rounded-full p-2 opacity-85 group-hover:opacity-100 hover:bg-white/10 hover:text-gray-200 transition-colors flex items-center justify-center shadow-lg focus-visible:ring-2 focus-visible:ring-white"
      onClick={e => { e.stopPropagation(); setShowImageModal(true); }}
      tabIndex={0}
    >
      <MagnifierIcon className="w-6 h-6 text-white group-hover:text-gray-200 transition-colors" />
    </button>
    <ImageModal open={showImageModal} imageUrl={message.image} onClose={() => setShowImageModal(false)} />
  </div>
)}

          {/* Text Message Rendering with Link Detection */}
          {message.content && (
            <div className="space-y-2">
              <p className="text-sm leading-relaxed break-words text-white whitespace-pre-wrap">
                {message.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) => {
                  // Check if the part is a URL
                  if (part.match(/^https?:\/\//)) {
                    try {
                      const url = new URL(part);
                      return (
                        <span key={i} className="inline-flex items-center">
                          <a
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline inline-flex items-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {url.hostname.replace('www.', '')}
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </span>
                      );
                    } catch (e) {
                      return part;
                    }
                  }
                  return part;
                })}
              </p>
              
              {/* Link Previews */}
              {(() => {
                const urls = message.content.match(/https?:\/\/[^\s]+/g) || [];
                // Only show preview for the first URL in the message to avoid clutter
                const firstValidUrl = urls.find(url => {
                  try {
                    new URL(url);
                    return true;
                  } catch {
                    return false;
                  }
                });
                
                return firstValidUrl ? <LinkPreview url={firstValidUrl} /> : null;
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};