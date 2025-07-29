import express, { Request, Response } from 'express';
import { User, userHelpers } from '../models/User';
import { createAuthResponse, authUtils } from '../utils/auth';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';

const router = express.Router();

// Registration endpoint
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.body;

    // Validate input
    if (!username || typeof username !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Username is required',
        code: 'MISSING_USERNAME'
      });
      return;
    }

    // Validate username format
    if (!userHelpers.isValidUsername(username)) {
      res.status(400).json({
        success: false,
        error: 'Username must be 2-20 characters and contain only letters, numbers, underscore, and Chinese characters',
        code: 'INVALID_USERNAME'
      });
      return;
    }

    // Check if username already exists
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'Username already exists',
        code: 'USERNAME_EXISTS'
      });
      return;
    }

    // Create new user
    const newUser = await User.createUser(username);

    // Create auth response
    const authResponse = createAuthResponse(newUser);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: authResponse
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR'
    });
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.body;

    // Validate input
    if (!username || typeof username !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Username is required',
        code: 'MISSING_USERNAME'
      });
      return;
    }

    // Find user by username
    const user = await User.findByUsername(username);
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid username',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    // Update user login status
    await user.updateLoginStatus(true);

    // Create auth response
    const authResponse = createAuthResponse(user);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: authResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user) {
      // Update user offline status
      await req.user.updateLoginStatus(false);
      
      // If user is in a room, remove them
      if (req.user.currentRoomId) {
        await req.user.leaveRoom();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

// Get user info endpoint
router.get('/user-info', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: req.user._id.toString(),
        username: req.user.username,
        roomId: req.user.currentRoomId?.toString() || null,
        isOnline: req.user.isOnline,
        lastLoginAt: req.user.lastLoginAt,
        createdAt: req.user.createdAt
      }
    });

  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user info',
      code: 'USER_INFO_ERROR'
    });
  }
});

// Validate token endpoint
router.get('/validate', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    message: 'Token is valid',
    data: {
      userId: req.user?._id.toString(),
      username: req.user?.username,
      isOnline: req.user?.isOnline
    }
  });
});

export default router; 