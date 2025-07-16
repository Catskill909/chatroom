// Socket.IO client singleton (outside component)
import { io } from "socket.io-client";
const socket = io("http://localhost:3001");

import { useState, useEffect, useRef } from "react";
import { UsernameModal } from "./UsernameModal";
import { ChatMessage, type Message } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { UsersList, type ChatUser } from "./UsersList";
import { useToast } from "@/hooks/use-toast";

export const Chatroom = () => {
  const [showUsernameModal, setShowUsernameModal] = useState(true);
  const [currentUser, setCurrentUser] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Store user info in refs for reconnect logic
  const userRef = useRef<{ username: string; avatar: string | null }>({ username: "", avatar: null });

  useEffect(() => {
    socket.on("users", (userList) => {
      console.log("[socket] received users", userList);
      setUsers(userList);
    });
    socket.on("history", (history) => {
      console.log("[socket] received history", history);
      setMessages(history);
    });
    socket.on("message", (msg) => {
      console.log("[socket] received message", msg);
      setMessages(prev => [...prev, msg]);
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        isOwn: true
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
        isOwn: true
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
    <div className="h-screen bg-background flex">
      {/* Users List */}
      <UsersList users={users} currentUser={currentUser} />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-card border-b border-border p-4 flex items-center space-x-4">
          <img
            src="/oss-logo.png"
            alt="OSS Logo"
            className="h-8 w-auto"
          />
          <div>
            <p className="text-sm text-muted-foreground">
              Welcome, {currentUser}! Welcome to the OSS chat room.
            </p>
          </div>
        </div>


        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
};