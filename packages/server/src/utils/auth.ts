import { IUser } from '../models/User';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dou-dizhu-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Token Payload Interface
export interface TokenPayload {
  userId: string;
  username: string;
  iat?: number;
  exp?: number;
}

// Simplified token generation (for development)
export const generateToken = (user: IUser): string => {
  // For development, we'll use a simple base64 encoded token
  // In production, replace this with proper JWT
  const payload = {
    userId: user._id.toString(),
    username: user.username,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };
  
  return Buffer.from(JSON.stringify(payload)).toString('base64');
};

// Simplified token verification
export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    
    // Check expiry
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return decoded as TokenPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

// Pure function to extract token from Authorization header
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) return null;
  
  // Expected format: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
};

// Pure function to create authentication response
export const createAuthResponse = (user: IUser): {
  token: string;
  user: {
    _id: string;
    username: string;
    createdAt: Date;
    updatedAt: Date;
    isOnline: boolean;
    currentRoomId?: string;
  };
} => {
  return {
    token: generateToken(user),
    user: {
      _id: user._id.toString(),
      username: user.username,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isOnline: user.isOnline,
      currentRoomId: user.currentRoomId?.toString()
    }
  };
};

// Pure function to validate token expiry
export const isTokenExpired = (payload: TokenPayload): boolean => {
  if (!payload.exp) return true;
  
  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
};

// Auth utility functions
export const authUtils = {
  // Generate a secure session ID
  generateSessionId: (): string => {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  },
  
  // Create login session data
  createSessionData: (user: IUser): {
    sessionId: string;
    userId: string;
    username: string;
    loginTime: Date;
  } => ({
    sessionId: authUtils.generateSessionId(),
    userId: user._id.toString(),
    username: user.username,
    loginTime: new Date()
  }),
  
  // Validate username format (complementary to User model validation)
  isValidAuthUsername: (username: string): boolean => {
    if (!username || typeof username !== 'string') return false;
    const trimmed = username.trim();
    return trimmed.length >= 2 && 
           trimmed.length <= 20 && 
           /^[a-zA-Z0-9_\u4e00-\u9fff]+$/.test(trimmed);
  },
  
  // Sanitize user input for auth
  sanitizeAuthInput: (input: string): string => {
    return input.trim().toLowerCase();
  }
}; 