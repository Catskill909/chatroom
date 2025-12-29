import React from "react";
import OSSPlayer from "./OSSPlayer";
import { UserCard } from './UserCard';
import { X } from "lucide-react";

export interface ChatUser {
  username: string;
  avatar?: string;
  isOnline: boolean;
}

interface UsersListProps {
  users: ChatUser[];
  currentUser: string;
  onSettingsClick?: () => void;
  isAdmin?: boolean;
  onKickUser?: (username: string) => void;
  onClose?: () => void;
}

export const UsersList = ({ users, currentUser, onSettingsClick, isAdmin, onKickUser, onClose }: UsersListProps) => {
  return (
    <div className="bg-card border-r border-border h-full w-full sm:w-64 flex flex-col">
      <div className="p-4 border-b border-border relative">
        <h2 className="font-semibold text-foreground">Online Users</h2>
        <p className="text-sm text-muted-foreground">
          {users.filter(u => u.isOnline).length} online
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {users.map((user) => (
            <UserCard
              key={user.username}
              user={user}
              isCurrentUser={user.username === currentUser}
              onSettingsClick={user.username === currentUser ? onSettingsClick : undefined}
              isAdmin={isAdmin}
              onKickUser={onKickUser}
            />
          ))}
        </div>
      </div>


      {/* Old Skool Sessions Player (React version) */}
      <div className="mt-2">
        <OSSPlayer />
      </div>
    </div>
  );
};

export { UserCard } from './UserCard';