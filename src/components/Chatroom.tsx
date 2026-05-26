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
import { TimeTickProvider } from './TimeTickContext';
import { UsersList } from './UsersList';
import { UsernameModal } from './UsernameModal';
import { UserSettingsModal } from './UserSettingsModal';
import { AdminLoginModal } from './AdminLoginModal';
import { AdminPanel } from './AdminPanel';
import type { ChatInputMessage } from './ChatInput';
import { Shield } from 'lucide-react';

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
  reactions?: Record<string, string[]>;
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

  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [adminError, setAdminError] = useState<string | undefined>();

  // User state
  const [currentUser, setCurrentUser] = useLocalStorage<string>('username', '');
  const [userAvatar, setUserAvatar] = useLocalStorage<string | null>('userAvatar', null);
  // Show username modal only when there's no persisted username
  const [showUsernameModal, setShowUsernameModal] = useState(() => !Boolean(currentUser));
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

  // Stable refs for values used inside socket event handlers
  // This prevents the socket useEffect from re-running on every state change
  const toastRef = useRef(toast);
  const currentUserRef = useRef(currentUser);
  const userAvatarRef = useRef(userAvatar);
  const isAdminRef = useRef(isAdmin);

  // Socket connection
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const renameAttemptRef = useRef<{ from: string; to: string } | null>(null);
  const joinRetryRef = useRef<number>(0);

  // Initialize socket connection — mount once, use refs for all mutable values
  useEffect(() => {
    // Determine backend socket URL for dev/prod
    let url = '';

    if (import.meta.env.VITE_SOCKET_URL && !import.meta.env.VITE_SOCKET_URL.includes('localhost')) {
      // Use VITE_SOCKET_URL only if it's not localhost
      url = import.meta.env.VITE_SOCKET_URL;
    } else if (import.meta.env.DEV) {
      // Development mode - use localhost
      url = 'http://localhost:3000';
    } else {
      // Production mode - use current domain
      url = `${window.location.protocol}//${window.location.hostname}`;
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
      closeOnBeforeunload: true,
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
        toastRef.current({
          title: "Disconnected",
          description: "Connection to chat server lost. Reconnecting...",
          variant: "default",
        });
      }
    };

    const handleConnectError = (err: any) => {
      console.error("[socket] connect_error", err);
      if (err.message !== "xhr poll error") {
        toastRef.current({
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
      const currentUserData = usersWithOnlineStatus.find(u => u.username === currentUserRef.current);
      if (currentUserData?.avatar && currentUserData.avatar !== userAvatarRef.current) {
        console.log('[handleUsers] Updating local avatar from server');
        setUserAvatar(currentUserData.avatar);
        userRef.current = { ...userRef.current, avatar: currentUserData.avatar };
      }

      // If we can see ourselves in presence, consider join successful -> reset retry counter
      if (currentUserRef.current && usersWithOnlineStatus.some(u => u.username === currentUserRef.current)) {
        joinRetryRef.current = 0;
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
      // If this was a rename attempt, revert without nuking local state
      if (renameAttemptRef.current) {
        const { from, to } = renameAttemptRef.current;
        renameAttemptRef.current = null;
        toastRef.current({
          title: "Name change failed",
          description: err?.message || `Could not change name to "${to}"`,
          variant: "destructive",
        });
        // Revert username and messages
        setCurrentUser(from);
        userRef.current = { username: from, avatar: userRef.current.avatar };
        setMessages(prev => prev.map(m => m.username === to ? { ...m, username: from } : m));
        return;
      }
      // Initial join failed (likely name taken). Retry a few times in case of stale presence before forcing rename.
      const attempts = joinRetryRef.current;
      if (attempts < 3 && userRef.current.username) {
        joinRetryRef.current = attempts + 1;
        toastRef.current({
          title: "Retrying join",
          description: `Username in use, retrying (${joinRetryRef.current}/3)...`,
        });
        setTimeout(() => {
          try {
            let avatarForJoin = userRef.current.avatar;
            if (avatarForJoin && (avatarForJoin as string).length > 50000) {
              avatarForJoin = null;
            }
            socketInstance.emit('join', { username: userRef.current.username, avatar: avatarForJoin });
          } catch { }
        }, 1500);
        return;
      }
      // Exhausted retries -> prompt for a different name
      toastRef.current({
        title: "Username Error",
        description: err.message || 'Please choose a different username.',
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

    const handleAdminLoginResult = (payload: any) => {
      const ok = Boolean(payload?.success);
      setAdminSubmitting(false);
      if (ok) {
        setIsAdmin(true);
        setShowAdminModal(false);
        setAdminError(undefined);
        toastRef.current({
          title: '🛡️ Admin Mode Enabled',
          description: 'You now have access to moderation controls.',
          duration: 3000
        });
      } else {
        // Clear saved credentials on failed login
        localStorage.removeItem('adminRemembered');
        const errorMsg = payload?.error || 'Invalid admin password. Please try again.';
        setAdminError(errorMsg);
        toastRef.current({
          title: 'Authentication Failed',
          description: errorMsg,
          variant: 'destructive',
          duration: 4000
        });
      }
    };

    const handleAdminLogoutResult = () => {
      setIsAdmin(false);
      setAdminError(undefined);
      localStorage.removeItem('adminRemembered');
      toastRef.current({
        title: 'Admin Mode Disabled',
        description: 'You have logged out of admin mode.',
        duration: 2000
      });
    };

    const handleAdminError = (payload: any) => {
      const msg = payload?.message || 'Admin action failed.';
      if (msg === 'Not authorized') {
        setIsAdmin(false);
      }
      toastRef.current({ title: 'Admin', description: msg, variant: 'destructive' });
    };

    const handleAdminMessageDeleted = (payload: any) => {
      const id = payload?.messageId;
      if (!id) return;
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (isAdminRef.current) {
        toastRef.current({
          title: '✓ Message Deleted',
          description: 'The message has been removed.',
          duration: 2000
        });
      }
    };

    const handleAdminAllMessagesDeleted = () => {
      setMessages([]);
      if (isAdminRef.current) {
        toastRef.current({
          title: '✓ All Messages Deleted',
          description: 'Chat history has been cleared.',
          duration: 2000
        });
      }
    };

    const handleAdminUserKicked = (payload: any) => {
      const name = payload?.username;
      if (name) {
        toastRef.current({ title: 'User kicked', description: `${name} was disconnected.` });
      }
    };

    const handleReactionUpdated = (payload: { messageId: string; emoji: string; username: string; action: 'add' | 'remove' }) => {
      console.log('[socket] reaction_updated', payload);
      setMessages(prev => prev.map(msg => {
        if (msg.id !== payload.messageId) return msg;

        const reactions = { ...(msg.reactions || {}) };

        if (payload.action === 'add') {
          if (!reactions[payload.emoji]) {
            reactions[payload.emoji] = [];
          }
          if (!reactions[payload.emoji].includes(payload.username)) {
            reactions[payload.emoji] = [...reactions[payload.emoji], payload.username];
          }
        } else {
          if (reactions[payload.emoji]) {
            reactions[payload.emoji] = reactions[payload.emoji].filter(u => u !== payload.username);
            if (reactions[payload.emoji].length === 0) {
              delete reactions[payload.emoji];
            }
          }
        }

        return { ...msg, reactions };
      }));
    };

    socketInstance.on('admin:loginResult', handleAdminLoginResult);
    socketInstance.on('admin:logoutResult', handleAdminLogoutResult);
    socketInstance.on('admin:error', handleAdminError);
    socketInstance.on('admin:messageDeleted', handleAdminMessageDeleted);
    socketInstance.on('admin:allMessagesDeleted', handleAdminAllMessagesDeleted);
    socketInstance.on('admin:userKicked', handleAdminUserKicked);
    socketInstance.on('reaction_updated', handleReactionUpdated);

    setSocket(socketInstance);

    // Proactively tell server we're leaving before the tab closes
    const beforeUnloadHandler = () => {
      try {
        const username = userRef.current.username;
        if (username) {
          socketInstance.emit('leave', { username });
        }
      } catch { }
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);

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
      socketInstance.off('admin:loginResult', handleAdminLoginResult);
      socketInstance.off('admin:logoutResult', handleAdminLogoutResult);
      socketInstance.off('admin:error', handleAdminError);
      socketInstance.off('admin:messageDeleted', handleAdminMessageDeleted);
      socketInstance.off('admin:allMessagesDeleted', handleAdminAllMessagesDeleted);
      socketInstance.off('admin:userKicked', handleAdminUserKicked);
      socketInstance.off('reaction_updated', handleReactionUpdated);
      window.removeEventListener('beforeunload', beforeUnloadHandler);

      // Always disconnect on unmount to avoid lingering presence
      console.log("[socket] Disconnecting...");
      socketInstance.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // Mount once — all mutable values accessed via refs

  const handleAdminLogin = useCallback((password: string, rememberMe: boolean = false) => {
    if (!socket?.connected) {
      setAdminError('Not connected to server');
      toast({ title: 'Not connected', description: 'Connect to the server first.', variant: 'destructive' });
      return;
    }
    setAdminSubmitting(true);
    setAdminError(undefined);

    // Store password if Remember Me is checked (base64 encoded for basic obfuscation)
    if (rememberMe) {
      try {
        const encoded = btoa(password);
        localStorage.setItem('adminRemembered', encoded);
      } catch (e) {
        console.error('Failed to save admin credentials:', e);
      }
    } else {
      localStorage.removeItem('adminRemembered');
    }

    socket.emit('admin:login', { password });
  }, [socket, toast]);

  // Auto-login if credentials are saved
  useEffect(() => {
    if (!socket?.connected || isAdmin) return;

    try {
      const saved = localStorage.getItem('adminRemembered');
      if (saved) {
        const password = atob(saved);
        handleAdminLogin(password, true);
      }
    } catch (e) {
      console.error('Failed to restore admin session:', e);
      localStorage.removeItem('adminRemembered');
    }
  }, [socket?.connected, isAdmin, handleAdminLogin]);

  useEffect(() => {
    if (!isConnected) {
      setIsAdmin(false);
      setAdminSubmitting(false);
      setAdminError(undefined);
    }
  }, [isConnected]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        if (!isAdmin) {
          setShowAdminModal(true);
        } else {
          setShowAdminPanel(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isAdmin]);

  const handleAdminLogout = useCallback(() => {
    localStorage.removeItem('adminRemembered');
    if (!socket?.connected) {
      setIsAdmin(false);
      return;
    }
    socket.emit('admin:logout');
  }, [socket]);

  const handleAdminDeleteMessage = useCallback((messageId: string) => {
    if (!socket?.connected) return;
    socket.emit('admin:deleteMessage', { messageId });
  }, [socket]);

  const handleAdminDeleteAllMessages = useCallback(() => {
    if (!socket?.connected) return;
    socket.emit('admin:deleteAllMessages');
  }, [socket]);

  const handleAdminKickUser = useCallback((username: string) => {
    if (!socket?.connected) return;
    socket.emit('admin:kickUser', { username });
  }, [socket]);

  // Update all refs when their corresponding state changes
  // This keeps the socket event handlers' closures current without re-creating the socket
  useEffect(() => {
    userRef.current = { username: currentUser, avatar: userAvatar };
    currentUserRef.current = currentUser;
    userAvatarRef.current = userAvatar;
  }, [currentUser, userAvatar]);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    isAdminRef.current = isAdmin;
  }, [isAdmin]);

  // Keep modal visibility in sync with presence of a username
  useEffect(() => {
    setShowUsernameModal(!Boolean(currentUser));
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

  // Handle nickname change from settings
  const handleUsernameChange = useCallback((nextName: string) => {
    const newName = nextName.trim();
    if (!newName || newName === currentUser) return;

    const from = currentUser;
    const to = newName;
    renameAttemptRef.current = { from, to };

    // Optimistically update local state
    setCurrentUser(to);
    userRef.current = { username: to, avatar: userRef.current.avatar };
    setMessages(prev => prev.map(m => m.username === from ? { ...m, username: to } : m));

    // Emit join with new username (server will replace mapping for this socket)
    if (socket?.connected) {
      let avatarForJoin = userRef.current.avatar;
      if (avatarForJoin && avatarForJoin.length > 50000) {
        avatarForJoin = null;
      }
      socket.emit('join', { username: to, avatar: avatarForJoin });
    }

    toast({
      title: "Nickname updated",
      description: `You're now known as ${to}`,
    });
  }, [currentUser, setCurrentUser, socket, toast]);

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

  const handleAddReaction = useCallback((messageId: string, emoji: string) => {
    if (!socket || !currentUser) return;
    socket.emit('add_reaction', { messageId, emoji, username: currentUser });
  }, [socket, currentUser]);

  const handleRemoveReaction = useCallback((messageId: string, emoji: string) => {
    if (!socket || !currentUser) return;
    socket.emit('remove_reaction', { messageId, emoji, username: currentUser });
  }, [socket, currentUser]);

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
            isAdmin={isAdmin}
            onKickUser={handleAdminKickUser}
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

            <div className="relative">
              <button
                type="button"
                aria-label={isAdmin ? 'Open Admin Panel' : 'Admin login (Ctrl+Shift+A)'}
                onClick={() => {
                  if (isAdmin) {
                    setShowAdminPanel(true);
                  } else {
                    setShowAdminModal(true);
                  }
                }}
                className={`absolute right-2 top-2 h-8 w-8 flex items-center justify-center rounded-md transition-all duration-300 ${isAdmin ? 'opacity-100 bg-yellow-500/20 hover:bg-yellow-500/30' : 'opacity-40 hover:opacity-100 focus:opacity-100 hover:bg-accent/40'}`}
              >
                <Shield className={`h-4 w-4 transition-all ${isAdmin ? 'text-yellow-500 animate-pulse' : 'text-muted-foreground'}`} />
              </button>
              {isAdmin && (
                <div className="absolute right-2 top-11 animate-in fade-in slide-in-from-top-2 duration-300">
                  <span className="text-[10px] font-semibold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                    ADMIN
                  </span>
                </div>
              )}
            </div>

            {isMobile && <div className="h-8 w-8" style={{ visibility: 'hidden' }} />}
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Messages List */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 gap-4 flex flex-col-reverse">
            <TimeTickProvider>
              {messages.slice().reverse().map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  currentUser={currentUser}
                  isAdmin={isAdmin}
                  onDeleteMessage={handleAdminDeleteMessage}
                  onAddReaction={handleAddReaction}
                  onRemoveReaction={handleRemoveReaction}
                />
              ))}
            </TimeTickProvider>
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
        onUsernameChange={handleUsernameChange}
      />

      {/* Mobile Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-80 p-0" hideCloseButton>
          <UsersList
            users={users}
            currentUser={currentUser}
            onSettingsClick={() => setShowSettingsModal(true)}
            isAdmin={isAdmin}
            onKickUser={handleAdminKickUser}
            onClose={() => setDrawerOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <AdminLoginModal
        isOpen={showAdminModal}
        onClose={() => { setShowAdminModal(false); setAdminSubmitting(false); setAdminError(undefined); }}
        onSubmit={handleAdminLogin}
        isSubmitting={adminSubmitting}
        error={adminError}
      />

      <AdminPanel
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
        users={users}
        messages={messages}
        onKickUser={handleAdminKickUser}
        onDeleteMessage={handleAdminDeleteMessage}
        onDeleteAllMessages={handleAdminDeleteAllMessages}
        onLogout={() => {
          handleAdminLogout();
          setShowAdminPanel(false);
        }}
      />
    </div>
  );
};

export default Chatroom;
