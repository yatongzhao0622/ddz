import { Request, Response, NextFunction } from 'express';
import { User, IUser } from '../models/User';
import { extractTokenFromHeader, verifyToken, TokenPayload } from '../utils/auth';

// Extended Request interface for authenticated users
export interface AuthenticatedRequest extends Request {
  user?: IUser;
  tokenPayload?: TokenPayload;
}

// Authentication middleware function (Higher-order function)
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'MISSING_TOKEN'
      });
      return;
    }

    // Verify token
    const payload = verifyToken(token);
    
    if (!payload) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    // Find user by ID from token
    const user = await User.findById(payload.userId);
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Note: Removed isOnline check for HTTP API calls
    // HTTP is stateless - users can be "offline" from Socket.IO but still have valid tokens
    // The token expiration check above is sufficient for HTTP API authentication

    // Attach user and payload to request
    req.user = user;
    req.tokenPayload = payload;
    
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication service error',
      code: 'AUTH_ERROR'
    });
  }
};

// Optional authentication middleware (allows guest access)
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const payload = verifyToken(token);
      
      if (payload) {
        const user = await User.findById(payload.userId);
        if (user && user.isOnline) {
          req.user = user;
          req.tokenPayload = payload;
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue even if auth fails
  }
};

// Admin/special role middleware (can be extended later)
export const requireOnlineUser = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.user.isOnline) {
    res.status(403).json({
      success: false,
      error: 'User must be online',
      code: 'USER_OFFLINE'
    });
    return;
  }
  
  next();
};

// Middleware to check if user is in a room
export const requireUserInRoom = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.user.currentRoomId) {
    res.status(400).json({
      success: false,
      error: 'User must be in a room',
      code: 'USER_NOT_IN_ROOM'
    });
    return;
  }
  
  next();
};

// Middleware to check if user is NOT in a room
export const requireUserNotInRoom = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user && req.user.currentRoomId) {
    res.status(400).json({
      success: false,
      error: 'User is already in a room',
      code: 'USER_ALREADY_IN_ROOM'
    });
    return;
  }
  
  next();
};

// Utility function to create auth response format
export const createAuthErrorResponse = (
  message: string,
  code: string,
  statusCode: number = 401
) => ({
  success: false,
  error: message,
  code,
  timestamp: new Date().toISOString()
}); 