import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { User } from "lucide-react";

export interface Message {
  id: string;
  username: string;
  content: string;
  timestamp: Date;
  avatar?: string;
  image?: string;
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
    <div className={`w-[70%] ${isOwn ? 'ml-auto' : ''}`}>
      <div className={`flex space-x-3 p-3 rounded-lg transition-colors hover:bg-chat-hover ${isOwn ? 'bg-chat-bubble-own' : 'bg-chat-bubble-other'}`}>
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
        <div className="min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-sm text-white">
              {message.username}
            </span>
            <span className="text-xs text-white/70">
              {truncateTimeUnits(formatDistanceToNow(msgDate, { addSuffix: true }))}
            </span>
          </div>

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