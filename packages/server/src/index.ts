import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectMongoDB, connectRedis, checkDatabaseHealth, createMockDatabaseWarning } from './config/database';
import authRoutes from './routes/auth';
import roomRoutes from './routes/rooms';
import { SocketService } from './services/socketService';

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

// Initialize Redis connection (may be null in dev mode)
const redis = connectRedis();

// Initialize Socket.IO service
const socketService = new SocketService(io);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check with database status
app.get('/health', async (req: Request, res: Response) => {
  const health = await checkDatabaseHealth(redis);
  
  res.json({ 
    status: 'ok', 
    message: 'Dou Dizhu Server is running',
    timestamp: new Date().toISOString(),
    databases: health,
    connectedUsers: socketService.getConnectedUsersCount(),
    mode: process.env.NODE_ENV || 'development'
  });
});

// API status endpoint
app.get('/api/status', (req: Request, res: Response) => {
  res.json({ 
    server: 'Dou Dizhu API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: {
      authentication: true,
      realtime: true,
      rooms: true,
      socketio: true,
      mongodb: !!redis,
      redis: !!redis
    },
    connectedUsers: socketService.getConnectedUsersCount()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// Development endpoint for testing
app.get('/api/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API is working',
    timestamp: new Date().toISOString(),
    realtime: {
      connectedUsers: socketService.getConnectedUsersCount()
    }
  });
});

// Socket.IO stats endpoint
app.get('/api/socket/stats', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      connectedUsers: socketService.getConnectedUsersCount(),
      timestamp: new Date().toISOString()
    }
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

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ 
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`
  });
});

const PORT = process.env.PORT || 3001;

// Initialize database connections and start server
const startServer = async () => {
  try {
    console.log('🚀 Starting Dou Dizhu server...');
    
    // Try to connect to MongoDB
    const mongoConnected = await connectMongoDB();
    
    if (!mongoConnected && !redis) {
      createMockDatabaseWarning();
    }
    
    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Dou Dizhu server running on port ${PORT}`);
      console.log(`📡 Socket.IO server ready for real-time events`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️ MongoDB: ${mongoConnected ? 'Connected' : 'Disconnected (dev mode)'}`);
      console.log(`📦 Redis: ${redis ? 'Connected' : 'Disconnected (dev mode)'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth/*`);
      console.log(`🏠 Room API: http://localhost:${PORT}/api/rooms/*`);
      console.log(`⚡ Socket.IO: Real-time room management active`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down gracefully...');
  
  try {
    // Close Redis connection if it exists
    if (redis) {
      await redis.quit();
      console.log('📦 Redis connection closed');
    }
    
    // Close HTTP server
    httpServer.close(() => {
      console.log('🚀 HTTP server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the server
startServer(); 