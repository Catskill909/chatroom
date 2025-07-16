# Real-Time Chatroom

A robust, real-time group chatroom with custom avatar upload, built with React, TypeScript, Vite, shadcn-ui, and Tailwind CSS. All users see the same chat messages and user list in real time. Avatars are uploaded as base64 strings and shared across all clients.

## Features

- Real-time chat with instant message delivery
- Custom avatar upload and display for each user
- Image sharing in chat messages with automatic resizing
- User list with avatars
- Responsive UI with shadcn-ui and Tailwind CSS
- All state synchronized via backend events (no local-only state)
- Deep logging and error handling

## Image Upload

The chat supports image sharing with the following features:
- Click the image icon in the chat input to select an image
- Images are automatically resized and optimized
- Maximum file size: 5MB
- Supported formats: All standard image formats (JPEG, PNG, GIF, etc.)
- Images are displayed inline with chat messages

## Architecture

- **Frontend:** React + TypeScript, modular components for chat, user management, avatars, and input
- **Backend:** Node.js server (see `server.js`) manages users, messages, and avatar data in memory
- **Communication:** WebSockets for real-time updates

## Setup & Usage

### Prerequisites

- Node.js & npm installed ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))

### Local Development

```sh
# Clone the repository
git clone https://github.com/Catskill909/chatroom.git

# Navigate to the project directory
cd chatroom

# Install dependencies
npm install

# Start the backend server
node server.js

# In a separate terminal, start the frontend dev server
npm run dev
```

- Open your browser at `http://localhost:5173` (or the port shown in the terminal).

### Project Structure

- `src/components/` — React components for chatroom, messages, avatars, user modal, etc.
- `server.js` — Node.js backend for real-time communication and state management
- `plan.md` — Architecture plan and implementation notes

## Technologies Used

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Node.js (backend)

## Deployment

You can deploy this app to any Node.js-compatible host. For production, consider using services like Vercel, Netlify (frontend), and a Node.js host (backend).

## Further Reading

See [`plan.md`](plan.md:1) for a detailed architecture plan, implementation mandate, and troubleshooting notes.
