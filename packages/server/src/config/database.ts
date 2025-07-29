import mongoose from 'mongoose';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB Connection Configuration
export const mongoConfig = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/dou_dizhu',
  options: {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
  }
};

// Redis Connection Configuration
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  connectTimeout: 5000,
  lazyConnect: true,
};

// MongoDB Connection Function (Non-blocking for development)
export const connectMongoDB = async (): Promise<boolean> => {
  try {
    await mongoose.connect(mongoConfig.uri, mongoConfig.options);
    console.log('✅ MongoDB connected successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.log('🔄 Continuing without MongoDB in development mode');
      return false;
    }
  }
};

// Redis Connection Function (Non-blocking for development)
export const connectRedis = (): Redis | null => {
  try {
    const redis = new Redis(redisConfig);
    
    redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });
    
    redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔄 Continuing without Redis in development mode');
      }
    });
    
    redis.on('close', () => {
      console.warn('⚠️ Redis connection closed');
    });
    
    return redis;
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    if (process.env.NODE_ENV === 'production') {
      throw error;
    } else {
      console.log('🔄 Continuing without Redis in development mode');
      return null;
    }
  }
};

// Database Health Check (Handles null connections)
export const checkDatabaseHealth = async (redis: Redis | null): Promise<{
  mongodb: boolean;
  redis: boolean;
}> => {
  const health = {
    mongodb: false,
    redis: false
  };
  
  try {
    // Check MongoDB
    if (mongoose.connection.readyState === 1) {
      health.mongodb = true;
    }
    
    // Check Redis
    if (redis) {
      try {
        const pong = await redis.ping();
        if (pong === 'PONG') {
          health.redis = true;
        }
      } catch (redisError) {
        console.warn('Redis health check failed:', redisError);
      }
    }
  } catch (error) {
    console.error('Database health check failed:', error);
  }
  
  return health;
};

// Mock database functions for development when connections fail
export const createMockDatabaseWarning = () => {
  console.log('⚠️ Running in development mode without databases');
  console.log('📝 Authentication will use in-memory storage');
  console.log('🔄 Install and run MongoDB/Redis for full functionality');
}; 