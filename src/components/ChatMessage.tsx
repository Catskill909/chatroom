import { formatDistanceToNow } from "date-fns";
import { User } from "lucide-react";

export interface Message {
  id: string;
  username: string;
  content: string;
  timestamp: Date;
  avatar?: string;
  image?: string;
  isOwn: boolean;
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  return (
    <div className={`flex space-x-3 p-3 rounded-lg transition-colors hover:bg-chat-hover ${
      message.isOwn ? 'bg-chat-bubble-own' : 'bg-chat-bubble-other'
    }`}>
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
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <span className="font-medium text-foreground text-sm">
            {message.username}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(message.timestamp, { addSuffix: true })}
          </span>
        </div>
        
        {message.image && (
          <div className="mb-2">
            <img
              src={message.image}
              alt="Uploaded image"
              className="max-w-sm max-h-64 rounded-lg border border-border object-cover"
            />
          </div>
        )}
        
        {message.content && (
          <p className="text-foreground text-sm leading-relaxed break-words">
            {message.content}
          </p>
        )}
      </div>
    </div>
  );
};