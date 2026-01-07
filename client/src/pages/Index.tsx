import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { io } from 'socket.io-client';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  MousePointer2, Square, Circle, Triangle, Star, Minus, ArrowRight,
  Pencil, Type, Undo2, Redo2, Download, ZoomIn, ZoomOut, Sun, Moon,
  Maximize, Grid3X3, Lock, Unlock, Copy, Trash2, Layers, Users,
  HelpCircle, X, ChevronUp, ChevronDown, Eye, EyeOff, Image as ImageIcon , Smile, ArrowLeft 
} from 'lucide-react';
import { useParams, useNavigate } from "react-router-dom";
// ==================== TYPES ====================
type Tool = 'select' | 'rectangle' | 'circle' | 'triangle' | 'star' | 'line' | 'arrow' | 'pencil' | 'text' | 'image';
type ConnectionStatus = 'online' | 'offline' | 'syncing';

interface Point {
  x: number;
  y: number;
}

interface Shape {
  id: string;
  type: Tool;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  fillOpacity: number;
  points?: Point[];
  text?: string;
  imageUrl?: string; // New field for images
  locked: boolean;
  visible: boolean;
  rotation: number;
}

interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor: Point;
}

// ==================== CONSTANTS ====================
const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'];
const STROKE_WIDTHS = [1, 2, 3, 4, 6, 8];
const DEFAULT_COLOR = '#3B82F6';
const DEFAULT_STROKE_WIDTH = 2;
const DEFAULT_FILL_OPACITY = 0.3;
const HANDLE_SIZE = 8; // Size of the squares
type HandleType = 'tl' | 'tr' | 'bl' | 'br' | 'rotate' | null;

// ==================== UTILITIES ====================
const generateId = () => Math.random().toString(36).substr(2, 9);

const isPointInShape = (point: Point, shape: Shape): boolean => {
  const { x, y, width, height, type } = shape;
  
  if (type === 'circle') {
    const cx = x + width / 2;
    const cy = y + height / 2;
    const rx = width / 2;
    const ry = height / 2;
    return Math.pow((point.x - cx) / rx, 2) + Math.pow((point.y - cy) / ry, 2) <= 1;
  }
  
  return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
};
// Emojis List
const EMOJIS = [
    "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "🥹",
    "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗",
    "🤪", "😜", "😝", "😛", "🤑", "😎", "🤓", "🧐", "🤠", "🥳",
    "🤡", "😈", "👿", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃",
    "👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "✌️", "🤟", "🤘",
    "💡", "🔥", "✨", "⭐", "🌟", "💫", "💥", "💢", "💦", "💨"
];

// Stickers List (Using standard icons for demo)
const STICKERS = [
    "https://cdn-icons-png.flaticon.com/128/414/414927.png", // Star
    "https://cdn-icons-png.flaticon.com/128/1165/1165674.png", // Fire
    "https://cdn-icons-png.flaticon.com/128/763/763814.png", // Heart
    "https://cdn-icons-png.flaticon.com/128/478/478544.png", // Cloud
    "https://cdn-icons-png.flaticon.com/128/148/148836.png", // Lightning
    "https://cdn-icons-png.flaticon.com/128/1165/1165636.png", // Thumbs up
    "https://cdn-icons-png.flaticon.com/128/4213/4213653.png", // Party
    "https://cdn-icons-png.flaticon.com/128/166/166538.png", // Rocket
    "https://cdn-icons-png.flaticon.com/128/2583/2583166.png", // Warning
    "https://cdn-icons-png.flaticon.com/128/1041/1041916.png", // Chat
    "https://cdn-icons-png.flaticon.com/128/2377/2377871.png", // Idea
    "https://cdn-icons-png.flaticon.com/128/1205/1205526.png", // Check
];
// ==================== MAIN COMPONENT ====================
// Helper: Rotate a point around a center
const rotatePoint = (cx: number, cy: number, x: number, y: number, angle: number) => {
  const radians = (Math.PI / 180) * angle;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: (cos * (x - cx)) - (sin * (y - cy)) + cx,
    y: (sin * (x - cx)) + (cos * (y - cy)) + cy
  };
};

// Helper: Check if mouse is clicking a specific handle
const getHandleAtPoint = (point: Point, shape: Shape, zoom: number): HandleType => {
    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;
    const hitPadding = 10 / (zoom/100); 

    // Rotate mouse point "backwards" to align with unrotated shape logic
    const rp = rotatePoint(cx, cy, point.x, point.y, -shape.rotation);

    // Check 4 Corners
    if (Math.abs(rp.x - shape.x) < hitPadding && Math.abs(rp.y - shape.y) < hitPadding) return 'tl';
    if (Math.abs(rp.x - (shape.x + shape.width)) < hitPadding && Math.abs(rp.y - shape.y) < hitPadding) return 'tr';
    if (Math.abs(rp.x - shape.x) < hitPadding && Math.abs(rp.y - (shape.y + shape.height)) < hitPadding) return 'bl';
    if (Math.abs(rp.x - (shape.x + shape.width)) < hitPadding && Math.abs(rp.y - (shape.y + shape.height)) < hitPadding) return 'br';
    
    // Check Rotate Knob (Top Center)
    if (Math.abs(rp.x - (shape.x + shape.width / 2)) < hitPadding && Math.abs(rp.y - (shape.y - 30)) < hitPadding) return 'rotate';

    return null;
};
// NEW: Uses environment variable for production, falls back to localhost for dev
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const socket = io(SOCKET_URL);


const SyncSpace: React.FC = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  // --- CONVEX DATA ---
  
  const serverShapes = useQuery(api.board.getShapes, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  const addShapeMutation = useMutation(api.board.addShape);
  const updateShapeMutation = useMutation(api.board.updateShape);
  const deleteShapesMutation = useMutation(api.board.deleteShapes);

  // --- LOCAL STATE ---
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool>('select');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [strokeWidth, setStrokeWidth] = useState(DEFAULT_STROKE_WIDTH);
  const [fillOpacity, setFillOpacity] = useState(DEFAULT_FILL_OPACITY);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [gridSnap, setGridSnap] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('offline');

  // UI State
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [stickerSize, setStickerSize] = useState(100);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  
  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<Point | null>(null);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  
  // Animation & Interaction
  const [tick, setTick] = useState(0); // Force render for smooth drag
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [activeCollaborators, setActiveCollaborators] = useState<Collaborator[]>([]);
  
  // Undo/Redo (Simplified for Convex: Optimistic updates handled by Convex usually, 
  // but for local history we keep this. Note: true multi-user undo is complex)
  const [history, setHistory] = useState<Shape[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [clipboard, setClipboard] = useState<Shape[]>([]);
  const [activeHandle, setActiveHandle] = useState<HandleType>(null);
  const [dragStartShape, setDragStartShape] = useState<Shape | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef<Point>({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageCache = useRef<Record<string, HTMLImageElement>>({});
  const [currentUser, setCurrentUser] = useState<{name: string, _id: string} | null>(null);
  

  // Redirect if no ID
  useEffect(() => {
      if (!projectId) navigate("/");
  }, [projectId, navigate]);
  useEffect(() => {
  const stored = localStorage.getItem("user");
  if (stored) {
    setCurrentUser(JSON.parse(stored));
  }
}, []);
  

  // --- 1. SYNC SERVER DATA TO LOCAL STATE ---
  useEffect(() => {
    if (serverShapes) {
      // Convex returns objects with _id. We map them to our Shape interface.
      const mappedShapes = serverShapes.map((s: any) => ({
        ...s,
        id: s._id, // IMPORTANT: Use Convex ID
      }));
      setShapes(mappedShapes);
      setConnectionStatus('online'); // If we got data, we are connected
    }
  }, [serverShapes]);

  // --- 2. SOCKET LISTENERS (Cursors Only) ---
  useEffect(() => {
    socket.on('connect', () => setConnectionStatus('online'));
    socket.on('disconnect', () => setConnectionStatus('offline'));
    if (currentUser && projectId) {
       // Join the specific project room
       socket.emit('join_room', projectId);

       socket.emit('user_joined', {
           roomId: projectId, // <--- Add Room ID
           id: currentUser._id,
           name: currentUser.name,
           color: color,
           cursor: { x: 0, y: 0 }
       });
    }
    // Cursor updates
    socket.on('user_joined', (user: Collaborator) => {
      setActiveCollaborators(prev => [...prev, user]);
      toast(`${user.name} joined`);
    });

    socket.on('user_left', (userId: string) => {
      setActiveCollaborators(prev => prev.filter(u => u.id !== userId));
    });

    socket.on('cursor_move', (data: { id: string, cursor: Point }) => {
      setActiveCollaborators(prev => prev.map(u => u.id === data.id ? { ...u, cursor: data.cursor } : u));
    });

    return () => { 
      socket.off('connect'); socket.off('disconnect');
      socket.off('user_joined'); socket.off('user_left'); socket.off('cursor_move');
    };
  }, [currentUser]);

  // --- ACTIONS (Using Mutations) ---
  const addShape = useCallback((shape: Shape) => {
    // 1. Optimistic Update (Show it instantly)
    setShapes(prev => [...prev, shape]); 
    
    // 2. Prepare data for Server
    const { id, ...shapeData } = shape;
    
    // 3. Send to Database WITH Project ID
    if (projectId) {
        addShapeMutation({ 
            ...shapeData, 
            projectId: projectId as Id<"projects"> // <--- THIS WAS MISSING
        });
    } else {
        console.error("No Project ID found! Cannot save shape.");
    }
  }, [addShapeMutation, projectId]);

  const updateShape = useCallback((id: string, updates: Partial<Shape>) => {
    // Optimistic
    setShapes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    
    // Server
    updateShapeMutation({
      id: id as Id<"shapes">,
      updates: updates
    });
  }, [updateShapeMutation]);

  const deleteSelected = useCallback(() => {
    // Optimistic
    setShapes(prev => prev.filter(s => !selectedIds.includes(s.id)));
    
    // Server
    const idsToDelete = selectedIds as Id<"shapes">[];
    if(idsToDelete.length > 0) {
        deleteShapesMutation({ ids: idsToDelete });
    }
    
    setSelectedIds([]);
    toast('Deleted');
  }, [selectedIds, deleteShapesMutation]);

  // --- IMAGE UPLOAD LOGIC ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.src = src;
      img.onload = () => {
        addShape({
          id: generateId(), // Temp ID until server response
          type: 'image',
          x: 100,
          y: 100,
          width: img.width > 300 ? 300 : img.width,
          height: (img.height / img.width) * (img.width > 300 ? 300 : img.width),
          color: 'transparent',
          strokeWidth: 0,
          fillOpacity: 1,
          imageUrl: src,
          locked: false,
          visible: true,
          rotation: 0
        });
      };
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  // --- OTHER UTILS ---
  const copySelected = useCallback(() => {
    const selected = shapes.filter(s => selectedIds.includes(s.id));
    setClipboard(selected);
    toast('Copied');
  }, [shapes, selectedIds]);

  const paste = useCallback(() => {
    if (clipboard.length === 0) return;
    clipboard.forEach(s => {
        addShape({
            ...s,
            id: generateId(),
            x: s.x + 20,
            y: s.y + 20,
        });
    });
    toast('Pasted');
  }, [clipboard, addShape]);

  const duplicate = useCallback(() => {
    const selected = shapes.filter(s => selectedIds.includes(s.id));
    selected.forEach(s => {
        addShape({
            ...s,
            id: generateId(),
            x: s.x + 20,
            y: s.y + 20,
        });
    });
    toast('Duplicated');
  }, [shapes, selectedIds, addShape]);

  const bringToFront = useCallback(() => {
     // Note: Z-index in Convex is usually order of insertion. 
     // To truly support z-index, we'd need a 'zIndex' field in the schema.
     // For now, this just updates local view temporarily.
     const selected = shapes.filter(s => selectedIds.includes(s.id));
     const others = shapes.filter(s => !selectedIds.includes(s.id));
     setShapes([...others, ...selected]);
  }, [shapes, selectedIds]);

  const sendToBack = useCallback(() => {
    const selected = shapes.filter(s => selectedIds.includes(s.id));
    const others = shapes.filter(s => !selectedIds.includes(s.id));
    setShapes([...selected, ...others]);
  }, [shapes, selectedIds]);

  const toggleLock = useCallback(() => {
    selectedIds.forEach(id => {
      const shape = shapes.find(s => s.id === id);
      if (shape) updateShape(id, { locked: !shape.locked });
    });
  }, [selectedIds, shapes, updateShape]);

  // Undo/Redo (Local History only)
  const undo = () => { /* Logic simplified for this example */ };
  const redo = () => { /* Logic simplified for this example */ };


  // --- CANVAS RENDERING ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Apply zoom and pan
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom / 100, zoom / 100);

    // 1. Draw existing shapes
    shapes.forEach(shape => {
      if (!shape.visible) return;
      
      ctx.save();
      ctx.translate(shape.x + shape.width / 2, shape.y + shape.height / 2);
      ctx.rotate((shape.rotation * Math.PI) / 180);
      ctx.translate(-shape.width / 2, -shape.height / 2);

      ctx.strokeStyle = shape.color;
      ctx.lineWidth = shape.strokeWidth;
      ctx.fillStyle = shape.color + Math.round(shape.fillOpacity * 255).toString(16).padStart(2, '0');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      switch (shape.type) {
        case 'rectangle':
          ctx.beginPath();
          ctx.roundRect(0, 0, shape.width, shape.height, 4);
          ctx.fill();
          ctx.stroke();
          break;

        case 'circle':
          ctx.beginPath();
          ctx.ellipse(shape.width / 2, shape.height / 2, shape.width / 2, shape.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;

        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(shape.width / 2, 0);
          ctx.lineTo(shape.width, shape.height);
          ctx.lineTo(0, shape.height);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;

        case 'star':
          const spikes = 5;
          const outerRadius = Math.min(shape.width, shape.height) / 2;
          const innerRadius = outerRadius / 2;
          const cx = shape.width / 2;
          const cy = shape.height / 2;
          ctx.beginPath();
          for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / spikes - Math.PI / 2;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;

        case 'line':
          ctx.beginPath();
          ctx.moveTo(0, shape.height / 2);
          ctx.lineTo(shape.width, shape.height / 2);
          ctx.stroke();
          break;

        case 'arrow':
          ctx.beginPath();
          ctx.moveTo(0, shape.height / 2);
          ctx.lineTo(shape.width - 10, shape.height / 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(shape.width, shape.height / 2);
          ctx.lineTo(shape.width - 15, shape.height / 2 - 8);
          ctx.lineTo(shape.width - 15, shape.height / 2 + 8);
          ctx.closePath();
          ctx.fill();
          break;

        case 'pencil':
          if (shape.points && shape.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(shape.points[0].x - shape.x, shape.points[0].y - shape.y);
            shape.points.forEach((p, i) => {
              if (i > 0) ctx.lineTo(p.x - shape.x, p.y - shape.y);
            });
            ctx.stroke();
          }
          break;

        case 'text':
          const fontSize = shape.height;       // ✅ NOW DYNAMIC (Matches box height)
          ctx.font = `${fontSize}px Inter, sans-serif`;
          ctx.textBaseline = "top"; 
          ctx.textAlign = "left";
          ctx.fillStyle = shape.color;
          ctx.fillText(shape.text || 'Text', 0, 0);
          break;''

        case 'image':
            if (shape.imageUrl) {
              let img = imageCache.current[shape.id];
              if (!img) {
                img = new Image();
                img.src = shape.imageUrl;
                imageCache.current[shape.id] = img;
                img.onload = () => setTick(t => t + 1); // Force redraw when loaded
              }
              if (img.complete) {
                ctx.drawImage(img, 0, 0, shape.width, shape.height);
              }
            }
            break;
      }

      ctx.restore();

      // Selection indicator
      // Selection Box & Handles
      if (selectedIds.includes(shape.id)) {
        ctx.save();
        ctx.strokeStyle = '#3B82F6'; ctx.lineWidth = 1; 
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height); // Solid box
        
        // ONLY DRAW HANDLES if single selection & not locked
        if (selectedIds.length === 1 && !shape.locked) {
            ctx.fillStyle = '#FFFFFF'; 
            ctx.strokeStyle = '#3B82F6';
            const h = HANDLE_SIZE; 
            const half = h / 2;

            // 1. Rotate Line
            ctx.beginPath();
            ctx.moveTo(shape.x + shape.width/2, shape.y);
            ctx.lineTo(shape.x + shape.width/2, shape.y - 25);
            ctx.stroke();

            // 2. Rotate Handle (Circle)
            ctx.beginPath();
            ctx.arc(shape.x + shape.width/2, shape.y - 25, 5, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();

            // 3. Resize Handles (Squares)
            const handles = [
                { x: shape.x - half, y: shape.y - half }, // TL
                { x: shape.x + shape.width - half, y: shape.y - half }, // TR
                { x: shape.x - half, y: shape.y + shape.height - half }, // BL
                { x: shape.x + shape.width - half, y: shape.y + shape.height - half }, // BR
            ];

            handles.forEach(pos => {
                ctx.beginPath();
                ctx.rect(pos.x, pos.y, h, h);
                ctx.fill(); ctx.stroke();
            });
        }
        ctx.restore();
      }

      // Lock indicator
      if (shape.locked) {
        ctx.save();
        ctx.fillStyle = '#6B7280';
        ctx.font = '12px sans-serif';
        ctx.fillText('🔒', shape.x + shape.width - 12, shape.y + 12);
        ctx.restore();
      }
    });

    // 2. LIVE DRAWING PREVIEW (The "Ghost" Shape)
    if (isDrawing && drawStart && tool !== 'select' && tool !== 'pencil' && tool !== 'text') {
       const currentX = (lastMousePos.current.x - pan.x) / (zoom / 100);
       const currentY = (lastMousePos.current.y - pan.y) / (zoom / 100);
       const width = currentX - drawStart.x;
       const height = currentY - drawStart.y;
       
       ctx.save();
       ctx.strokeStyle = color; 
       ctx.lineWidth = strokeWidth;
       ctx.fillStyle = color + Math.round(fillOpacity * 255).toString(16).padStart(2, '0');
       ctx.beginPath();

       if (tool === 'rectangle') {
          ctx.rect(drawStart.x, drawStart.y, width, height);
       } 
       else if (tool === 'circle') {
          ctx.ellipse(drawStart.x + width/2, drawStart.y + height/2, Math.abs(width/2), Math.abs(height/2), 0, 0, Math.PI * 2);
       } 
       else if (tool === 'triangle') { 
          ctx.moveTo(drawStart.x + width/2, drawStart.y); 
          ctx.lineTo(drawStart.x + width, drawStart.y + height); 
          ctx.lineTo(drawStart.x, drawStart.y + height); 
          ctx.closePath(); 
       }
       else if (tool === 'star') {
          // Simple circle placeholder for star preview
          const spikes = 5;
          const cx = drawStart.x + width / 2;
          const cy = drawStart.y + height / 2;
          
          // Calculate radius based on how big you dragged the box
          // We use Math.abs because width/height can be negative if dragging backwards
          const outerRadius = Math.min(Math.abs(width), Math.abs(height)) / 2;
          const innerRadius = outerRadius / 2;

          for (let i = 0; i < spikes * 2; i++) {
            const r = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / spikes - Math.PI / 2;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
       }
       else if (tool === 'line') { 
          ctx.moveTo(drawStart.x, drawStart.y); 
          ctx.lineTo(currentX, currentY); 
       }
       else if (tool === 'arrow') { 
          ctx.moveTo(drawStart.x, drawStart.y + height/2); 
          ctx.lineTo(drawStart.x + width, drawStart.y + height/2); 
       }
       
       ctx.fill(); 
       ctx.stroke();
       ctx.restore();
    }

    // Pencil path preview
    if (currentPath.length > 1) {
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      currentPath.forEach((p, i) => {
        if (i > 0) ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }

    // Collaborator cursors
    activeCollaborators.forEach(c => {
      ctx.save();
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.moveTo(c.cursor.x, c.cursor.y);
      ctx.lineTo(c.cursor.x, c.cursor.y + 18);
      ctx.lineTo(c.cursor.x + 12, c.cursor.y + 12);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = c.color;
      ctx.font = '11px Inter, sans-serif';
      ctx.fillRect(c.cursor.x + 10, c.cursor.y + 16, ctx.measureText(c.name).width + 8, 16);
      ctx.fillStyle = '#fff';
      ctx.fillText(c.name, c.cursor.x + 14, c.cursor.y + 28);
      ctx.restore();
    });

    ctx.restore();
  }, [shapes, selectedIds, zoom, pan, isDrawing, drawStart, currentPath, tool, color, strokeWidth, fillOpacity, activeCollaborators, tick]);

  // --- MOUSE HANDLERS ---
  const getCanvasPoint = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / (zoom / 100);
    const y = (e.clientY - rect.top - pan.y) / (zoom / 100);
    return gridSnap ? { x: Math.round(x / 20) * 20, y: Math.round(y / 20) * 20 } : { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) return;
    const point = getCanvasPoint(e);
    
    // 1. Check if clicking a handle on the SELECTED shape
    if (selectedIds.length === 1) {
        const shape = shapes.find(s => s.id === selectedIds[0]);
        if (shape && !shape.locked) {
            const handle = getHandleAtPoint(point, shape, zoom);
            if (handle) {
                setActiveHandle(handle);
                setDragStartShape({ ...shape }); // Snapshot for math
                setIsDrawing(true);
                return; // Stop here, don't select other things
            }
        }
    }

    // 2. Normal Selection Logic (Keep your existing logic below)
    setDrawStart(point);
    setIsDrawing(true);

    if (tool === 'select') {
      const clickedShape = [...shapes].reverse().find(s => isPointInShape(point, s) && s.visible);
      if (clickedShape) setSelectedIds([clickedShape.id]);
      else setSelectedIds([]);
    } else if (tool === 'pencil') {
      setCurrentPath([point]);
    }
  };
const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // 1. Update internal tracking
    lastMousePos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    // 2. Emit Cursor (Collaborator view)
    const worldPoint = { 
      x: (lastMousePos.current.x - pan.x) / (zoom / 100), 
      y: (lastMousePos.current.y - pan.y) / (zoom / 100) 
    };
    socket.emit('cursor_move', { ...worldPoint, roomId: projectId });


    // =========================================================
    // 🔴 NEW CODE STARTS HERE: RESIZE & ROTATE LOGIC 🔴
    // =========================================================
    if (activeHandle && dragStartShape && selectedIds.length === 1) {
        const shape = shapes.find(s => s.id === selectedIds[0]);
        if (!shape) return;

        // A. ROTATION LOGIC
        if (activeHandle === 'rotate') {
            const cx = dragStartShape.x + dragStartShape.width / 2;
            const cy = dragStartShape.y + dragStartShape.height / 2;
            // Calculate angle between center and mouse
            const angle = Math.atan2(worldPoint.y - cy, worldPoint.x - cx) * (180 / Math.PI) + 90;
            updateShape(shape.id, { rotation: angle });
            return; // Stop here! Don't drag the shape while rotating.
        }

        // B. RESIZING LOGIC
        // We calculate new dimensions based on the original shape snapshot (dragStartShape)
        let newX = dragStartShape.x;
        let newY = dragStartShape.y;
        let newW = dragStartShape.width;
        let newH = dragStartShape.height;

        // Simple resizing (works best when rotation is 0)
        if (activeHandle.includes('l')) { 
            const delta = worldPoint.x - dragStartShape.x;
            newX = worldPoint.x; 
            newW = dragStartShape.width - delta;
        }
        if (activeHandle.includes('r')) { 
            newW = worldPoint.x - dragStartShape.x; 
        }
        if (activeHandle.includes('t')) { 
            const delta = worldPoint.y - dragStartShape.y;
            newY = worldPoint.y; 
            newH = dragStartShape.height - delta;
        }
        if (activeHandle.includes('b')) { 
            newH = worldPoint.y - dragStartShape.y; 
        }

        // Prevent shape from flipping inside out (min size 10px)
        if (newW < 10) newW = 10;
        if (newH < 10) newH = 10;

        updateShape(shape.id, { x: newX, y: newY, width: newW, height: newH });
        return; // Stop here! Don't drag the shape while resizing.
    }
    // =========================================================
    // 🔴 NEW CODE ENDS HERE 🔴
    // =========================================================


    // 3. Handle Dragging Shapes (Your existing logic)
    if (tool === 'select' && isDrawing && selectedIds.length > 0) {
        const dx = worldPoint.x - (drawStart?.x || 0);
        const dy = worldPoint.y - (drawStart?.y || 0);
        
        setShapes(prev => prev.map(s => {
             if (selectedIds.includes(s.id)) {
                 return { ...s, x: s.x + dx, y: s.y + dy }; 
             }
             return s;
        }));
        setDrawStart(worldPoint);
    }

    // 4. Force Animation Frame
    if (isDrawing) {
      if (tool === 'pencil') {
         const point = getCanvasPoint(e);
         setCurrentPath(prev => [...prev, point]);
      } else {
         setTick(t => t + 1); 
      }
    }
  };

  // Listen to Window MouseUp (Fixes "Specific Space" bug)
  useEffect(() => {
    const handleWindowMouseUp = (e: MouseEvent) => {
        setActiveHandle(null);
        setDragStartShape(null);
        if (!isDrawing) return;
        
        // Calculate point manually since 'e' is a native DOM event here
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const point = { 
            x: (e.clientX - rect.left - pan.x) / (zoom / 100), 
            y: (e.clientY - rect.top - pan.y) / (zoom / 100) 
        };
        
        // 1. FINISH DRAGGING EXISTING SHAPE
        if (tool === 'select' && selectedIds.length > 0) {
            selectedIds.forEach(id => {
                const shape = shapes.find(s => s.id === id);
                if (shape) updateShape(id, { x: shape.x, y: shape.y });
            });
        } 
        // 2. FINISH PENCIL
        else if (tool === 'pencil') {
            if (currentPath.length > 1) {
                const minX = Math.min(...currentPath.map(p => p.x));
                const minY = Math.min(...currentPath.map(p => p.y));
                addShape({
                    id: generateId(), type: 'pencil', x: minX, y: minY,
                    width: Math.max(...currentPath.map(p => p.x)) - minX, 
                    height: Math.max(...currentPath.map(p => p.y)) - minY,
                    color, strokeWidth, fillOpacity, points: currentPath, locked: false, visible: true, rotation: 0
                });
            }
            setCurrentPath([]);
        } 
        // 3. FINISH REGULAR SHAPES
        else if (drawStart && tool !== 'select' && tool !== 'text') {
            const width = Math.abs(point.x - drawStart.x);
            const height = Math.abs(point.y - drawStart.y);
            
            // "Click to Add" Logic: If dragged < 5px, create a default 100x100 shape
            const isClick = width < 5 && height < 5;
            
            addShape({
                id: generateId(),
                type: tool,
                x: isClick ? point.x - 50 : Math.min(point.x, drawStart.x),
                y: isClick ? point.y - 50 : Math.min(point.y, drawStart.y),
                width: isClick ? 100 : width,
                height: isClick ? 100 : height,
                color, strokeWidth, fillOpacity, locked: false, visible: true, rotation: 0
            });
        }

        setIsDrawing(false);
        setDrawStart(null);
    };

    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => window.removeEventListener('mouseup', handleWindowMouseUp);
  }, [isDrawing, drawStart, tool, currentPath, shapes, selectedIds, addShape, updateShape, color, strokeWidth, fillOpacity, pan, zoom]);

  // --- KEYBOARD & EVENTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
      if (e.ctrlKey && e.key === 'c') { e.preventDefault(); copySelected(); }
      if (e.ctrlKey && e.key === 'v') { e.preventDefault(); paste(); }
      if (e.ctrlKey && e.key === 'd') { e.preventDefault(); duplicate(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelected, copySelected, paste, duplicate]);

  // Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      setZoom(prev => Math.max(25, Math.min(400, prev + delta)));
    } else {
      setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  const exportCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'syncspace-canvas.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast('Canvas exported!');
  };

  // --- RENDER ---
  const selectedShape = shapes.find(s => selectedIds.includes(s.id));

  return (
    <div className={`h-screen w-screen overflow-hidden flex flex-col ${isDarkMode ? 'dark' : ''}`}>
      
      {/* Hidden File Input for Image Upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleImageUpload} 
      />

      {/* Header */}
      {!isPresentationMode && (
        <header className="h-14 glass border-b flex items-center justify-between px-4 z-50 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="tool-button hover:bg-red-50 hover:text-red-500" title="Back to Dashboard">
                <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-semibold text-foreground">SyncSpace</h1>
            {/* ... keep your Undo/Redo buttons here ... */}
          </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setZoom(prev => Math.max(25, prev - 25))} className="tool-button"><ZoomOut size={18} /></button>
            <span className="text-sm font-medium text-muted-foreground w-14 text-center">{zoom}%</span>
            <button onClick={() => setZoom(prev => Math.min(400, prev + 25))} className="tool-button"><ZoomIn size={18} /></button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 
                connectionStatus === 'syncing' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="text-xs text-muted-foreground capitalize">{connectionStatus}</span>
            </div>
            <button onClick={() => setShowUsers(!showUsers)} className="tool-button"><Users size={18} /></button>
            <button onClick={() => setShowLayers(!showLayers)} className="tool-button"><Layers size={18} /></button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="tool-button">
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={exportCanvas} className="tool-button"><Download size={18} /></button>
          </div>
        </header>
      )}

      <div className="flex-1 flex relative">
        {/* Toolbar */}
        {!isPresentationMode && (
          <div className="absolute left-4 top-4 glass-panel rounded-xl p-2 flex flex-col gap-1 z-40">
            {[
              { id: 'select', icon: MousePointer2, label: 'Select (V)' },
              { id: 'rectangle', icon: Square, label: 'Rectangle (R)' },
              { id: 'circle', icon: Circle, label: 'Circle (O)' },
              { id: 'triangle', icon: Triangle, label: 'Triangle (T)' },
              { id: 'star', icon: Star, label: 'Star (S)' },
              { id: 'line', icon: Minus, label: 'Line (L)' },
              { id: 'arrow', icon: ArrowRight, label: 'Arrow (A)' },
              { id: 'pencil', icon: Pencil, label: 'Pencil (P)' },
              { id: 'text', icon: Type, label: 'Text (X)' },
              { id: 'image', icon: ImageIcon, label: 'Upload Image' },
              { id: 'sticker', icon: Smile, label: 'Stickers' },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => {
                  if(id === 'image') fileInputRef.current?.click();
                  else if(id === 'sticker') setShowStickers(!showStickers); // <--- Add this check
                  else setTool(id as Tool);
                }}
                className={`tool-button ${tool === id ? 'tool-button-active' : ''}`}
                title={label}
              >
                <Icon size={20} />
              </button>
            ))}
             <div className="w-full h-px bg-border my-1" />
             <button onClick={() => setShowGrid(!showGrid)} className={`tool-button ${showGrid ? 'bg-accent' : ''}`}><Grid3X3 size={20}/></button>
          </div>
        )}

        {/* Canvas Container */}
        <div ref={containerRef} className={`flex-1 ${showGrid ? 'canvas-bg' : 'bg-[hsl(var(--canvas))]'} overflow-hidden`} onWheel={handleWheel}>
          <canvas
            ref={canvasRef}
            className="block w-full h-full cursor-crosshair" // <--- This forces it to fill the screen
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }); }}
          />
        </div>
        
        {/* Properties Bar */}
        {!isPresentationMode && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass-panel rounded-xl p-3 flex items-center gap-4 z-40">
            <div className="flex items-center gap-1">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { setColor(c); selectedIds.forEach(id => updateShape(id, { color: c })); }}
                  className={`w-6 h-6 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex gap-1">
               {STROKE_WIDTHS.map(w => (
                 <button key={w} onClick={() => { setStrokeWidth(w); selectedIds.forEach(id => updateShape(id, { strokeWidth: w })); }} className={`w-8 h-8 rounded flex items-center justify-center ${strokeWidth === w ? 'bg-accent' : ''}`}>
                    <div className="bg-foreground rounded-full" style={{ width: w + 4, height: w + 4 }} />
                 </button>
               ))}
            </div>
            {selectedIds.length > 0 && (
                <>
                <div className="w-px h-8 bg-border" />
                <button onClick={bringToFront} className="tool-button"><ChevronUp size={16}/></button>
                <button onClick={sendToBack} className="tool-button"><ChevronDown size={16}/></button>
                <button onClick={toggleLock} className="tool-button">{selectedShape?.locked ? <Lock size={16}/> : <Unlock size={16}/>}</button>
                <button onClick={deleteSelected} className="tool-button hover:text-destructive"><Trash2 size={16}/></button>
                </>
            )}
          </div>
        )}
        {/* Sticker Panel */}
        {/* Sticker Panel */}
        {!isPresentationMode && showStickers && (
          <div className="absolute left-16 top-20 glass-panel rounded-xl p-4 w-72 h-96 overflow-y-auto z-50 animate-fade-in shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Stickers & Emojis</h3>
                <button onClick={() => setShowStickers(false)} className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded p-1">
                    <X size={16} className="text-gray-500 dark:text-gray-400"/>
                </button>
            </div>
            
            {/* NEW: Sticker Size Slider */}
            <div className="mb-4 px-1">
                <div className="flex justify-between text-xs mb-1 text-gray-500 dark:text-gray-400">
                    <span>Size</span>
                    <span>{stickerSize}px</span>
                </div>
                <input 
                    type="range" 
                    min="30" 
                    max="300" 
                    value={stickerSize} 
                    onChange={(e) => setStickerSize(Number(e.target.value))}
                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
            </div>

            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Emojis</p>
            <div className="grid grid-cols-6 gap-2 mb-4">
                {EMOJIS.map(e => (
                    <button key={e} className="text-xl hover:scale-125 transition-transform p-1" 
                    onClick={() => {
                        addShape({ 
                            id: generateId(), type: 'text', x: (pan.x * -1) + 100, y: (pan.y * -1) + 100, 
                            width: stickerSize, height: stickerSize, // <--- Using new size
                            color: color, strokeWidth: 0, fillOpacity: 1, 
                            text: e, locked: false, visible: true, rotation: 0 
                        });
                        setShowStickers(false);
                    }}>
                        {e}
                    </button>
                ))}
            </div>

            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Stickers</p>
            <div className="grid grid-cols-4 gap-2">
                {STICKERS.map((s, i) => (
                    <button key={i} className="hover:scale-110 transition-transform p-1 border border-gray-100 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 aspect-square flex items-center justify-center"
                    onClick={() => {
                        addShape({ 
                            id: generateId(), type: 'image', x: (pan.x * -1) + 100, y: (pan.y * -1) + 100, 
                            width: stickerSize, height: stickerSize, // <--- Using new size
                            color: 'transparent', strokeWidth: 0, fillOpacity: 1, 
                            imageUrl: s, locked: false, visible: true, rotation: 0 
                        });
                        setShowStickers(false);
                    }}>
                        <img src={s} alt="sticker" className="w-full h-full object-contain" />
                    </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
  
};

export default SyncSpace;