import { User } from "lucide-react";

export interface ChatUser {
  username: string;
  avatar?: string;
  isOnline: boolean;
}

interface UsersListProps {
  users: ChatUser[];
  currentUser: string;
}

export const UsersList = ({ users, currentUser }: UsersListProps) => {
  return (
    <div className="bg-card border-r border-border h-full w-64 flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-foreground">Online Users</h2>
        <p className="text-sm text-muted-foreground">{users.length} online</p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {users.map((user) => (
            <div
              key={user.username}
              className={`flex items-center space-x-3 p-2 rounded-lg transition-colors hover:bg-accent ${
                user.username === currentUser ? 'bg-chat-bubble-own' : ''
              }`}
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border overflow-hidden">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={`${user.username}'s avatar`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                {user.isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-online-indicator rounded-full border-2 border-card"></div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.username}
                  {user.username === currentUser && (
                    <span className="text-xs text-muted-foreground ml-2">(You)</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};