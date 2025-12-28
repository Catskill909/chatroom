import { Settings, UserX } from "lucide-react";
import { ChatUser } from "./UsersList";
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
import { useState } from "react";

interface UserCardProps {
  user: ChatUser;
  isCurrentUser: boolean;
  onSettingsClick?: () => void;
  isAdmin?: boolean;
  onKickUser?: (username: string) => void;
}

export const UserCard = ({ user, isCurrentUser, onSettingsClick, isAdmin, onKickUser }: UserCardProps) => {
  const [kickOpen, setKickOpen] = useState(false);

  return (
    <div className={`flex items-center justify-between p-2 rounded-lg transition-colors hover:bg-accent ${
      isCurrentUser ? 'bg-chat-bubble-own' : ''
    }`}>
      <div className="flex items-center space-x-3 min-w-0">
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border overflow-hidden">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={`${user.username}'s avatar`}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-muted-foreground">
                {user.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {user.isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-online-indicator rounded-full border-2 border-card"></div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {user.username}
            {isCurrentUser && (
              <span className="text-xs text-muted-foreground ml-2">(You)</span>
            )}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        {isAdmin && !isCurrentUser && onKickUser && (
          <>
            <button
              type="button"
              onClick={() => setKickOpen(true)}
              className="p-1.5 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all hover:scale-110 group"
              aria-label="Kick user (Admin)"
              title="Kick user from chat"
            >
              <UserX className="w-4 h-4 group-hover:animate-pulse" />
            </button>

            <AlertDialog open={kickOpen} onOpenChange={setKickOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Kick {user.username}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will disconnect the user from the chat.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onKickUser(user.username);
                    }}
                  >
                    Kick
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        {isCurrentUser && onSettingsClick && (
          <button 
            onClick={onSettingsClick}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            aria-label="User settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
