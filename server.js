// server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Allow connections from anywhere (for now)
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  // Join a specific room (project)
  socket.on("join_room", (roomId) => {
    socket.join(roomId);
  });

  // Broadcast cursor movements to others in the room
  socket.on("cursor_move", (data) => {
    // data should look like: { roomId, x, y, id, name, color }
    socket.to(data.roomId).emit("cursor_move", data);
  });

  // Handle user joining
  socket.on("user_joined", (data) => {
    socket.to(data.roomId).emit("user_joined", data);
  });

  socket.on("disconnect", () => {
    // Optional: Notify others that user left
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});