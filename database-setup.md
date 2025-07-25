# Database Integration Plan

## Overview
This document outlines a step-by-step plan to integrate a database into the chat application, replacing the current in-memory storage for messages. The goal is to ensure scalability, persistence, and support for advanced features while maintaining all existing functionalities.

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

## Required Information for Integration
To integrate Supabase with the app, gather the following details from your Coolify setup:

1. **Supabase Project Details**:
   - API URL (e.g., `https://xyz.supabase.co`).
   - API Key (available in the Supabase dashboard).
   - Database connection string (e.g., `postgresql://username:password@host:port/database`).

2. **Database Schema**:
   - Table names and structures:
     - `messages`: Fields for `id`, `content`, `media`, `link_preview`, `emoji`, `timestamp`, `user_id`.
     - `users`: Fields for `id`, `username`, `avatar`, `status`.

3. **Environment Variables**:
   - Add the following to your `.env` file:
     ```
     SUPABASE_URL=https://xyz.supabase.co
     SUPABASE_KEY=your-api-key
     ```

4. **Deployment Configuration**:
   - Ensure the app connects to the live Supabase instance during production.
   - Use separate credentials for development and production environments.

## Backend Integration
#### Install Dependencies
1. Add `@supabase/supabase-js` to your project:
   ```
   npm install @supabase/supabase-js
   ```

#### Update `server.js`
1. Import Supabase and initialize the client:
   ```javascript
   import { createClient } from '@supabase/supabase-js';

   const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
   ```

2. Replace the in-memory `messages` array with Supabase integration:
   - Use Supabase's RESTful API or client library to fetch and store messages.
   - Update WebSocket handlers to interact with Supabase for real-time updates.

## Testing and Monitoring
- Test all features (media uploads, link previews, emojis) to ensure functionality.
- Validate database operations (CRUD) in both development and production environments.
- Set up monitoring for database performance.

## Conclusion
This checklist ensures a smooth integration of Supabase with the app, leveraging your Coolify setup for database management. By gathering the required details and following the outlined steps, you can maintain app functionality while enhancing scalability and persistence.