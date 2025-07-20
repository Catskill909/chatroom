// Re-export all components
export * from './Chatroom.new';

// If you need to maintain backward compatibility with the old Chatroom
export { default as Chatroom } from './Chatroom.new';

// Export other components as needed
export * from './ChatInput';
export * from './ChatMessage';
// Add other component exports here
