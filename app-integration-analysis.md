# App Integration Analysis

## Overview
This document analyzes the current structure of the chat application and outlines how MongoDB integration will support existing features and future development. It provides specific references to the codebase and ties the new development direction to the current setup.

## Current App Structure
### 1. Real-Time Messaging
- **Code Reference**: `server.js`, lines 193-239
  - Messages are stored in an in-memory array (`let messages = [];`).
  - WebSocket handlers (`socket.on('message')`) broadcast messages to all clients.

### 2. Media Handling
- **Code Reference**: `server.js`, lines 33-101
  - Media files (audio and cover images) are uploaded to the `uploads` directory.
  - Multer is used for file storage with size limits and unique filenames.
  - Static routes serve uploaded files (`/uploads/audio`, `/uploads/cover`).

### 3. Link Previews
- **Code Reference**: `server.js`, lines 128-159
  - The `/api/link-preview` endpoint fetches rich previews for URLs shared in chat.
  - The `link-preview-js` library is used for fetching metadata.

### 4. Emoji Support
- **Code Reference**: `server.js`, lines 227-239
  - Messages can include emojis, which are handled as part of the `msg.content`.

### 5. User Management
- **Code Reference**: `server.js`, lines 211-288
  - Users are tracked in an in-memory object (`let users = {};`).
  - WebSocket handlers manage user connections, avatars, and online status.

## MongoDB Integration
### 1. Real-Time Messaging
- Replace the in-memory `messages` array with a MongoDB collection.
- **Schema Design**:
  ```javascript
  const MessageSchema = new mongoose.Schema({
      content: String,
      media: String,
      linkPreview: Object,
      emoji: String,
      timestamp: Date,
      userId: mongoose.Schema.Types.ObjectId,
  });
  const Message = mongoose.model('Message', MessageSchema);
  ```
- **Code Update**:
  - Modify `socket.on('message')` to store messages in MongoDB.
  - Fetch messages from MongoDB for `socket.emit('history')`.

### 2. Media Handling
- Store metadata for uploaded files in MongoDB.
- **Schema Design**:
  ```javascript
  const MediaSchema = new mongoose.Schema({
      filePath: String,
      fileType: String,
      timestamp: Date,
      userId: mongoose.Schema.Types.ObjectId,
  });
  const Media = mongoose.model('Media', MediaSchema);
  ```
- **Code Update**:
  - Update `/upload/audio` and `/upload/cover` endpoints to save metadata in MongoDB.
  - Use MongoDB to retrieve file metadata for serving static files.

### 3. Link Previews
- Store link preview data in MongoDB for caching and faster retrieval.
- **Schema Design**:
  ```javascript
  const LinkPreviewSchema = new mongoose.Schema({
      url: String,
      metadata: Object,
      timestamp: Date,
  });
  const LinkPreview = mongoose.model('LinkPreview', LinkPreviewSchema);
  ```
- **Code Update**:
  - Modify `/api/link-preview` to check MongoDB for cached previews before fetching new data.

### 4. Emoji Support
- Emojis are stored as part of the `content` field in the `Message` schema.
- No additional updates are required.

### 5. User Management
- Replace the in-memory `users` object with a MongoDB collection.
- **Schema Design**:
  ```javascript
  const UserSchema = new mongoose.Schema({
      username: String,
      avatar: String,
      isOnline: Boolean,
      lastActive: Date,
  });
  const User = mongoose.model('User', UserSchema);
  ```
- **Code Update**:
  - Modify WebSocket handlers to interact with MongoDB for user data.

## Future Features
### 1. Admin Controls
- **Feature**: Admins can delete messages, ban users, and manage chatrooms.
- **Schema Design**:
  - Add an `isAdmin` field to the `User` schema.
- **Code Update**:
  - Implement admin-specific WebSocket events for managing chatrooms.

### 2. Analytics
- **Feature**: Track user activity and message trends.
- **Schema Design**:
  - Add an `Analytics` schema to store aggregated data.
- **Code Update**:
  - Create a scheduled job to update analytics data in MongoDB.

## Conclusion
This document ties the MongoDB integration plan to the current app structure, providing specific code references and updates. By leveraging MongoDB, the app can support existing features and future development, ensuring scalability, persistence, and ease of maintenance.