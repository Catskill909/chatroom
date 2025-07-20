# Admin Features Implementation Plan

## File Structure
```
src/
├── components/
│   ├── admin/
│   │   ├── AdminContext.tsx         # Admin state management
│   │   ├── AdminLoginModal.tsx      # Admin authentication UI
│   │   ├── DeleteConfirmationModal.tsx # Message deletion confirmation
│   │   └── AdminControls.tsx        # Floating admin controls
│   ├── chat/
│   │   ├── ChatMessage.tsx          # Updated to show delete button for admins
│   │   └── Chatroom.tsx             # Updated to include admin context
│   └── ui/                          # Existing UI components
├── hooks/
│   └── useAdmin.ts                  # Custom hooks for admin functionality
├── lib/
│   └── admin.ts                     # Admin-related utilities
├── pages/
│   └── Admin.tsx                    # Future admin dashboard
└── types/
    └── admin.d.ts                   # TypeScript types for admin features

server/
├── middleware/
│   └── adminAuth.js                # Admin authentication middleware
└── utils/
    └── fileCleanup.js              # File cleanup utilities
```

## Core Components

### 1. Admin Context (src/components/admin/AdminContext.tsx)
```typescript
interface AdminState {
  isAdmin: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  deleteMessage: (messageId: string) => Promise<void>;
  kickUser: (userId: string) => Promise<void>;
}

const AdminContext = createContext<AdminState | undefined>(undefined);
```

### 2. Admin Login Modal (src/components/admin/AdminLoginModal.tsx)
```typescript
interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}
```

### 3. Delete Confirmation Modal (src/components/admin/DeleteConfirmationModal.tsx)
```typescript
interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  messageContent: string | React.ReactNode;
}
```

## Server-Side Implementation

### 1. Admin Authentication (server/middleware/adminAuth.js)
```javascript
/**
 * Middleware to verify admin status
 * @param {Socket} socket - Socket.io socket instance
 * @param {Function} next - Next middleware function
 */
function verifyAdmin(socket, next) {
  // Implementation details
}
```

### 2. File Cleanup (server/utils/fileCleanup.js)
```javascript
/**
 * Safely delete a file and handle errors
 * @param {string} filePath - Path to the file to delete
 * @returns {Promise<boolean>} True if deletion was successful
 */
async function safeDeleteFile(filePath) {
  // Implementation details
}
```

## Socket Events

### Client to Server:
- `admin:login` - { password: string }
- `admin:deleteMessage` - { messageId: string }
- `admin:kickUser` - { userId: string }

### Server to Client:
- `admin:loginSuccess` - { success: boolean }
- `admin:messageDeleted` - { messageId: string }
- `admin:userKicked` - { userId: string }

## State Management Flow
1. Admin logs in via modal
2. Server verifies credentials and establishes admin session
3. Admin UI elements become visible
4. On message deletion:
   - Show confirmation modal
   - If confirmed, send delete request
   - Server deletes message and associated files
   - Update all clients
5. On user kick:
   - Send kick request
   - Server disconnects user
   - Update user list for all clients

## Overview
This document outlines the plan for implementing admin functionality in the chat application, including message deletion and user management.

## Core Features

### 1. Admin Authentication
- Add admin password to server environment variables
- Create admin login UI (shield icon in top-right)
- Store admin status in localStorage
- Auto-logout after session expiration

### 2. Message Deletion
- Add delete button to messages (visible to admins only)
- Confirmation modal before deletion
- Clean up associated files (audio/images)
- Real-time sync across all clients

### 3. User Management
- Kick users (disconnect socket)
- View connected users
- User activity monitoring

## Technical Implementation

### Backend (server.js)
1. **Environment Variables**
   ```
   ADMIN_PASSWORD=your_secure_password_here
   ADMIN_SESSION_TIMEOUT=3600  // 1 hour
   ```

2. **New Socket Events**
   - `admin:login` - Verify admin credentials
   - `admin:deleteMessage` - Delete message and clean up files
   - `admin:kickUser` - Disconnect a user

3. **File Cleanup**
   - Add function to safely remove files
   - Handle errors if file deletion fails
   - Log all admin actions

### Frontend
1. **Admin UI Components**
   - AdminLoginModal
   - DeleteConfirmationModal
   - AdminControls (floating action button)

2. **State Management**
   - Add admin state to React context
   - Handle admin login/logout
   - Show/hide admin controls

## Security Considerations
- Rate limit admin login attempts
- Use secure password hashing
- Log all admin actions
- Validate all admin requests on the server

## Testing Plan
1. Test admin login/logout
2. Test message deletion with different content types
3. Test error handling (failed file deletion, etc.)
4. Test real-time sync across clients

## Future Enhancements
- Admin dashboard with usage statistics
- Message moderation queue
- User roles and permissions
- Automated cleanup of old files

## Rollback Plan
1. Keep backup of server.js before changes
2. Test in development environment first
3. Deploy to staging for testing
4. Monitor logs after production deployment
