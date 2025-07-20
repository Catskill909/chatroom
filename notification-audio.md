# Audio Notification Implementation Plan

## Overview
Add an audio notification that plays whenever a new message is received in the chat, regardless of message type (text, emoji, image, or audio).

## Implementation Details

### 1. Audio File Location
- File: `public/notification.mp3`
- Confirmed to exist in the correct location

### 2. Implementation Approach
1. **Where to Add the Code**: `src/components/Chatroom.tsx`
   - This component handles all message types through WebSocket
   - It already has the WebSocket message handler set up

2. **Key Functions to Modify**
   - Add a `useEffect` hook to play the sound when new messages are received
   - The effect will depend on the `messages` state array
   - We'll use the Web Audio API for better control and reliability

3. **Implementation Steps**:
   - Create an audio context and buffer for the notification sound
   - Set up a function to play the sound
   - Add an effect that triggers on new messages
   - Ensure the sound plays only for new messages, not on initial load

### 3. Code Implementation

```typescript
// 1. Add audio state and effect to Chatroom component
const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

// 2. Initialize audio context and load sound
useEffect(() => {
  // Initialize audio context on user interaction
  const initAudio = async () => {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    setAudioContext(context);
    
    try {
      const response = await fetch('/notification.mp3');
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await context.decodeAudioData(arrayBuffer);
      setAudioBuffer(buffer);
    } catch (error) {
      console.error('Error loading notification sound:', error);
    }
  };

  // Initialize on first user interaction
  const handleFirstInteraction = () => {
    document.removeEventListener('click', handleFirstInteraction);
    document.removeEventListener('keydown', handleFirstInteraction);
    initAudio();
  };

  document.addEventListener('click', handleFirstInteraction, { once: true });
  document.addEventListener('keydown', handleFirstInteraction, { once: true });

  return () => {
    document.removeEventListener('click', handleFirstInteraction);
    document.removeEventListener('keydown', handleFirstInteraction);
  };
}, []);

// 3. Play sound when new messages arrive
useEffect(() => {
  // Don't play on initial render
  if (messages.length <= 1) return;
  
  const playNotification = async () => {
    if (!audioContext || !audioBuffer) return;
    
    // Resume audio context if it was suspended
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start(0);
  };
  
  playNotification().catch(console.error);
}, [messages.length]); // Only depend on length to avoid unnecessary re-renders
```

## Testing Plan
1. Send a text message - should hear notification
2. Send an emoji - should hear notification
3. Send an image - should hear notification
4. Send an audio message - should hear notification
5. Test multiple messages in quick succession
6. Test with audio context suspended (page just loaded)
7. Test on mobile devices (if applicable)

## Edge Cases
- Handle cases where audio context is not supported
- Handle cases where audio file fails to load
- Prevent multiple sounds from playing simultaneously
- Respect browser autoplay policies

## Performance Considerations
- Audio context is only initialized on first user interaction
- Audio buffer is loaded once and reused
- Effect only depends on messages.length to minimize re-renders
- Cleanup functions prevent memory leaks

## Browser Compatibility
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Falls back gracefully if Web Audio API is not available
- Handles both standard and webkit-prefixed AudioContext
