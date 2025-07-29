import express, { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import Game from '../models/Game';
import { Room } from '../models/Room';

const router: Router = express.Router();

// Get game state
router.get('/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user!.userId;
    
    console.log(`📡 API: Get game state for room ${roomId} by user ${userId}`);
    
    const game = await Game.findOne({ roomId })
      .sort({ createdAt: -1 })
      .limit(1);
    
    if (!game) {
      res.status(404).json({
        success: false,
        error: 'Game not found',
        code: 'GAME_NOT_FOUND'
      });
      return;
    }
    
    // Check if user is a player in the game
    const isPlayer = game.players.some(p => p.userId.toString() === userId);
    if (!isPlayer) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
      return;
    }
    
    // Return personalized game state (hide other players' cards)
    const gameData = game.toSafeObject();
    const personalizedData = {
      ...gameData,
      players: gameData.players.map((player: any) => ({
        ...player,
        cards: player.userId === userId ? player.cards : []
      }))
    };
    
    res.json({
      success: true,
      data: personalizedData
    });
    
  } catch (error) {
    console.error('Error getting game state:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Get game history
router.get('/:roomId/history', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user!.userId;
    
    console.log(`📡 API: Get game history for room ${roomId} by user ${userId}`);
    
    const games = await Game.find({ roomId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('gameId phase startedAt finishedAt winner scores gameHistory');
    
    // Check if user has access to this room
    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found',
        code: 'ROOM_NOT_FOUND'
      });
      return;
    }
    
    const hasAccess = room.players.some(p => p.userId.toString() === userId);
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
      return;
    }
    
    res.json({
      success: true,
      data: games.map(game => ({
        gameId: game.gameId,
        phase: game.phase,
        startedAt: game.startedAt,
        finishedAt: game.finishedAt,
        winner: game.winner,
        scores: Object.fromEntries(game.scores || new Map()),
        moveCount: game.gameHistory.length
      }))
    });
    
  } catch (error) {
    console.error('Error getting game history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Get player statistics
router.get('/stats/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const requesterId = req.user!.userId;
    
    console.log(`📡 API: Get player stats for ${targetUserId} by user ${requesterId}`);
    
    // Users can only view their own stats (or make it public later)
    if (targetUserId !== requesterId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
      return;
    }
    
    const games = await Game.find({
      'players.userId': targetUserId,
      phase: 'finished'
    });
    
    let totalGames = games.length;
    let wins = 0;
    let totalScore = 0;
    let landlordWins = 0;
    let landlordGames = 0;
    
    games.forEach(game => {
      const player = game.players.find(p => p.userId.toString() === targetUserId);
      if (player) {
        totalScore += player.score;
        
        if (game.winner?.toString() === targetUserId) {
          wins++;
        }
        
        if (player.role === 'landlord') {
          landlordGames++;
          if (game.winner?.toString() === targetUserId) {
            landlordWins++;
          }
        }
      }
    });
    
    res.json({
      success: true,
      data: {
        totalGames,
        wins,
        losses: totalGames - wins,
        winRate: totalGames > 0 ? (wins / totalGames * 100).toFixed(1) : '0.0',
        totalScore,
        averageScore: totalGames > 0 ? (totalScore / totalGames).toFixed(1) : '0.0',
        landlordGames,
        landlordWins,
        landlordWinRate: landlordGames > 0 ? (landlordWins / landlordGames * 100).toFixed(1) : '0.0'
      }
    });
    
  } catch (error) {
    console.error('Error getting player stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Start a new game (POST request)
router.post('/:roomId/start', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user!.userId;
    
    console.log(`📡 API: Start game for room ${roomId} by user ${userId}`);
    
    const room = await Room.findById(roomId).populate('players.userId');
    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found',
        code: 'ROOM_NOT_FOUND'
      });
      return;
    }
    
    // Check if user is room creator or has permission
    const isCreator = room.createdBy.toString() === userId;
    if (!isCreator) {
      res.status(403).json({
        success: false,
        error: 'Only room creator can start game',
        code: 'ACCESS_DENIED'
      });
      return;
    }
    
    // Check if room has exactly 3 players
    if (room.players.length !== 3) {
      res.status(400).json({
        success: false,
        error: 'Need exactly 3 players to start game',
        code: 'INSUFFICIENT_PLAYERS'
      });
      return;
    }
    
    // Check if all players are ready
    const allReady = room.players.every(p => p.isReady);
    if (!allReady) {
      res.status(400).json({
        success: false,
        error: 'All players must be ready',
        code: 'PLAYERS_NOT_READY'
      });
      return;
    }
    
    // Check if there's already an active game
    const existingGame = await Game.findOne({ 
      roomId,
      phase: { $in: ['waiting', 'bidding', 'playing'] }
    });
    
    if (existingGame) {
      res.status(400).json({
        success: false,
        error: 'Game already in progress',
        code: 'GAME_IN_PROGRESS'
      });
      return;
    }
    
    // This endpoint just validates - actual game creation happens via Socket.IO
    res.json({
      success: true,
      message: 'Ready to start game via Socket.IO',
      data: {
        roomId,
        playerCount: room.players.length,
        allReady
      }
    });
    
  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router; 