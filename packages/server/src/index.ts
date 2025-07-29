import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic routes
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    message: 'Dou Dizhu Server is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req: Request, res: Response) => {
  res.json({ 
    server: 'Dou Dizhu API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Socket.IO connection handling
io.on('connection', (socket: Socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.emit('welcome', { 
    message: 'Connected to Dou Dizhu server',
    socketId: socket.id 
  });

  socket.on('disconnect', (reason: string) => {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler - Fixed for Express 5
app.use((req: Request, res: Response) => {
  res.status(404).json({ 
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Dou Dizhu server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready for connections`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}); 