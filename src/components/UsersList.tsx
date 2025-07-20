import { UserCard } from './UserCard';

export interface ChatUser {
  username: string;
  avatar?: string;
  isOnline: boolean;
}

interface UsersListProps {
  users: ChatUser[];
  currentUser: string;
  onSettingsClick?: () => void;
}

export const UsersList = ({ users, currentUser, onSettingsClick }: UsersListProps) => {
  return (
    <div className="bg-card border-r border-border h-full w-64 flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-foreground">Online Users</h2>
        <p className="text-sm text-muted-foreground">
          {users.filter(u => u.isOnline).length} online
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {users.map((user) => (
            <UserCard
              key={user.username}
              user={user}
              isCurrentUser={user.username === currentUser}
              onSettingsClick={user.username === currentUser ? onSettingsClick : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export { UserCard } from './UserCard';