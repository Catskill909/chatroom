import { useState } from "react";
import { useTimeTick } from "./TimeTickContext";
import { formatDistanceToNow } from "date-fns";
import { User, ExternalLink, Trash2, Smile, Plus } from "lucide-react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import AudioPlayer, { RHAP_UI } from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";
import "@/components/audio-player-dark.css";
import "@/components/audio-player-fullwidth.css";
import { MagnifierIcon } from "@/components/ui/MagnifierIcon";
import { ImageModal } from "@/components/ui/ImageModal";
import { LinkPreview } from "./LinkPreview";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  reactions?: Record<string, string[]>;
}

interface ChatMessageProps {
  message: Message;
  currentUser: string;
  isAdmin?: boolean;
  onDeleteMessage?: (messageId: string) => void;
  onAddReaction?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
}

export const ChatMessage = ({ message, currentUser, isAdmin, onDeleteMessage, onAddReaction, onRemoveReaction }: ChatMessageProps) => {
  const isOwn = message.username === currentUser;

  // Modal state for image preview
  const [showImageModal, setShowImageModal] = useState(false);

  // Subscribe to shared minute-tick timer (one timer for ALL messages, not one per message)
  useTimeTick();

  const [deleteOpen, setDeleteOpen] = useState(false);

  // Reaction picker state
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Quick reaction emojis for fast access
  const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥', '👏'];

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

  const handleReactionClick = (emoji: string) => {
    if (!onAddReaction || !onRemoveReaction) return;

    const hasReacted = message.reactions?.[emoji]?.includes(currentUser);

    if (hasReacted) {
      onRemoveReaction(message.id, emoji);
    } else {
      onAddReaction(message.id, emoji);
    }
    setShowReactionPicker(false);
  };

  return (
    <div className={`w-full max-w-2xl ${isOwn ? 'ml-auto' : ''}`} style={{ minWidth: 0 }}>
      <div className={`flex space-x-3 p-3 rounded-lg transition-colors hover:bg-chat-hover ${isOwn ? 'bg-chat-bubble-own' : 'bg-chat-bubble-other'}`} style={{ minWidth: 0, width: '100%' }}>
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

            {/* Reaction Picker Button */}
            <div className="ml-auto flex items-center space-x-1">
              <Popover open={showReactionPicker} onOpenChange={setShowReactionPicker}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`
                      inline-flex items-center justify-center w-7 h-7 rounded-md
                      transition-all duration-200 ease-out
                      hover:scale-110 active:scale-95 shadow-sm
                      ${showReactionPicker
                        ? 'bg-blue-500/30 text-white border border-blue-400/50'
                        : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20 hover:text-white hover:border-white/40 shadow-indigo-500/10'
                      }
                    `}
                    title="Add reaction"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  side="bottom"
                  sideOffset={4}
                  className="p-0 w-auto bg-transparent border-none shadow-2xl rounded-2xl overflow-hidden z-50"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="bg-[#1a1a1a] backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                    {/* Quick Reactions Bar */}
                    <div className="flex items-center gap-1 p-2 border-b border-white/10 bg-white/5">
                      {QUICK_REACTIONS.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            handleReactionClick(emoji);
                          }}
                          className="w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-white/10 transition-all duration-150 hover:scale-125 active:scale-100"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    {/* Full Emoji Picker */}
                    <Picker
                      data={data}
                      theme="dark"
                      onEmojiSelect={(emoji: any) => {
                        const emojiChar = emoji.native || "";
                        if (emojiChar) {
                          handleReactionClick(emojiChar);
                        }
                      }}
                      previewPosition="none"
                      skinTonePosition="search"
                      maxFrequentRows={2}
                      perLine={8}
                      emojiSize={24}
                      emojiButtonSize={32}
                      navPosition="bottom"
                      searchPosition="sticky"
                    />
                  </div>
                </PopoverContent>
              </Popover>

              {isAdmin && onDeleteMessage && (
                <button
                  type="button"
                  aria-label="Delete message (Admin)"
                  className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-all hover:scale-110 group"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4 group-hover:animate-pulse" />
                </button>
              )}
            </div>
          </div>

          {isAdmin && onDeleteMessage && (
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete message?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove the message for everyone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onDeleteMessage(message.id);
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Audio Message Rendering */}
          {message.audio && (
            <div className="mb-2 flex flex-col bg-muted rounded-lg p-3 w-full min-w-0 overflow-visible audio-player-bubble" style={{ minWidth: 0 }}>
              <div className="flex items-center mb-2" style={{ minWidth: 0 }}>
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
              <div className="w-full min-w-0 audio-player-fullwidth" style={{ width: '100%', minWidth: 0 }}>
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
              <p className={`leading-relaxed break-words text-white whitespace-pre-wrap ${(() => {
                // Helper to check if string contains ONLY emojis (and whitespace)
                const emojiRegex = /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|\s)+$/;
                return emojiRegex.test(message.content) ? 'text-5xl py-2' : 'text-sm';
              })()
                }`}>
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

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {/* Display existing reactions as pills */}
            {message.reactions && Object.entries(message.reactions).map(([emoji, users]) => {
              if (!users || users.length === 0) return null;
              const hasReacted = users.includes(currentUser);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleReactionClick(emoji)}
                  className={`
                    group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm
                    transition-all duration-200 ease-out
                    hover:scale-105 active:scale-95
                    ${hasReacted
                      ? 'bg-gradient-to-r from-blue-500/25 to-purple-500/20 border border-blue-400/40 shadow-sm shadow-blue-500/10'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
                    }
                  `}
                  title={`${users.join(', ')}\nClick to ${hasReacted ? 'remove' : 'add'} reaction`}
                >
                  <span className="text-base leading-none">{emoji}</span>
                  <span className={`text-xs font-medium tabular-nums ${hasReacted ? 'text-blue-300' : 'text-white/60'}`}>
                    {users.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};