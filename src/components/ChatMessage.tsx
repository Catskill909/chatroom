import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { User } from "lucide-react";
import AudioPlayer, { RHAP_UI } from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";
import "@/components/audio-player-dark.css";
import "@/components/audio-player-fullwidth.css";

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
            <div className="mb-2">
              <img
                src={message.image}
                alt="Shared image"
                className="w-full h-auto max-w-full max-h-64 sm:max-h-80 rounded-lg border border-border object-cover"
                onLoad={() => console.log("[chat] Image loaded in message")}
                onError={(e) => console.error("[chat] Image load error:", e)}
              />
            </div>
          )}

          {/* Text Message Rendering */}
          {message.content && (
            <p
              className="text-sm leading-relaxed break-words text-white"
            >
              {message.content}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};