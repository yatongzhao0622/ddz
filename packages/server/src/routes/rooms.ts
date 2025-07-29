import express, { Request, Response, Router } from 'express';
import { Room, roomHelpers, IRoom } from '../models/Room';
import { User } from '../models/User';
import { AuthenticatedRequest, authenticateToken, requireUserNotInRoom } from '../middleware/auth';
import mongoose from 'mongoose';
import { GameService } from '../services/gameService';

const router: Router = express.Router();

// Get available rooms
router.get('/available', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    console.log(`🔍 Fetching visible rooms for user: ${userId}`);
    
    // Use findVisibleRooms to include user's current room even if full
    const rooms = await Room.findVisibleRooms(userId);
    
    console.log(`📋 Found ${rooms.length} visible rooms`);
    rooms.forEach(room => {
      console.log(`  - ${room.roomName}: ${room.players.length}/${room.maxPlayers} players`);
    });
    
    res.status(200).json({
      success: true,
      data: {
        rooms: rooms.map(room => room.toSafeObject()),
        count: rooms.length
      }
    });
  } catch (error) {
    console.error('Get available rooms error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available rooms',
      code: 'ROOMS_FETCH_ERROR'
    });
  }
});

// Create a new room
router.post('/create', authenticateToken, requireUserNotInRoom, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roomName, maxPlayers = 3, settings } = req.body;

    // Validate room name
    if (!roomHelpers.isValidRoomName(roomName)) {
      res.status(400).json({
        success: false,
        error: 'Room name must be 2-50 characters',
        code: 'INVALID_ROOM_NAME'
      });
      return;
    }

    // Validate max players
    if (maxPlayers < 2 || maxPlayers > 4) {
      res.status(400).json({
        success: false,
        error: 'Max players must be between 2 and 4',
        code: 'INVALID_MAX_PLAYERS'
      });
      return;
    }

    // Create room
    const room = await Room.createRoom({
      roomName: roomHelpers.sanitizeRoomName(roomName),
      createdBy: req.user!._id,
      creatorUsername: req.user!.username,
      settings: {
        ...settings,
        minPlayers: Math.min(settings?.minPlayers || 3, maxPlayers)
      }
    });

    // Update user's current room
    await req.user!.joinRoom(room._id);

    // Get the socket service instance from the request
    const socketService = (req.app as any).get('socketService');
    if (socketService) {
      // Broadcast room list update to all connected users
      await socketService.broadcastRoomList();
    }

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: {
        room: room.toSafeObject()
      }
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create room',
      code: 'ROOM_CREATE_ERROR'
    });
  }
});

// Join a room
router.post('/:roomId/join', authenticateToken, requireUserNotInRoom, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;

    // Find room
    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found',
        code: 'ROOM_NOT_FOUND'
      });
      return;
    }

    // Check if room can accept players
    if (!roomHelpers.canPlayerJoinRoom(room)) {
      res.status(400).json({
        success: false,
        error: room.status === 'playing' ? 'Game is already in progress' : 'Room is full',
        code: room.status === 'playing' ? 'GAME_IN_PROGRESS' : 'ROOM_FULL'
      });
      return;
    }

    // Add player to room
    const updatedRoom = await room.addPlayer(req.user!._id, req.user!.username);

    // Update user's current room
    await req.user!.joinRoom(room._id);

    res.status(200).json({
      success: true,
      message: 'Successfully joined room',
      data: {
        room: updatedRoom.toSafeObject()
      }
    });
  } catch (error) {
    console.error('Join room error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Room is full' || error.message === 'Player already in room') {
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.message === 'Room is full' ? 'ROOM_FULL' : 'ALREADY_IN_ROOM'
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to join room',
      code: 'ROOM_JOIN_ERROR'
    });
  }
});

// Leave a room
router.post('/:roomId/leave', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;

    // Find room
    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found',
        code: 'ROOM_NOT_FOUND'
      });
      return;
    }

    // Remove player from room
    const updatedRoom = await room.removePlayer(req.user!._id);

    // Update user's current room
    await req.user!.leaveRoom();

    res.status(200).json({
      success: true,
      message: 'Successfully left room',
      data: {
        room: updatedRoom.toSafeObject()
      }
    });
  } catch (error) {
    console.error('Leave room error:', error);
    
    if (error instanceof Error && error.message === 'Player not found in room') {
      res.status(400).json({
        success: false,
        error: 'Player not in this room',
        code: 'PLAYER_NOT_IN_ROOM'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to leave room',
      code: 'ROOM_LEAVE_ERROR'
    });
  }
});

// Toggle ready status
router.post('/:roomId/ready', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;

    // Find room
    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found',
        code: 'ROOM_NOT_FOUND'
      });
      return;
    }

    // Toggle player ready status
    const updatedRoom = await room.togglePlayerReady(req.user!._id);

    res.status(200).json({
      success: true,
      message: 'Ready status updated',
      data: {
        room: updatedRoom.toSafeObject()
      }
    });
  } catch (error) {
    console.error('Toggle ready error:', error);
    
    if (error instanceof Error && error.message === 'Player not found in room') {
      res.status(400).json({
        success: false,
        error: 'Player not in this room',
        code: 'PLAYER_NOT_IN_ROOM'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update ready status',
      code: 'READY_UPDATE_ERROR'
    });
  }
});

// Get room details
router.get('/:roomId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found',
        code: 'ROOM_NOT_FOUND'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        room: room.toSafeObject()
      }
    });
  } catch (error) {
    console.error('Get room details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get room details',
      code: 'ROOM_DETAILS_ERROR'
    });
  }
});

// Get user's current room
router.get('/user/current', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const room = await Room.findUserCurrentRoom(req.user!._id);
    
    if (!room) {
      res.status(200).json({
        success: true,
        data: {
          room: null
        }
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        room: room.toSafeObject()
      }
    });
  } catch (error) {
    console.error('Get current room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current room',
      code: 'CURRENT_ROOM_ERROR'
    });
  }
});

// Start game (room creator only)
router.post('/:roomId/start', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found',
        code: 'ROOM_NOT_FOUND'
      });
      return;
    }

    // Check if user is room creator
    if (room.createdBy.toString() !== req.user!._id.toString()) {
      res.status(403).json({
        success: false,
        error: 'Only room creator can start the game',
        code: 'NOT_ROOM_CREATOR'
      });
      return;
    }

    // Start game
    const updatedRoom = await room.startGame();

    res.status(200).json({
      success: true,
      message: 'Game started successfully',
      data: {
        room: updatedRoom.toSafeObject()
      }
    });
  } catch (error) {
    console.error('Start game error:', error);
    
    if (error instanceof Error && error.message === 'Cannot start game - not all conditions met') {
      const room = await Room.findById(req.params.roomId);
      const notReadyPlayers = room ? roomHelpers.getPlayersNotReady(room) : [];
      
      res.status(400).json({
        success: false,
        error: 'Cannot start game',
        code: 'GAME_START_CONDITIONS_NOT_MET',
        details: {
          notReadyPlayers,
          minPlayers: room?.settings.minPlayers || 3,
          currentPlayers: room?.players.length || 0
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to start game',
      code: 'GAME_START_ERROR'
    });
  }
});

// Get game state for a room
router.get('/:roomId/game', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    
    // Validate room ID
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid room ID format'
      });
      return;
    }
    
    // Find the room
    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found'
      });
      return;
    }
    
    // Check if room has active game
    if (room.status !== 'playing' || !room.gameSession) {
      res.status(400).json({
        success: false,
        error: 'No active game in this room'
      });
      return;
    }
    
    // Get game service instance and fetch real game state
    const gameService = new GameService(req.app.get('io'));
    
    try {
      const gameState = await gameService.getGameStateForAPI(roomId);
      if (gameState) {
        console.log(`🎮 API - Fetched real game state for room ${roomId}:`, gameState);
        
        res.status(200).json({
          success: true,
          data: gameState
        });
        return;
      }
    } catch (error) {
      console.error('🎮 API - Error fetching real game state:', error);
    }
    
    // Fallback to mock data if real game state unavailable
    console.log(`🎮 API - Using fallback mock game state for room ${roomId}`);
    const mockGameState = {
      id: room.gameSession.toString(),
      roomId: room._id.toString(),
      phase: 'playing',
      players: room.players.map((player: any, index: number) => ({
        ...player,
        userId: player.userId.toString(),
        position: index,
        cards: generateMockCards(17), // Generate mock cards for now
        cardCount: 17,
        isReady: player.isReady,
        isConnected: player.isConnected || true,
        score: 0
      })),
      currentTurn: 0,
      landlord: null,
      landlordCards: generateMockCards(3),
      lastPlay: null,
      gameHistory: [],
      isGameActive: true,
      startedAt: new Date(),
      turnTimeLimit: 30
    };
    
    res.status(200).json({
      success: true,
      data: mockGameState
    });
    
  } catch (error) {
    console.error('Get game state error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game state'
    });
  }
});

// Helper function to generate mock cards (replace with real card distribution later)
function generateMockCards(count: number) {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
  const cards = [];
  
  for (let i = 0; i < count; i++) {
    cards.push({
      id: `card_${i}`,
      suit: suits[i % suits.length],
      rank: ranks[i % ranks.length],
      isSelected: false
    });
  }
  
  return cards;
}

export default router; 