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
    
    // Update room status to 'playing' in database using Room's built-in method
    const room = await Room.findById(roomId);
    if (room) {
      await room.startGame();
      // Link the game session to the room
      room.gameSession = game._id as any;
      await room.save();
      console.log(`🎮 Room ${roomId} status updated to 'playing' and gameSession set to ${game._id}`);
    }
    
    await game.startGame();
    
    // Broadcast game state to all players (without gameStarted event)
    this.broadcastGameState(roomId, game);
    
    console.log(`🎮 Game started: ${game.gameId}`);
    return game;
  }

  async processBid(roomId: string, userId: string, amount: number): Promise<boolean> {
    console.log(`🎮 GameService.processBid - Processing bid: ${userId} bids ${amount} in room ${roomId}`);
    
    console.log(`🎮 GameService.processBid - Getting game for room ${roomId}...`);
    const game = await this.getGame(roomId);
    if (!game) {
      console.error(`🎮 GameService.processBid - Game not found for room ${roomId}`);
      throw new Error('Game not found');
    }
    
    console.log(`🎮 GameService.processBid - Game found, calling game.processBid...`);
    const success = await game.processBid(userId, amount);
    console.log(`🎮 GameService.processBid - game.processBid returned: ${success}`);
    
    if (success) {
      console.log(`🎮 GameService.processBid - Broadcasting game state...`);
      this.broadcastGameState(roomId, game);
      
      if (game.phase === GamePhase.PLAYING) {
        console.log(`🎮 GameService.processBid - Game phase is PLAYING, broadcasting biddingComplete...`);
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
    console.log(`🎮 GameService.playCards - Processing play: ${userId} plays cards in room ${roomId}:`, cardIds);
    
    const game = await this.getGame(roomId);
    if (!game) {
      console.error(`🎮 GameService.playCards - Game not found for room ${roomId}`);
      return false;
    }
    
    // Convert card IDs to Card objects
    const player = game.players.find(p => p.userId.toString() === userId);
    if (!player) {
      console.error(`🎮 GameService.playCards - Player not found in game: ${userId}`);
      return false;
    }
    
    const cardsToPlay = cardIds.map(cardId => {
      const card = player.cards.find(c => c.id === cardId);
      if (!card) {
        console.error(`🎮 GameService.playCards - Card not found in player's hand: ${cardId}`);
        return null;
      }
      return card;
    }).filter(card => card !== null);
    
    if (cardsToPlay.length !== cardIds.length) {
      console.error(`🎮 GameService.playCards - Some cards not found in player's hand`);
      return false;
    }
    
    const success = await game.playCards(userId, cardsToPlay);
    console.log(`🎮 GameService.playCards - Game playCards result: ${success}`);
    
    if (success) {
      console.log(`🎮 GameService.playCards - Play successful, broadcasting game state...`);
      this.broadcastGameState(roomId, game);
      
      const player = game.players.find(p => p.userId.toString() === userId);
      console.log(`🎮 GameService.playCards - Broadcasting cardsPlayed event...`);
      this.broadcastToRoom(roomId, 'cardsPlayed', {
        game: game.toSafeObject(),
        player: player?.username,
        cardIds,
        message: `${player?.username} 出牌`
      });

      // If game is finished, update room status
      if (game.phase === GamePhase.FINISHED) {
        console.log(`🎮 GameService.playCards - Game finished, updating room status...`);
        await this.updateRoomAfterGame(roomId);
      }
    } else {
      console.log(`❌ GameService.playCards - Play failed for ${userId}`);
    }
    
    return success;
  }

  async passTurn(roomId: string, userId: string): Promise<boolean> {
    console.log(`🎮 GameService.passTurn - Processing pass: ${userId} passes in room ${roomId}`);
    
    console.log(`🎮 GameService.passTurn - Getting game for room ${roomId}...`);
    const game = await this.getGame(roomId);
    if (!game) {
      console.error(`❌ GameService.passTurn - Game not found for room ${roomId}`);
      throw new Error('Game not found');
    }
    
    console.log(`🎮 GameService.passTurn - Game found, calling game.passTurn...`);
    const success = await game.passTurn(userId);
    console.log(`🎮 GameService.passTurn - game.passTurn returned: ${success}`);
    
    if (success) {
      console.log(`🎮 GameService.passTurn - Pass successful, broadcasting game state...`);
      this.broadcastGameState(roomId, game);
      
      const player = game.players.find(p => p.userId.toString() === userId);
      console.log(`🎮 GameService.passTurn - Broadcasting turnPassed event...`);
      this.broadcastToRoom(roomId, 'turnPassed', {
        game: game.toSafeObject(),
        player: player?.username,
        message: `${player?.username} 不要`
      });
    } else {
      console.log(`❌ GameService.passTurn - Pass failed for ${userId}`);
    }
    
    return success;
  }

  // Socket Event Handlers
  async handleStartGame(socket: AuthenticatedSocket, roomId: string): Promise<void> {
    try {
      console.log(`🎮 GameService - handleStartGame called`);
      console.log(`🎮 GameService - User: ${socket.userData?.username}, Room: ${roomId}`);
      
      if (!socket.userData) {
        console.error('❌ GameService - No user data in socket');
        socket.emit('error', { message: 'Authentication required', code: 'AUTH_REQUIRED' });
        return;
      }
      
      console.log(`🎮 GameService - ${socket.userData.username} requesting to start game in room ${roomId}`);
      
      // Verify user is room creator or has permission
      const room = await Room.findById(roomId);
      if (!room) {
        console.error(`❌ GameService - Room not found: ${roomId}`);
        socket.emit('error', { message: 'Room not found', code: 'ROOM_NOT_FOUND' });
        return;
      }
      
      console.log(`✅ GameService - Room found: ${room.roomName}`);

      // Check if room can start game
      if (!room.canStartGame()) {
        console.error(`❌ GameService - Room cannot start game: ${room.roomName}`);
        socket.emit('error', { 
          message: 'Cannot start game - not all conditions met', 
          code: 'START_GAME_ERROR' 
        });
        return;
      }
      
      // Create and start game
      console.log(`🎮 GameService - Creating game for room ${roomId}`);
      const game = await this.createGame(roomId);
      console.log(`✅ GameService - Game created: ${game._id}`);
      
      console.log(`🎮 GameService - Starting game`);
      await this.startGame(roomId);
      console.log(`✅ GameService - Game started successfully`);
      
      // Get updated room data after game start
      const updatedRoom = await Room.findById(roomId);
      if (!updatedRoom) {
        throw new Error('Room not found after game creation');
      }
      
      const gameData = game.toSafeObject();
      const roomData = updatedRoom.toSafeObject();
      
      console.log(`📤 GameService - Emitting gameStarted event with data:`, { gameData, roomData });
      
      // Emit to the requesting socket
      socket.emit('gameStarted', {
        success: true,
        game: gameData,
        room: roomData,
        message: '游戏开始成功！'
      });
      
      // Broadcast to all players in the room
      console.log(`🎮 Broadcasting gameStarted to room: room_${roomId}`);
      this.broadcastToRoom(roomId, 'gameStarted', {
        game: gameData,
        room: roomData,
        message: '游戏开始！'
      });
      console.log(`🎮 GameStarted broadcast completed to room_${roomId}`);
      
      console.log(`✅ GameService - gameStarted event emitted successfully`);
      
    } catch (error) {
      console.error('❌ GameService - Error starting game:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to start game', 
        code: 'START_GAME_ERROR' 
      });
    }
  }

  async handleBid(socket: AuthenticatedSocket, data: { roomId: string; amount: number }): Promise<void> {
    try {
      console.log(`🎮 GameService.handleBid - Called with data:`, data);
      
      if (!socket.userData) {
        console.error('🎮 GameService.handleBid - No socket userData');
        socket.emit('error', { message: 'Authentication required', code: 'AUTH_REQUIRED' });
        return;
      }
      
      const { roomId, amount } = data;
      console.log(`🎮 GameService.handleBid - ${socket.userData.username} bidding ${amount} in room ${roomId}`);
      
      console.log(`🎮 GameService.handleBid - Calling processBid...`);
      const success = await this.processBid(roomId, socket.userData.userId, amount);
      console.log(`🎮 GameService.handleBid - processBid result: ${success}`);
      
      console.log(`🎮 GameService.handleBid - Emitting bidProcessed event`);
      socket.emit('bidProcessed', {
        success,
        amount,
        message: success ? '叫地主成功' : '叫地主失败'
      });
      
    } catch (error) {
      console.error('🎮 GameService.handleBid - Error processing bid:', error);
      socket.emit('error', { message: error instanceof Error ? error.message : 'Failed to process bid', code: 'BID_ERROR' });
    }
  }

  async handlePlayCards(socket: AuthenticatedSocket, data: { roomId: string; cardIds: string[] }): Promise<void> {
    try {
      console.log(`🎮 GameService.handlePlayCards - Called with data:`, data);
      console.log(`🎮 GameService.handlePlayCards - Socket userData:`, socket.userData);
      
      if (!socket.userData) {
        console.error('🎮 GameService.handlePlayCards - No socket userData');
        socket.emit('error', { message: 'Authentication required', code: 'AUTH_REQUIRED' });
        return;
      }
      
      const { roomId, cardIds } = data;
      console.log(`🎮 GameService.handlePlayCards - ${socket.userData.username} playing cards in room ${roomId}:`, cardIds);
      
      console.log(`🎮 GameService.handlePlayCards - Calling playCards...`);
      const success = await this.playCards(roomId, socket.userData.userId, cardIds);
      console.log(`🎮 GameService.handlePlayCards - playCards result: ${success}`);
      
      if (success) {
        console.log(`🎮 GameService.handlePlayCards - Broadcasting updated game state to all players...`);
        // Get updated game and broadcast to all players
        const game = await this.getGame(roomId);
        if (game) {
          this.broadcastGameState(roomId, game);
        }
      }
      
      console.log(`🎮 GameService.handlePlayCards - Emitting cardsPlayResult to socket ${socket.id}`);
      socket.emit('cardsPlayResult', {
        success,
        cardIds,
        message: success ? '出牌成功' : '出牌失败'
      });
      console.log(`🎮 GameService.handlePlayCards - cardsPlayResult emitted successfully`);
      
    } catch (error) {
      console.error('🎮 GameService.handlePlayCards - Error playing cards:', error);
      console.log(`🎮 GameService.handlePlayCards - Emitting error cardsPlayResult to socket ${socket.id}`);
      socket.emit('cardsPlayResult', {
        success: false,
        cardIds: data.cardIds || [],
        message: error instanceof Error ? error.message : '出牌失败'
      });
      socket.emit('error', { message: error instanceof Error ? error.message : 'Failed to play cards', code: 'PLAY_CARDS_ERROR' });
    }
  }

  async handlePass(socket: AuthenticatedSocket, data: { roomId: string }): Promise<void> {
    try {
      console.log(`🎮 GameService.handlePass - Called with data:`, data);
      console.log(`🎮 GameService.handlePass - Socket userData:`, socket.userData);
      
      if (!socket.userData) {
        console.error('🎮 GameService.handlePass - No socket userData');
        socket.emit('error', { message: 'Authentication required', code: 'AUTH_REQUIRED' });
        return;
      }
      
      const { roomId } = data;
      console.log(`🎮 GameService.handlePass - ${socket.userData.username} passing turn in room ${roomId}`);
      
      console.log(`🎮 GameService.handlePass - Calling passTurn...`);
      const success = await this.passTurn(roomId, socket.userData.userId);
      console.log(`🎮 GameService.handlePass - passTurn result: ${success}`);
      
      if (success) {
        console.log(`🎮 GameService.handlePass - Broadcasting updated game state to all players...`);
        // Get updated game and broadcast to all players
        const game = await this.getGame(roomId);
        if (game) {
          this.broadcastGameState(roomId, game);
        }
      }
      
      console.log(`🎮 GameService.handlePass - Emitting passResult to socket ${socket.id}`);
      socket.emit('passResult', {
        success,
        message: success ? '不要成功' : '不要失败'
      });
      console.log(`🎮 GameService.handlePass - passResult emitted successfully`);
      
    } catch (error) {
      console.error('🎮 GameService.handlePass - Error passing turn:', error);
      console.log(`🎮 GameService.handlePass - Emitting error passResult to socket ${socket.id}`);
      socket.emit('passResult', {
        success: false,
        message: error instanceof Error ? error.message : '不要失败'
      });
      socket.emit('error', { message: error instanceof Error ? error.message : 'Failed to pass turn', code: 'PASS_ERROR' });
    }
  }

  // Helper Methods
  private async getGame(roomId: string): Promise<IGame | null> {
    console.log(`🎮 GameService.getGame - Looking for game in room ${roomId}`);
    console.log(`🎮 GameService.getGame - Active games count: ${this.activeGames.size}`);
    console.log(`🎮 GameService.getGame - Active games keys:`, Array.from(this.activeGames.keys()));
    
    const game = this.activeGames.get(roomId);
    if (game) {
      console.log(`🎮 GameService.getGame - Found game in memory: ${game.gameId}`);
      return game;
    }
    
    console.log(`🎮 GameService.getGame - Game not in memory, searching database...`);
    // Try to find the game in the database
    const dbGame = await Game.findOne({ roomId }).exec();
    if (dbGame) {
      console.log(`🎮 GameService.getGame - Found game in database: ${dbGame.gameId}, adding to memory`);
      this.activeGames.set(roomId, dbGame);
      return dbGame;
    }
    
    console.log(`🎮 GameService.getGame - No game found for room ${roomId}`);
    return null;
  }

  private broadcastGameState(roomId: string, game: IGame): void {
    console.log(`🔊 GameService.broadcastGameState - Broadcasting to room ${roomId}`);
    const gameData = game.toSafeObject();
    console.log(`🔊 GameService.broadcastGameState - Game data prepared, players: ${game.players.length}`);
    
    // Send personalized game state to each player (hide other players' cards)
    game.players.forEach((player: any, index: number) => {
      const userRoom = `user_${player.userId}`;
      console.log(`🔊 GameService.broadcastGameState - Broadcasting to player ${index + 1}: ${player.username} in room ${userRoom}`);
      
      const personalizedData = {
        ...gameData,
        players: gameData.players.map((p: any) => ({
          ...p,
          cards: p.userId === player.userId.toString() ? p.cards : [] // Only show own cards
        }))
      };
      
      console.log(`🔊 GameService.broadcastGameState - Emitting gameStateUpdated to ${userRoom}`);
      this.io.to(userRoom).emit('gameStateUpdated', personalizedData);
      console.log(`✅ GameService.broadcastGameState - Sent to ${userRoom}`);
    });
    
    console.log(`🔊 GameService.broadcastGameState - Broadcast complete for room ${roomId}`);
  }

  private broadcastToRoom(roomId: string, event: string, data: any): void {
    const roomName = `room_${roomId}`;
    const socketsInRoom = this.io.sockets.adapter.rooms.get(roomName);
    console.log(`🔊 Broadcasting '${event}' to room '${roomName}', sockets in room: ${socketsInRoom?.size || 0}`);
    
    this.io.to(roomName).emit(event, data);
  }

  private async updateRoomAfterGame(roomId: string): Promise<void> {
    try {
      const room = await Room.findById(roomId);
      if (room) {
        // Reset room state
        await room.resetAfterGame();
        
        // Clean up game from memory
        this.cleanupGame(roomId);
        
        // Broadcast room update
        this.broadcastToRoom(roomId, 'roomUpdated', { room: room.toSafeObject() });
        
        // Broadcast ready status change for each player
        room.players.forEach(player => {
          this.broadcastToRoom(roomId, 'playerReadyChanged', {
            room: room.toSafeObject(),
            player: {
              userId: player.userId.toString(),
              username: player.username
            },
            isReady: false
          });
        });

        console.log(`✅ GameService - Room ${roomId} reset and game cleaned up`);
      }
    } catch (error) {
      console.error('Error updating room after game:', error);
    }
  }

  // Public method to get game state for API access
  public async getGameStateForAPI(roomId: string): Promise<any> {
    console.log(`🎮 GameService - Getting game state for API: ${roomId}`);
    const game = await this.getGame(roomId);
    if (game) {
      const gameState = game.toSafeObject();
      console.log(`🎮 GameService - Found game state for room ${roomId}`);
      return gameState;
    }
    console.log(`🎮 GameService - No game found for room ${roomId}`);
    return null;
  }

  // Cleanup methods
  cleanupGame(roomId: string): void {
    this.activeGames.delete(roomId);
  }

  getActiveGameCount(): number {
    return this.activeGames.size;
  }
}