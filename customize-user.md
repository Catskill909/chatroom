# User Customization Modal Implementation Plan

## Overview
This document outlines the implementation plan for adding a user settings modal that allows users to customize their avatar and notification preferences. The modal will be accessible via a gear icon on the user's own card in the online users list.

## Component Structure

### 1. UserSettingsModal Component
- **Location**: `/src/components/UserSettingsModal.tsx`
- **Purpose**: Main modal component for user settings
- **Props**:
  - `isOpen: boolean` - Controls modal visibility
  - `onClose: () => void` - Callback to close modal
  - `currentUser: string` - Current username
  - `currentAvatar: string | null` - Current avatar URL
  - `onAvatarChange: (avatar: string) => void` - Callback when avatar changes
  - `onNotificationToggle: (enabled: boolean) => void` - Callback for notification sound toggle
  - `notificationsEnabled: boolean` - Current notification sound state

### 2. UserCard Component (New)
- **Location**: `/src/components/UserCard.tsx`
- **Purpose**: Reusable card component for user display
- **Props**:
  - `user: ChatUser` - User data
  - `isCurrentUser: boolean` - Whether this is the current user
  - `onSettingsClick?: () => void` - Callback when settings gear is clicked

## State Management

### 1. Chatroom Component Updates
- Add new state variables:
  ```typescript
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  ```

### 2. User Data Structure Update
- Extend the `ChatUser` interface to include notification preferences:
  ```typescript
  export interface ChatUser {
    username: string;
    avatar?: string;
    isOnline: boolean;
    notificationsEnabled?: boolean;
  }
  ```

## UI/UX Design

### 1. Gear Icon
- **Location**: Right side of the current user's card
- **Appearance**:
  - Grayscale by default
  - Subtle color change on hover
  - 20x20px with proper padding
  - Uses Lucide React's `Settings` icon

### 2. Modal Design
- **Theme**: Dark mode to match existing UI
- **Sections**:
  1. **Header**: "Your Settings" with close button
  2. **Avatar Section**:
     - Current avatar display
     - Upload new avatar button
     - Avatar preview
  3. **Notifications Section**:
     - Toggle switch for notification sounds
     - Help text: "Enable/disable notification sounds when new messages arrive (does not affect audio messages in chat)"
  4. **Footer**: Close button

## Implementation Steps

1. **Create New Components**
   - Create `UserSettingsModal.tsx`
   - Create `UserCard.tsx` (optional but recommended for better organization)

2. **Update Existing Components**
   - Modify `UsersList.tsx` to use the new `UserCard` component
   - Update `Chatroom.tsx` to manage settings state

3. **Add Avatar Upload Functionality**
   - Implement file input with image validation
   - Add preview functionality
   - Handle image upload (if backend support is needed)

4. **Implement Notification Sound Toggle**
   - Connect toggle to notification sound state
   - Only affects the 'ding' sound for new messages
   - Does not affect playback of audio messages in chat
   - Persist preference in localStorage

5. **Styling**
   - Ensure dark theme consistency
   - Add smooth transitions and hover states
   - Make modal responsive

## Code Examples

### UserCard.tsx (simplified)
```tsx
interface UserCardProps {
  user: ChatUser;
  isCurrentUser: boolean;
  onSettingsClick?: () => void;
}

export const UserCard = ({ user, isCurrentUser, onSettingsClick }: UserCardProps) => (
  <div className={`flex items-center space-x-3 p-2 rounded-lg transition-colors hover:bg-accent ${
    isCurrentUser ? 'bg-chat-bubble-own' : ''
  }`}>
    {/* Existing avatar and username code */}
    {isCurrentUser && (
      <button 
        onClick={onSettingsClick}
        className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
        aria-label="User settings"
      >
        <Settings className="w-4 h-4" />
      </button>
    )}
  </div>
);
```

### UserSettingsModal.tsx (simplified)
```tsx
interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
  currentAvatar: string | null;
  onAvatarChange: (avatar: string) => void;
  notificationsEnabled: boolean;
  onNotificationToggle: (enabled: boolean) => void;
}

export const UserSettingsModal = ({
  isOpen,
  onClose,
  currentUser,
  currentAvatar,
  onAvatarChange,
  notificationsEnabled,
  onNotificationToggle
}: UserSettingsModalProps) => {
  // Modal implementation
};
```

## Integration Points

1. **Chatroom Component**
   - Import and use the new `UserSettingsModal`
   - Handle avatar updates and notification toggles
   - Manage modal open/close state

2. **UsersList Component**
   - Use the new `UserCard` component
   - Pass through the settings click handler

## Accessibility Considerations
- Add proper ARIA labels
- Ensure keyboard navigation works
- Add focus management for the modal
- Include proper contrast ratios

## Testing Plan
1. Test modal open/close functionality
2. Test avatar upload and preview
3. Test notification sound toggle (verify it only affects the 'ding' sound, not audio messages)
4. Verify mobile responsiveness
5. Test keyboard navigation

## Future Enhancements
1. Add more user preferences
2. Support for theme switching
3. Profile bio/status updates
4. Integration with backend for persistent settings
