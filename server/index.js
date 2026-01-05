const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Allow connections from your Lovable frontend
    methods: ["GET", "POST"]
  }
});

// --- IN-MEMORY DATABASE ---
// Matches your frontend 'Shape' interface
let shapes = []; 
// Store cursors: { socketId: { id, name, color, cursor: {x,y} } }
let collaborators = {}; 

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // 1. ASSIGN A COLOR & NAME TO NEW USER
  const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
  const userObj = {
    id: socket.id,
    name: `Guest ${socket.id.substr(0, 4)}`,
    color: randomColor,
    cursor: { x: 0, y: 0 }
  };
  collaborators[socket.id] = userObj;

  // 2. SEND INITIAL STATE
  // Send existing shapes and current users to the new person
  socket.emit('init_state', { 
    shapes, 
    collaborators: Object.values(collaborators) 
  });

  // Broadcast to others that a new user joined
  socket.broadcast.emit('user_joined', userObj);

  // --- 3. SHAPE EVENTS ---

  // When a user adds a shape (Rectangle, Pencil, Text, etc.)
  socket.on('shape_add', (newShape) => {
    shapes.push(newShape);
    // Broadcast to everyone ELSE
    socket.broadcast.emit('shape_add', newShape);
  });

  // When a user moves/resizes/colors a shape
  socket.on('shape_update', (data) => {
    const { id, updates } = data;
    // Update in memory
    const index = shapes.findIndex(s => s.id === id);
    if (index !== -1) {
      shapes[index] = { ...shapes[index], ...updates };
      // Broadcast update
      socket.broadcast.emit('shape_update', data);
    }
  });

  // When a user deletes
  socket.on('shape_delete', (ids) => {
    shapes = shapes.filter(s => !ids.includes(s.id));
    socket.broadcast.emit('shape_delete', ids);
  });

  // --- 4. CURSOR EVENTS ---
  socket.on('cursor_move', (pos) => {
    if (collaborators[socket.id]) {
      collaborators[socket.id].cursor = pos;
      // We emit this as a lightweight event
      socket.broadcast.emit('cursor_move', { 
        id: socket.id, 
        cursor: pos 
      });
    }
  });

  // --- 5. DISCONNECT ---
  socket.on('disconnect', () => {
    delete collaborators[socket.id];
    socket.broadcast.emit('user_left', socket.id);
    console.log('User Disconnected', socket.id);
  });
});

server.listen(3001, () => {
  console.log('SYNCSPACE SERVER RUNNING on port 3001');
});