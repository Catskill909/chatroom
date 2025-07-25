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
To integrate Supabase with the app, gather the following details from your self-hosted Coolify setup:

### 1. API URL
- Use the provided URL: `https://supabase.supersoul.top`.

### 2. API Keys
Supabase requires two keys for integration:
- **Anon Key**: `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc0NzI1Njk0MCwiZXhwIjo0OTAyOTMwNTQwLCJyb2xlIjoiYW5vbiJ9.f1n8OsgkQEcT_SY8tln3izwzbTBAN1GBg_wSY-apHL0`
- **Service Key**: `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc0NzI1Njk0MCwiZXhwIjo0OTAyOTMwNTQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.O2zYp-Q9j7ri1rJvYmXWaSKdqg7xoDvhIqIUr0_sqH8`

### 3. Database Connection String
To retrieve the database connection string:
1. Log in to the Coolify dashboard.
2. Navigate to the Supabase service details.
3. Look for the database connection string, typically in the format:
   ```
   postgresql://username:password@host:port/database
   ```
4. If not visible, check the Supabase configuration files in your Coolify installation. Look for fields like `db_connection_string` or `DATABASE_URL`.

#### Using the Provided Configuration
Based on the provided Coolify configuration:
- The database connection string may be associated with the `rest-v1` service, which maps to `http://supabase-rest:3000/`.
- Check the `rest-v1` service details in Coolify for the exact connection string.
- The `rest-v1` service uses the `key-auth` plugin for authentication, which relies on the `SERVICE_SUPABASEANON_KEY` and `SERVICE_SUPABASESERVICE_KEY`.

### 4. Environment Variables
- Add the retrieved details to your `.env` file:
  ```
  SUPABASE_URL=https://supabase.supersoul.top
  SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc0NzI1Njk0MCwiZXhwIjo0OTAyOTMwNTQwLCJyb2xlIjoiYW5vbiJ9.f1n8OsgkQEcT_SY8tln3izwzbTBAN1GBg_wSY-apHL0
  SUPABASE_SERVICE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc0NzI1Njk0MCwiZXhwIjo0OTAyOTMwNTQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.O2zYp-Q9j7ri1rJvYmXWaSKdqg7xoDvhIqIUr0_sqH8
  SUPABASE_DB_CONNECTION=postgresql://username:password@host:port/database
  ```

## Testing Supabase Setup
Before integrating Supabase into the app, perform the following tests to ensure the setup is correct:

### 1. Database Connection Test
- Use a PostgreSQL client (e.g., `psql` or DBeaver) to connect to the database using the connection string.
- Verify that the connection is successful and the database is accessible.

### 2. API Key Validation
- Use a tool like `curl` or Postman to send a request to the Supabase REST API (`https://supabase.supersoul.top/rest/v1/`).
- Include the `SERVICE_SUPABASEANON_KEY` in the request header:
  ```
  Authorization: Bearer <SERVICE_SUPABASEANON_KEY>
  ```
- Verify that the API responds correctly.

### 3. Service Route Verification
- Check the `rest-v1` service route (`http://supabase-rest:3000/`) in Coolify.
- Ensure the route is active and accessible.

### 4. Role and ACL Validation
- Confirm that the `anon` and `service_role` consumers are correctly configured in the Coolify ACL.
- Verify that the `SERVICE_SUPABASEANON_KEY` and `SERVICE_SUPABASESERVICE_KEY` are associated with the correct roles.

### 5. Storage Service Test
- Test the `storage-v1` route (`http://supabase-storage:5000/`) to ensure file storage is functional.
- Verify that CORS is correctly configured for the storage service.

## Redeployment and Development Workflow
### Redeployment via Coolify
1. **Backup Live Data**:
   - Before redeployment, ensure the production database is backed up to prevent data loss.
   - Use PostgreSQL tools or Coolify's backup functionality.

2. **Pull Stored Messages**:
   - Configure the app to fetch stored messages from Supabase during startup.
   - Use Supabase's REST API or client library to retrieve messages.

3. **Environment Configuration**:
   - Ensure the `.env` file in the production environment contains the correct Supabase credentials and connection string.

4. **Testing Post-Redeployment**:
   - Verify that the app can fetch and display stored messages.
   - Test all features (media uploads, link previews, emojis) to ensure functionality.

### Development Workflow
1. **Local Development**:
   - Use a local PostgreSQL instance or mock data for testing.
   - Populate the local database with sample messages and media.

2. **Syncing with Production**:
   - Periodically sync the local database with production data for testing.
   - Use Supabase's export/import tools or custom scripts.

3. **Feature Testing**:
   - Test new features locally before deploying to production.
   - Validate database operations (CRUD) and real-time updates.

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

   const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
   ```

2. Replace the in-memory `messages` array with Supabase integration:
   - Use Supabase's RESTful API or client library to fetch and store messages.
   - Update WebSocket handlers to interact with Supabase for real-time updates.

## Conclusion
This checklist ensures a smooth integration of Supabase with the app, leveraging your Coolify setup for database management. By gathering the required details, performing the outlined tests, and following the integration steps, you can maintain app functionality while enhancing scalability and persistence.