import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Users, 
  MessageSquare, 
  Trash2, 
  UserX, 
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface ChatUser {
  id: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
}

interface Message {
  id: string;
  username: string;
  content: string;
  timestamp: Date;
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  users: ChatUser[];
  messages: Message[];
  onKickUser: (username: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onLogout: () => void;
}

export const AdminPanel = ({
  isOpen,
  onClose,
  users,
  messages,
  onKickUser,
  onDeleteMessage,
  onLogout
}: AdminPanelProps) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'users' | 'messages'>('overview');

  const onlineUsers = users.filter(u => u.isOnline);
  const messagesLast24h = messages.filter(m => {
    const msgDate = new Date(m.timestamp);
    const now = new Date();
    return (now.getTime() - msgDate.getTime()) < 24 * 60 * 60 * 1000;
  });

  const recentMessages = messages.slice(-10).reverse();

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[500px] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-6 pb-4 border-b bg-gradient-to-r from-yellow-500/10 to-orange-500/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Shield className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <SheetTitle className="text-xl">Admin Panel</SheetTitle>
                <SheetDescription>Moderation & Management</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Tab Navigation */}
          <div className="flex gap-2 p-4 border-b bg-card/50">
            <Button
              variant={selectedTab === 'overview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTab('overview')}
              className="flex-1"
            >
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </Button>
            <Button
              variant={selectedTab === 'users' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTab('users')}
              className="flex-1"
            >
              <Users className="h-4 w-4 mr-2" />
              Users
            </Button>
            <Button
              variant={selectedTab === 'messages' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTab('messages')}
              className="flex-1"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
            </Button>
          </div>

          {/* Content Area */}
          <ScrollArea className="flex-1 p-4">
            {selectedTab === 'overview' && (
              <div className="space-y-4">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Users className="h-4 w-4" />
                      <span className="text-xs font-medium">Online Users</span>
                    </div>
                    <p className="text-2xl font-bold">{onlineUsers.length}</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-xs font-medium">Total Messages</span>
                    </div>
                    <p className="text-2xl font-bold">{messages.length}</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs font-medium">Last 24h</span>
                    </div>
                    <p className="text-2xl font-bold">{messagesLast24h.length}</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-medium">Status</span>
                    </div>
                    <Badge variant="secondary" className="mt-1 bg-green-500/20 text-green-500">Active</Badge>
                  </div>
                </div>

                <Separator />

                {/* Recent Activity */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Recent Activity
                  </h3>
                  <div className="space-y-2">
                    {recentMessages.map((msg) => (
                      <div key={msg.id} className="p-3 rounded-lg border bg-card/50 text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{msg.username}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground truncate">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Quick Actions */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      View Admin Logs
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-red-500 hover:text-red-600" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Chat History
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {selectedTab === 'users' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">All Users ({users.length})</h3>
                  <Badge variant="secondary">{onlineUsers.length} online</Badge>
                </div>

                {users.map((user) => (
                  <div key={user.id} className="p-3 rounded-lg border bg-card flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {user.avatar ? (
                          <img 
                            src={user.avatar} 
                            alt={user.username}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {user.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.isOnline ? 'Online' : 'Offline'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      onClick={() => onKickUser(user.username)}
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {selectedTab === 'messages' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Recent Messages ({messages.length})</h3>
                </div>

                {recentMessages.map((msg) => (
                  <div key={msg.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{msg.username}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground break-words">{msg.content}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10 flex-shrink-0"
                        onClick={() => onDeleteMessage(msg.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t bg-card/50">
            <Button 
              variant="outline" 
              className="w-full text-red-500 hover:text-red-600 hover:bg-red-500/10"
              onClick={onLogout}
            >
              <Shield className="h-4 w-4 mr-2" />
              Logout Admin
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
