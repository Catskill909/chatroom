import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { io, Socket } from 'socket.io-client';
import { useToast } from './ui/use-toast';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Users, Settings as SettingsIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Types
interface Message {
  id: string;
  username: string;
  text: string;
  timestamp: Date;
  avatar?: string;
  audioUrl?: string;
  audioDuration?: number;
  audioWaveform?: number[];
}

interface ChatUser {
  id: string;
  username: string;
  avatar?: string;
  status?: 'online' | 'away' | 'offline';
  lastSeen?: Date;
}

// Custom hook for socket connection management
const useSocket = (url: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io(url, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
    });

    const onConnect = () => {
      console.log('[Socket] Connected');
      setIsConnected(true);
    };

    const onDisconnect = (reason: string) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    };

    const onConnectError = (error: Error) => {
      console.error('[Socket] Connection error:', error);
    };

    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);
    socketInstance.on('connect_error', onConnectError);

    setSocket(socketInstance);

    // Cleanup
    return () => {
      socketInstance.off('connect', onConnect);
      socketInstance.off('disconnect', onDisconnect);
      socketInstance.off('connect_error', onConnectError);
      socketInstance.disconnect();
    };
  }, [url]);

  return { socket, isConnected };
};

export const Chatroom = () => {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useLocalStorage<string>('username', '');
  const [userAvatar, setUserAvatar] = useLocalStorage<string | null>('userAvatar', null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<{ username: string; avatar: string | null }>({ 
    username: currentUser, 
    avatar: userAvatar 
  });

  const { socket, isConnected } = useSocket(import.meta.env.VITE_SOCKET_URL || 'ws://localhost:3000');

  // Update user ref when currentUser or userAvatar changes
  useEffect(() => {
    userRef.current = { username: currentUser, avatar: userAvatar };
  }, [currentUser, userAvatar]);

  // Handle incoming messages
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (message: Message) => {
      setMessages(prev => [...prev, message]);
    };

    const handleUsers = (usersList: ChatUser[]) => {
      setUsers(usersList);
    };

    socket.on('message', handleMessage);
    socket.on('users', handleUsers);

    return () => {
      socket.off('message', handleMessage);
      socket.off('users', handleUsers);
    };
  }, [socket]);

  // Handle sending messages
  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim() || !socket || !currentUser) return;

    const message: Omit<Message, 'id' | 'timestamp'> = {
      username: currentUser,
      text: inputMessage,
      avatar: userAvatar || undefined,
    };

    socket.emit('message', message);
    setInputMessage('');
  }, [inputMessage, socket, currentUser, userAvatar]);

  // Handle avatar updates
  const handleAvatarChange = useCallback((newAvatar: string | null) => {
    if (!socket || !currentUser) return;

    setUserAvatar(newAvatar);
    userRef.current.avatar = newAvatar;

    // Update user's avatar in the users list
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.username === currentUser 
          ? { ...user, avatar: newAvatar || undefined } 
          : user
      )
    );

    // Notify the server about the avatar change
    socket.emit('update_avatar', { 
      username: currentUser,
      avatar: newAvatar 
    });
  }, [socket, currentUser, setUserAvatar]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle username submission
  const handleSetUsername = (username: string) => {
    setCurrentUser(username);
    if (socket) {
      socket.emit('set_username', username);
    }
  };

  // Show username modal if not set
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-full max-w-md p-6">
          <CardHeader>
            <CardTitle>Enter Your Username</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Username"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    handleSetUsername(e.currentTarget.value.trim());
                  }
                }}
              />
              <Button 
                onClick={() => {
                  const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                  if (input?.value.trim()) {
                    handleSetUsername(input.value.trim());
                  }
                }}
              >
                Join
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Chat Room</h2>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
            >
              <SettingsIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Users list */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Online ({users.length})
          </h3>
          <div className="space-y-2">
            {users.map((user) => (
              <div key={user.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <Avatar className="h-8 w-8">
                  {user.avatar ? (
                    <AvatarImage src={user.avatar} alt={user.username} />
                  ) : (
                    <AvatarFallback>
                      {user.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span className="text-sm font-medium">{user.username}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex ${message.username === currentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.username === currentUser 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="h-6 w-6">
                      {message.avatar ? (
                        <AvatarImage src={message.avatar} alt={message.username} />
                      ) : (
                        <AvatarFallback>
                          {message.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className={`text-xs font-medium ${
                      message.username === currentUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {message.username}
                    </span>
                  </div>
                  <p className="text-sm">{message.text}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message input */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Type a message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={!inputMessage.trim()}>
              Send
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Change Avatar</h3>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    {userAvatar ? (
                      <AvatarImage src={userAvatar} alt={currentUser} />
                    ) : (
                      <AvatarFallback>
                        {currentUser.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // In a real app, you would open a file picker here
                        // For now, we'll just set a placeholder avatar
                        handleAvatarChange('https://api.dicebear.com/7.x/avataaars/svg?seed=' + currentUser);
                      }}
                    >
                      Change
                    </Button>
                    {userAvatar && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAvatarChange(null)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <Button onClick={() => setIsSettingsOpen(false)}>Done</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Chatroom;
