// Socket.IO client singleton (outside component)
import { io } from "socket.io-client";
// Use environment variable for Socket.IO URL if set, otherwise default to relative URL (same origin)
const socket = io(
  import.meta.env.VITE_SOCKET_URL ? import.meta.env.VITE_SOCKET_URL : '/',
  {
    // Allow credentials/cookies if needed for future expansion
    withCredentials: false,
    transports: ['websocket', 'polling'], // robust fallback for most hosts
  }
);

import { useState, useEffect, useRef } from "react";
import { UsernameModal } from "./UsernameModal";
import { ChatMessage, type Message } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { UsersList, type ChatUser } from "./UsersList";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export const Chatroom = () => {
  const [showUsernameModal, setShowUsernameModal] = useState(true);
  const [currentUser, setCurrentUser] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Store user info in refs for reconnect logic
  const userRef = useRef<{ username: string; avatar: string | null }>({ username: "", avatar: null });

  useEffect(() => {
    socket.on("users", (usersList) => {
      console.log("[socket] received users", usersList);
      console.log("[debug] users count:", usersList.length);
      setUsers(usersList);
    });
    socket.on("history", (history) => {
      console.log("[socket] received history", history);
      setMessages(history);
    });
    socket.on("message", (msg) => {
      console.log("[socket] received message", msg);
      setMessages(prev => [...prev, msg]);
    });
    socket.on("join_error", (err) => {
      toast({ title: "Username Error", description: err.message, variant: "destructive" });
      setShowUsernameModal(true);
      setCurrentUser("");
      setUserAvatar(null);
    });

    // On connect, emit join if user is set
    socket.on("connect", () => {
      console.log("[socket] connected", socket.id);
      if (userRef.current.username) {
        socket.emit("join", {
          username: userRef.current.username,
          avatar: userRef.current.avatar,
        });
        console.log("[socket] emitted join (on connect)", userRef.current);
      }
    });

    socket.on("connect_error", (err) => console.error("[socket] connect_error", err));
    socket.on("disconnect", (reason) => console.warn("[socket] disconnected", reason));
    return () => {
      socket.off("users");
      socket.off("history");
      socket.off("message");
      socket.off("connect");
      socket.off("connect_error");
      socket.off("disconnect");
    };
  }, []);

  // Note: Chat auto-scroll is now handled by CSS flex-direction: column-reverse
  // No JavaScript scrolling needed!

  const handleUsernameSubmit = (username: string, avatarBase64?: string) => {
    setCurrentUser(username);
    setShowUsernameModal(false);
    setUserAvatar(avatarBase64 || null);
    userRef.current = { username, avatar: avatarBase64 || null };

    // Emit join if already connected
    if (socket.connected) {
      socket.emit("join", {
        username,
        avatar: avatarBase64,
      });
      console.log("[socket] emitted join (on submit)", { username, avatar: avatarBase64 });
    } else {
      console.warn("[socket] not connected, will emit join on connect");
    }
    toast({
      title: "Welcome to the chatroom!",
      description: `You're now chatting as ${username}`,
    });
  };

  // Resize image before converting to base64 - SAME function used for avatars
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

  const handleSendMessage = async (content: string, image?: File) => {
    if (!currentUser) return;

    console.log("[chat] handleSendMessage called", { hasContent: !!content.trim(), hasImage: !!image });

    // For text-only messages, send immediately
    if (!image) {
      const textMessage: Message = {
        id: Date.now().toString(),
        username: currentUser,
        content: content,
        timestamp: new Date(),
        avatar: userAvatar || undefined,
      };

      socket.emit("message", textMessage);
      return;
    }

    // For messages with images - use the same method as avatar uploads
    try {
      console.log("[chat] Processing image for chat", { fileName: image.name, fileSize: image.size });

      // Convert and resize image using the same function as avatars
      const base64 = await resizeImage(image, 800);
      console.log("[chat] Image converted to base64, length:", base64.length);

      // Create and send message with image
      const imageMessage: Message = {
        id: Date.now().toString(),
        username: currentUser,
        content: content,
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
  };


  if (showUsernameModal) {
    return <UsernameModal isOpen={showUsernameModal} onSubmit={handleUsernameSubmit} />;
  }

  return (
        <div className="h-dvh bg-background flex">
      {/* Users List - Desktop */}
      {!isMobile && (
        <div className="flex-shrink-0">
          <UsersList users={users} currentUser={currentUser} />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className={`bg-card border-b border-border flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-4 ${isMobile ? "py-2" : "p-4"}`}>
          <div className="flex flex-row items-center justify-between w-full relative" style={{minHeight: '3rem'}}>
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
            {/* Invisible placeholder for perfect centering */}
            {isMobile && <div className="h-8 w-8" style={{ visibility: 'hidden' }} />}
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Messages List */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col justify-end">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} currentUser={currentUser} />
            ))}
          </div>
          
          {/* Input */}
          <div className="border-t border-border p-4">
            <ChatInput onSendMessage={handleSendMessage} />
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <UsersList users={users} currentUser={currentUser} />
        </SheetContent>
      </Sheet>
    </div>
  );
};