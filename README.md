# SyncSpace 🎨

**Real-Time Collaborative Whiteboard**

SyncSpace is a high-performance, real-time collaborative whiteboard application built with **React**, **TypeScript**, and **Convex**. It features an infinite canvas, live multi-user cursors, shape synchronization, and a custom-built rendering engine using the HTML5 Canvas API.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Convex](https://img.shields.io/badge/Convex-DB-orange?style=for-the-badge)
![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-black?style=for-the-badge&logo=socket.io&logoColor=white)

---

## 🚀 Features

### Core Whiteboard
- **Infinite Canvas:** Pan and zoom smoothly (25% to 400%).
- **Shape System:** Rectangles, Circles, Triangles, Stars, Lines, and Arrows.
- **Freehand Drawing:** High-performance pencil tool for sketching.
- **Smart Text:** Text boxes and Emojis that automatically scale font size when resized.
- **Image Support:** Drag-and-drop or upload images directly to the canvas.
- **Sticker Library:** Built-in emoji and sticker drawer with size controls.

### Advanced Manipulation
- **Selection Engine:** Click to select, drag to move.
- **Transformation:** Resize shapes with handles and rotate using the rotation knob.
- **Layering:** Bring to front / Send to back support.
- **Locking:** Lock shapes to prevent accidental edits.

### Real-Time Collaboration
- **Multiplayer Sync:** Shapes sync instantly across all connected clients via **Convex**.
- **Live Presence:** See other users' cursors moving in real-time (powered by **Socket.io**).
- **User Identity:** Collaborators have unique colors and nametags.

### UI/UX
- **Dark Mode:** Fully supported dark/light themes.
- **Responsive Design:** Floating toolbars that adapt to screen size.
- **Export:** Download your canvas as a high-quality PNG.
- **Custom Auth:** Secure Sign Up / Sign In system with persistent sessions.
- **Dashboard:** Manage multiple projects and create new rooms.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React (Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Notifications:** Sonner
- **Rendering:** HTML5 Canvas API (Custom Engine)

### Backend & Data
- **Database & Sync:** Convex (Backend-as-a-Service)
- **Ephemeral Real-Time:** Socket.io (Node.js server for cursor updates)

---

## ⚡ Getting Started

Follow these steps to run the project locally.

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### 1. Clone the Repository
```bash
git clone [https://github.com/yourusername/syncspace.git](https://github.com/yourusername/syncspace.git)
cd syncspace
npm install
npx convex dev
# Example command (adjust based on your actual server file location)
node server.js
npm run dev
```

📂 Project Structure

```
├── convex/             # Backend logic (Schema, Queries, Mutations)
├── src/
│   ├── components/     # UI Components
│   ├── pages/
│   │   ├── Auth.tsx        # Login/Signup logic
│   │   ├── Dashboard.tsx   # Project management
│   │   └── Index.tsx       # Main Whiteboard Logic (Canvas engine)
│   ├── App.tsx         # Routing & Protection
│   └── main.tsx        # Entry point
└── server.js           # Socket.io server for cursors

```
