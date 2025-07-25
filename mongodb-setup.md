# MongoDB Integration Plan

## Overview
This document outlines a step-by-step plan to integrate MongoDB into the chat application, replacing the current in-memory storage for messages. The goal is to ensure scalability, persistence, and support for advanced features while maintaining all existing functionalities. This plan is designed to make the app self-contained and suitable for open-source distribution.

## Current Features
1. **Real-Time Messaging**: Messages are delivered instantly via WebSockets.
2. **Media Handling**:
   - Audio uploads with metadata and cover art.
   - Image sharing with click-to-enlarge functionality.
3. **Link Previews**: Rich previews for URLs shared in chat.
4. **Emoji Support**: Messages can include emojis.
5. **User Management**: Custom avatars and online status tracking.

## Risks and Considerations
- **Feature Preservation**: Ensure no breakage of existing features.
- **Performance**: Maintain real-time responsiveness.
- **Deployment**: Ensure compatibility with Docker and Coolify.
- **Data Integrity**: Prevent data loss during migration.

## MongoDB Integration Steps

### 1. Initial Setup
#### Docker Configuration
- Create a Docker Compose file with separate services for the app and MongoDB.
- Use a Docker volume for MongoDB data to ensure persistence across deployments.
- Example configuration:
  ```yaml
  version: '3.8'
  services:
    app:
      build: .
      ports:
        - "3000:3000"
      volumes:
        - ./app:/app
      depends_on:
        - mongodb
    mongodb:
      image: mongo:latest
      ports:
        - "27017:27017"
      volumes:
        - mongodb_data:/data/db
  volumes:
    mongodb_data:
  ```

#### Environment Variables
- Add MongoDB connection details to the `.env` file:
  ```
  MONGO_URI=mongodb://localhost:27017/chatapp
  ```

### 2. Backend Integration
#### Install Dependencies
1. Add `mongoose` to your project:
   ```
   npm install mongoose
   ```

#### Update `server.js`
1. Import `mongoose` and connect to the database:
   ```javascript
   import mongoose from 'mongoose';

   mongoose.connect(process.env.MONGO_URI, {
       useNewUrlParser: true,
       useUnifiedTopology: true,
   }).then(() => {
       console.log('Connected to MongoDB');
   }).catch((err) => {
       console.error('MongoDB connection error:', err);
   });
   ```

2. Replace the in-memory `messages` array with a MongoDB collection:
   - Define a `Message` schema using `mongoose`.
   - Update WebSocket handlers to interact with the database for storing and retrieving messages.

### 3. Deployment Workflow
#### Initial Deployment
- Deploy the app and MongoDB containers using Docker Compose.
- Verify that the app connects to MongoDB and stores messages.

#### Incremental Updates
- Redeploy only the app container for code updates, keeping the MongoDB container and volume intact.

### 4. Testing
#### Database Connection Test
- Use a MongoDB client (e.g., Compass or Robo 3T) to connect to the database.
- Verify that the connection is successful and the database is accessible.

#### CRUD Operations
- Test create, read, update, and delete operations for messages and media metadata.

#### Real-Time Messaging
- Verify that messages are delivered instantly via WebSockets.

### 5. Open-Source Considerations
- Package the app and MongoDB configuration into a single Docker Compose file.
- Include detailed documentation for setup and deployment.
- Ensure the app is easy to install and run for contributors and users.

## Conclusion
This plan provides a robust and scalable solution for integrating MongoDB into the chat application. By leveraging Docker for deployment and MongoDB for storage, the app becomes self-contained and suitable for open-source distribution. This approach ensures persistence, scalability, and ease of use for developers and users alike.