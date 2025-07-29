import { Server as SocketIOServer } from 'socket.io';
import Game, { IGame, GamePhase } from '../models/Game';
import { Room } from '../models/Room';
import { User } from '../models/User';
import mongoose from 'mongoose';

export interface AuthenticatedSocket {
  id: string;
  userData?: {
    userId: string;
    username: string;
  };
  join: (room: string) => void;
  leave: (room: string) => void;
  emit: (event: string, data: any) => void;
  to: (room: string) => any;
}

export class GameService {
  private io: SocketIOServer;
  private activeGames: Map<string, IGame> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  // Game Management Methods
  async createGame(roomId: string): Promise<IGame> {
    console.log(`🎮 Creating new game for room: ${roomId}`);
    
    const room = await Room.findById(roomId).populate('players.userId');
    if (!room) {
      throw new Error('Room not found');
    }
    
    if (room.players.length !== 3) {
      throw new Error('Need exactly 3 players to start game');
    }
    
    // Create new game
    const game = new Game({
      roomId: room._id,
      gameId: `game_${roomId}_${Date.now()}`,
      phase: GamePhase.WAITING,
      players: room.players.map((player: any, index: number) => ({
        userId: player.userId._id,
        username: player.userId.username,
        position: index,
        cards: [],
        cardCount: 0,
        isReady: player.isReady,
        isConnected: true,
        score: 0
      })),
      currentTurn: 0,
      landlordCards: [],
      playedCards: [],
      gameHistory: [],
      turnTimeLimit: 30,
      scores: new Map()
    });
    
    await game.save();
    this.activeGames.set(room._id.toString(), game);
    
    console.log(`🎮 Game created: ${game.gameId}`);
    return game;
  }

  async startGame(roomId: string): Promise<IGame> {
    console.log(`🎮 Starting game for room: ${roomId}`);
    
    const game = await this.getGame(roomId);
    if (!game) {
      throw new Error('Game not found');
    }
    
    await game.startGame();
    
    // Broadcast game start to all players
    this.broadcastGameState(roomId, game);
    this.broadcastToRoom(roomId, 'gameStarted', {
      game: game.toSafeObject(),
      message: '游戏开始！开始叫地主'
    });
    
    console.log(`🎮 Game started: ${game.gameId}`);
    return game;
  }

  async processBid(roomId: string, userId: string, amount: number): Promise<boolean> {
    console.log(`🎮 Processing bid: ${userId} bids ${amount} in room ${roomId}`);
    
    const game = await this.getGame(roomId);
    if (!game) {
      throw new Error('Game not found');
    }
    
    const success = await game.processBid(userId, amount);
    if (success) {
      this.broadcastGameState(roomId, game);
      
      if (game.phase === GamePhase.PLAYING) {
        this.broadcastToRoom(roomId, 'biddingComplete', {
          game: game.toSafeObject(),
          landlord: game.players.find(p => p.userId.toString() === game.landlord?.toString())?.username,
          message: '叫地主结束，开始出牌！'
        });
      } else {
        this.broadcastToRoom(roomId, 'bidProcessed', {
          game: game.toSafeObject(),
          bidder: game.players.find(p => p.userId.toString() === userId)?.username,
          amount
        });
      }
    }
    
    return success;
  }

  async playCards(roomId: string, userId: string, cardIds: string[]): Promise<boolean> {
    console.log(`🎮 Processing card play: ${userId} plays ${cardIds.length} cards in room ${roomId}`);
    
    const game = await this.getGame(roomId);
    if (!game) {
      throw new Error('Game not found');
    }
    
    // Find the cards in player's hand
    const currentPlayer = game.players.find(p => p.userId.toString() === userId);
    if (!currentPlayer) {
      throw new Error('Player not found');
    }
    
    const cardsToPlay = currentPlayer.cards.filter(card => cardIds.includes(card.id));
    if (cardsToPlay.length !== cardIds.length) {
      throw new Error('Invalid cards selected');
    }
    
    const success = await game.playCards(userId, cardsToPlay);
    if (success) {
      this.broadcastGameState(roomId, game);
      
      if (game.phase === GamePhase.FINISHED) {
        this.broadcastToRoom(roomId, 'gameFinished', {
          game: game.toSafeObject(),
          winner: game.players.find(p => p.userId.toString() === game.winner?.toString())?.username,
          scores: game.scores ? Object.fromEntries(game.scores) : {},
          message: '游戏结束！'
        });
        
        // Clean up
        this.activeGames.delete(roomId);
        await this.updateRoomAfterGame(roomId);
      } else {
        this.broadcastToRoom(roomId, 'cardsPlayed', {
          game: game.toSafeObject(),
          player: currentPlayer.username,
          cards: cardsToPlay,
          cardType: game.lastPlay?.cardType
        });
      }
    }
    
    return success;
  }

  async passTurn(roomId: string, userId: string): Promise<boolean> {
    console.log(`🎮 Processing pass: ${userId} passes in room ${roomId}`);
    
    const game = await this.getGame(roomId);
    if (!game) {
      throw new Error('Game not found');
    }
    
    const success = await game.passTurn(userId);
    if (success) {
      this.broadcastGameState(roomId, game);
      
      const player = game.players.find(p => p.userId.toString() === userId);
      this.broadcastToRoom(roomId, 'turnPassed', {
        game: game.toSafeObject(),
        player: player?.username,
        message: `${player?.username} 不要`
      });
    }
    
    return success;
  }

  // Socket Event Handlers
  async handleStartGame(socket: AuthenticatedSocket, roomId: string): Promise<void> {
    try {
      if (!socket.userData) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }
      
      console.log(`🎮 ${socket.userData.username} requesting to start game in room ${roomId}`);
      
      // Verify user is room creator or has permission
      const room = await Room.findById(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Create and start game
      const game = await this.createGame(roomId);
      await this.startGame(roomId);
      
      socket.emit('gameStarted', {
        success: true,
        game: game.toSafeObject(),
        message: '游戏开始成功！'
      });
      
    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit('error', { message: error instanceof Error ? error.message : 'Failed to start game' });
    }
  }

  async handleBid(socket: AuthenticatedSocket, data: { roomId: string; amount: number }): Promise<void> {
    try {
      if (!socket.userData) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }
      
      const { roomId, amount } = data;
      console.log(`🎮 ${socket.userData.username} bidding ${amount} in room ${roomId}`);
      
      const success = await this.processBid(roomId, socket.userData.userId, amount);
      
      socket.emit('bidProcessed', {
        success,
        amount,
        message: success ? '叫地主成功' : '叫地主失败'
      });
      
    } catch (error) {
      console.error('Error processing bid:', error);
      socket.emit('error', { message: error instanceof Error ? error.message : 'Failed to process bid' });
    }
  }

  async handlePlayCards(socket: AuthenticatedSocket, data: { roomId: string; cardIds: string[] }): Promise<void> {
    try {
      if (!socket.userData) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }
      
      const { roomId, cardIds } = data;
      console.log(`🎮 ${socket.userData.username} playing cards in room ${roomId}:`, cardIds);
      
      const success = await this.playCards(roomId, socket.userData.userId, cardIds);
      
      socket.emit('cardsPlayResult', {
        success,
        cardIds,
        message: success ? '出牌成功' : '出牌失败'
      });
      
    } catch (error) {
      console.error('Error playing cards:', error);
      socket.emit('error', { message: error instanceof Error ? error.message : 'Failed to play cards' });
    }
  }

  async handlePass(socket: AuthenticatedSocket, data: { roomId: string }): Promise<void> {
    try {
      if (!socket.userData) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }
      
      const { roomId } = data;
      console.log(`🎮 ${socket.userData.username} passing turn in room ${roomId}`);
      
      const success = await this.passTurn(roomId, socket.userData.userId);
      
      socket.emit('passResult', {
        success,
        message: success ? '不要成功' : '不要失败'
      });
      
    } catch (error) {
      console.error('Error passing turn:', error);
      socket.emit('error', { message: error instanceof Error ? error.message : 'Failed to pass turn' });
    }
  }

  // Helper Methods
  private async getGame(roomId: string): Promise<IGame | null> {
    // First check active games cache
    let game = this.activeGames.get(roomId);
    
    if (!game) {
      // Load from database
      const foundGame = await Game.findOne({ roomId: new mongoose.Types.ObjectId(roomId) })
        .sort({ createdAt: -1 })
        .limit(1);
      
      if (foundGame) {
        this.activeGames.set(roomId, foundGame);
        game = foundGame;
      }
    }
    
    return game || null;
  }

  private broadcastGameState(roomId: string, game: IGame): void {
    const gameData = game.toSafeObject();
    
    // Send personalized game state to each player (hide other players' cards)
    game.players.forEach((player: any) => {
      const personalizedData = {
        ...gameData,
        players: gameData.players.map((p: any) => ({
          ...p,
          cards: p.userId === player.userId.toString() ? p.cards : [] // Only show own cards
        }))
      };
      
      this.io.to(`user_${player.userId}`).emit('gameStateUpdated', personalizedData);
    });
  }

  private broadcastToRoom(roomId: string, event: string, data: any): void {
    this.io.to(`room_${roomId}`).emit(event, data);
  }

  private async updateRoomAfterGame(roomId: string): Promise<void> {
    try {
      const room = await Room.findById(roomId);
      if (room) {
        room.status = 'waiting';
        room.players.forEach(player => {
          player.isReady = false;
        });
        await room.save();
        
        this.broadcastToRoom(roomId, 'roomUpdated', { room: room.toSafeObject() });
      }
    } catch (error) {
      console.error('Error updating room after game:', error);
    }
  }

  // Cleanup methods
  cleanupGame(roomId: string): void {
    this.activeGames.delete(roomId);
  }

  getActiveGameCount(): number {
    return this.activeGames.size;
  }
} 