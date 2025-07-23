import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { io, Socket } from 'socket.io-client';
import { useToast } from './ui/use-toast';
import { Button } from './ui/button';
import { Sheet, SheetContent } from './ui/sheet';
import { formatDistanceToNow } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// UI Components
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { UsersList } from './UsersList';
import { UsernameModal } from './UsernameModal';
import { UserSettingsModal } from './UserSettingsModal';
import type { ChatInputMessage } from './ChatInput';

// Custom hook for mobile detection
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// Types
interface Message {
  id: string;
  username: string;
  content: string;
  timestamp: Date;
  avatar?: string;
  image?: string;
  audio?: string;
  audioMeta?: { title?: string; artist?: string; album?: string; coverUrl?: string };
}

interface ChatUser {
  id: string;
  username: string;
  avatar?: string;
  status?: 'online' | 'away' | 'offline';
  lastSeen?: Date;
  isOnline: boolean;
}

export const Chatroom = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // User state
  const [currentUser, setCurrentUser] = useLocalStorage<string>('username', '');
  const [userAvatar, setUserAvatar] = useLocalStorage<string | null>('userAvatar', null);
  const [showUsernameModal, setShowUsernameModal] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  
  // Notification settings
  const [notificationsEnabled, setNotificationsEnabled] = useLocalStorage<boolean>('notificationEnabled', true);
  
  // Refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  
  // Store user info in refs for reconnect logic
  const userRef = useRef<{ username: string; avatar: string | null }>({ 
    username: currentUser, 
    avatar: userAvatar 
  });

  // Socket connection
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    // Determine backend socket URL for dev/prod
    let url = '';
    if (import.meta.env.VITE_SOCKET_URL) {
      url = import.meta.env.VITE_SOCKET_URL;
    } else if (import.meta.env.DEV) {
      url = 'http://localhost:3000';
    } else {
      // In production, use same origin as frontend but replace port if needed
      url = `${window.location.protocol}//${window.location.hostname}`;
      // If running behind a proxy, you may need to adjust this logic
    }
    const socketInstance = io(url, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10, // Increased from 5 to 10
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000, // Increased from 5000 to 10000ms
      randomizationFactor: 0.5,
      timeout: 60000, // Increased timeout to 60 seconds
      forceNew: true,
      transports: ['websocket', 'polling'], // Explicitly enable both transports
      upgrade: true,
      rememberUpgrade: true,
      withCredentials: true,
      extraHeaders: {
        'X-Custom-Header': 'chat-client'
      },
      // Socket.IO specific options
      closeOnBeforeunload: false,
      // These options are valid but might need type assertion
      ...{
        // @ts-ignore - These are valid Socket.IO options but not in the TypeScript types
        pingTimeout: 60000, // 60 seconds
        pingInterval: 25000, // 25 seconds
      }
    });

    const handleConnect = () => {
      console.log("[socket] connected", socketInstance.id);
      setIsConnected(true);
      if (userRef.current.username) {
        // Limit avatar size to prevent socket disconnection
        let avatarForJoin = userRef.current.avatar;
        if (avatarForJoin && avatarForJoin.length > 50000) {
          console.warn('[socket] Avatar too large for join, sending without avatar');
          avatarForJoin = null;
        }
        
        socketInstance.emit("join", {
          username: userRef.current.username,
          avatar: avatarForJoin,
        });
        console.log("[socket] emitted join (on connect)", {
          username: userRef.current.username,
          avatar: avatarForJoin ? 'avatar-included' : 'no-avatar'
        });
      }
    };

    const handleDisconnect = (reason: string) => {
      console.warn("[socket] disconnected", reason);
      setIsConnected(false);
      if (reason !== "io client disconnect") {
        toast({
          title: "Disconnected",
          description: "Connection to chat server lost. Reconnecting...",
          variant: "default",
        });
      }
    };

    const handleConnectError = (err: any) => {
      console.error("[socket] connect_error", err);
      if (err.message !== "xhr poll error") {
        toast({
          title: "Connection Error",
          description: "Unable to connect to the chat server. Please try again.",
          variant: "destructive",
        });
      }
    };

    const handleUsers = (usersList: ChatUser[]) => {
      console.log('[handleUsers] Received users list update:', usersList.map(u => ({
        username: u.username,
        avatar: u.avatar ? 'has-avatar' : 'no-avatar'
      })));
      
      // Ensure all users have isOnline property set
      const usersWithOnlineStatus = usersList.map(user => ({
        ...user,
        isOnline: user.isOnline ?? true // Default to true if not specified
      }));
      
      // Update users list
      setUsers(usersWithOnlineStatus);
      
      // Update the current user's avatar from the server if it's different
      const currentUserData = usersWithOnlineStatus.find(u => u.username === currentUser);
      if (currentUserData?.avatar && currentUserData.avatar !== userAvatar) {
        console.log('[handleUsers] Updating local avatar from server');
        setUserAvatar(currentUserData.avatar);
        userRef.current = { ...userRef.current, avatar: currentUserData.avatar };
      }
    };

    const handleMessage = (msg: any) => {
      console.log("[socket] received message", msg);
      setMessages(prev => [...prev, msg]);
    };

    const handleHistory = (history: any) => {
      console.log("[socket] received history");
      setMessages(history);
    };

    const handleJoinError = (err: any) => {
      toast({ 
        title: "Username Error", 
        description: err.message, 
        variant: "destructive" 
      });
      setShowUsernameModal(true);
      setCurrentUser("");
      setUserAvatar(null);
    };

    // Set up event listeners
    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    socketInstance.on('connect_error', handleConnectError);
    socketInstance.on('users', handleUsers);
    socketInstance.on('message', handleMessage);
    socketInstance.on('history', handleHistory);
    socketInstance.on('join_error', handleJoinError);

    setSocket(socketInstance);

    // Clean up function
    return () => {
      console.log("[socket] Cleaning up event listeners");
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      socketInstance.off('connect_error', handleConnectError);
      socketInstance.off('users', handleUsers);
      socketInstance.off('message', handleMessage);
      socketInstance.off('history', handleHistory);
      socketInstance.off('join_error', handleJoinError);
      
      if (!window.location.pathname.includes('chat')) {
        console.log("[socket] Disconnecting...");
        socketInstance.disconnect();
      }
    };
  }, [currentUser, userAvatar, toast]);

  // Update user ref when currentUser or userAvatar changes
  useEffect(() => {
    userRef.current = { username: currentUser, avatar: userAvatar };
  }, [currentUser, userAvatar]);

  // Show username modal if no current user
  useEffect(() => {
    if (!currentUser) {
      setShowUsernameModal(true);
    }
  }, [currentUser]);

  // Show username modal if no current user
  useEffect(() => {
    if (!currentUser) {
      setShowUsernameModal(true);
    }
  }, [currentUser]);

  // Notification sound effect
  useEffect(() => {
    if (!notificationsEnabled || isInitialMount.current || messages.length === 0) {
      isInitialMount.current = false;
      return;
    }

    const playNotification = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          
          try {
            const response = await fetch('/notification.mp3');
            const arrayBuffer = await response.arrayBuffer();
            audioBufferRef.current = await audioContextRef.current.decodeAudioData(arrayBuffer);
          } catch (error) {
            console.error('Error loading notification sound:', error);
            return;
          }
        }

        const audioContext = audioContextRef.current;
        const audioBuffer = audioBufferRef.current;
        
        if (!audioBuffer) return;
        
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);
      } catch (error) {
        console.error('Error playing notification sound:', error);
      }
    };

    playNotification();
  }, [messages.length, notificationsEnabled]);

  // Ensure scroll to bottom after new message
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = 0;
    }
  }, [messages]);

  // Handle avatar change - SIMPLIFIED VERSION
  const handleAvatarChange = useCallback((avatar: string) => {
    if (!currentUser) return;
    
    // Update local state only
    const newAvatar = avatar || null;
    setUserAvatar(newAvatar);
    userRef.current = { ...userRef.current, avatar: newAvatar };
    
    // Update messages with new avatar
    setMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.username === currentUser 
          ? { ...msg, avatar: newAvatar || undefined } 
          : msg
      )
    );
  }, [currentUser, setUserAvatar]);

  const handleUsernameSubmit = (username: string, avatarBase64?: string) => {
    setCurrentUser(username);
    setShowUsernameModal(false);
    setUserAvatar(avatarBase64 || null);
    userRef.current = { username, avatar: avatarBase64 || null };

    if (socket?.connected) {
      socket.emit("join", {
        username,
        avatar: avatarBase64,
      });
    }
    
    toast({
      title: "Welcome to the chatroom!",
      description: `You're now chatting as ${username}`,
    });
  };

  // Resize image before converting to base64
  const resizeImage = (file: File, maxSize = 800): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject("No canvas context");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSendMessage = async (msg: ChatInputMessage) => {
    if (!currentUser || !socket) return;

    // AUDIO MESSAGE
    if (msg.audioPreviewUrl) {
      const audioMessage: Message = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        username: currentUser,
        content: msg.content,
        timestamp: new Date(),
        avatar: userAvatar || undefined,
        audio: msg.audioPreviewUrl,
        audioMeta: msg.audioMeta || undefined,
      };
      console.log('[DEBUG] Emitting audio message:', audioMessage);
      socket.emit("message", audioMessage);
      return;
    }

    // IMAGE MESSAGE
    if (msg.imageFile) {
      try {
        let base64: string;
        if (msg.imageFile.type === "image/gif") {
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(msg.imageFile as File);
          });
        } else {
          base64 = await resizeImage(msg.imageFile, 800);
        }
        const imageMessage: Message = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          username: currentUser,
          content: msg.content,
          timestamp: new Date(),
          avatar: userAvatar || undefined,
          image: base64,
        };
        socket.emit("message", imageMessage);
      } catch (error) {
        console.error("[chat] Error processing image:", error);
        toast({
          title: "Error",
          description: "Failed to process image."
        });
      }
      return;
    }

    // TEXT MESSAGE
    if (msg.content.trim()) {
      const textMessage: Message = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        username: currentUser,
        content: msg.content,
        timestamp: new Date(),
        avatar: userAvatar || undefined,
      };
      socket.emit("message", textMessage);
    }
  };

  if (showUsernameModal) {
    return <UsernameModal isOpen={showUsernameModal} onSubmit={handleUsernameSubmit} />;
  }

  return (
    <div className="oss-chatroom-viewport bg-background flex" style={{ height: 'var(--oss-app-height)' }}>
      {/* Users List - Desktop */}
      {!isMobile && (
        <div className="flex-shrink-0">
          <UsersList 
            users={users} 
            currentUser={currentUser} 
            onSettingsClick={() => setShowSettingsModal(true)}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className={`bg-card border-b border-border flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-4 ${isMobile ? "py-2" : "p-4"}`}>
          <div className="flex flex-row items-center justify-between w-full relative" style={{ minHeight: '3rem' }}>
            {/* Mobile: Hamburger Drawer Trigger */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-2 bg-transparent text-black h-8 w-8 flex items-center justify-center p-0 m-0 shadow-none border-none rounded-none hover:bg-transparent active:bg-transparent focus:bg-transparent"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
              >
                <img
                  src="/hamburger.png"
                  alt="Menu"
                  className="w-full h-full object-contain p-0 m-0 border-none rounded-none shadow-none"
                  draggable={false}
                />
              </Button>
            )}
            <div className="flex-1 flex justify-center items-center">
              <img
                src="/oss-logo.png"
                alt="OSS Logo"
                className={`${isMobile ? "h-8" : "h-12"} w-auto`}
              />
            </div>
            {isMobile && <div className="h-8 w-8" style={{ visibility: 'hidden' }} />}
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Messages List */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 gap-4 flex flex-col-reverse">
            {messages.slice().reverse().map((message) => (
              <ChatMessage key={message.id} message={message} currentUser={currentUser} />
            ))}
          </div>

          {/* Input */}
          <div className="border-t border-border p-4">
            <ChatInput onSendMessage={handleSendMessage} />
          </div>
        </div>
      </div>

      {/* User Settings Modal */}
      <UserSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentUser={currentUser}
        currentAvatar={userAvatar}
        onAvatarChange={handleAvatarChange}
        notificationsEnabled={notificationsEnabled}
        onNotificationToggle={setNotificationsEnabled}
      />

      {/* Mobile Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <UsersList 
            users={users} 
            currentUser={currentUser} 
            onSettingsClick={() => setShowSettingsModal(true)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Chatroom;
