import { Server as SocketIOServer, Socket } from 'socket.io';
import { Room } from '../models/Room';
import { User } from '../models/User';
import { verifyToken, TokenPayload } from '../utils/auth';
import mongoose from 'mongoose';

// Socket.IO Event Types
export interface ClientToServerEvents {
  authenticate: (data: { token: string }) => void;
  joinRoom: (data: { roomId: string }) => void;
  leaveRoom: (data: { roomId: string }) => void;
  toggleReady: (data: { roomId: string }) => void;
  startGame: (data: { roomId: string }) => void;
  requestRoomList: () => void;
  bid: (data: { roomId: string; bidAmount: number }) => void;
}

export interface ServerToClientEvents {
  authenticated: (data: { success: boolean; user?: any; error?: string }) => void;
  roomUpdated: (data: { room: any }) => void;
  roomListUpdated: (data: { rooms: any[] }) => void;
  playerJoined: (data: { room: any; player: any }) => void;
  playerLeft: (data: { room: any; player: any }) => void;
  playerReadyChanged: (data: { room: any; player: any; isReady: boolean }) => void;
  gameStarted: (data: { room: any }) => void;
  roomLeft: (data: { success: boolean; message?: string }) => void;
  error: (data: { message: string; code: string }) => void;
  gameStateRestored: (data: { success: boolean; game: any; room: any; message: string }) => void;
  roomJoined: (data: { success: boolean; room: any }) => void;
  bidProcessed: (data: { success: boolean; amount: number; message: string }) => void;
  cardsPlayResult: (data: { success: boolean; cardIds: string[]; message: string }) => void;
  passResult: (data: { success: boolean; message: string }) => void;
  biddingComplete: (data: { game: any; landlord: string; message: string }) => void;
  cardsPlayed: (data: { game: any; player: string; cardIds: string[]; message: string }) => void;
  turnPassed: (data: { game: any; player: string; message: string }) => void;
  gameStateUpdated: (data: any) => void;
}

// Socket user data interface
interface SocketUserData {
  userId: string;
  username: string;
  roomId?: string;
}

// Extend Socket interface
interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  userData?: TokenPayload; // Changed to TokenPayload
}

export class SocketService {
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map(); // Changed to AuthenticatedSocket
  private gameService: any; // Placeholder for game service

  constructor(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>) {
    this.io = io;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Send welcome message
      socket.emit('authenticated', {
        success: false,
        error: 'Please authenticate'
      });

      // Handle authentication
      socket.on('authenticate', (data: { token: string }) => {
        this.handleAuthentication(socket, data.token);
      });

      // Room event handlers (require authentication)
      socket.on('joinRoom', async (data: { roomId: string }) => {
        await this.handleJoinRoom(socket, data.roomId);
      });

      socket.on('leaveRoom', async (data: { roomId: string }) => {
        if (!socket.userData) {
          socket.emit('error', { message: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
          return;
        }
        await this.handleLeaveRoom(socket, data.roomId);
      });

      socket.on('toggleReady', async (data: { roomId: string }) => {
        if (!socket.userData) {
          socket.emit('error', { message: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
          return;
        }
        await this.handleToggleReady(socket, data.roomId);
      });

      socket.on('startGame', async (data: { roomId: string }) => {
        if (!socket.userData) {
          socket.emit('error', { message: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
          return;
        }
        await this.handleStartGame(socket, data);
      });

      socket.on('requestRoomList', async () => {
        await this.handleRequestRoomList(socket);
      });

      // Bid event
      socket.on('bid', (data) => this.handleBid(socket, data));

      // Play cards event
      socket.on('playCards', (data) => {
        console.log(`🎮 SocketService - Received 'playCards' event from ${socket.id}:`, data);
        this.handlePlayCards(socket, data);
      });

      // Pass turn event
      socket.on('pass', (data) => this.handlePass(socket, data));

      // Disconnection handler
      socket.on('disconnect', async (reason: string) => {
        console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
        await this.handleDisconnection(socket, reason);
      });
    });
  }

  private async handleAuthentication(socket: AuthenticatedSocket, token: string): Promise<void> {
    try {
      console.log(`🔐 SocketService - Authentication request from ${socket.id}`);
      const userData = verifyToken(token);
      if (!userData) {
        console.error('❌ SocketService - Invalid token during authentication');
        socket.emit('error', { message: 'Invalid token', code: 'INVALID_TOKEN' });
        return;
      }

      socket.userData = userData;
      
      // Join user-specific room for personalized game updates
      socket.join(`user_${userData.userId}`);
      console.log(`✅ SocketService - Socket ${socket.id} joined user room: user_${userData.userId}`);
      
      // Add to connected users map
      this.connectedUsers.set(socket.id, socket);

      // Update user online status
      const user = await User.findById(userData.userId);
      if (user) {
        await user.updateLoginStatus(true);
        
        // Update player connection status in room if they're in one
        const room = await Room.findOne({ 'players.userId': userData.userId });
        if (room) {
          await room.updatePlayerConnection(userData.userId, true);
          this.broadcastToRoom(room._id.toString(), 'roomUpdated', { room: room.toSafeObject() });
        }
      }

      socket.emit('authenticated', { 
        success: true, 
        user: { 
          id: userData.userId, 
          username: userData.username 
        } 
      });
      
      console.log(`✅ SocketService - User ${userData.username} authenticated and joined user room`);
    } catch (error) {
      console.error('❌ SocketService - Authentication error:', error);
      socket.emit('error', { message: 'Authentication failed', code: 'AUTH_ERROR' });
    }
  }

  private async handleJoinRoom(socket: AuthenticatedSocket, roomId: string): Promise<void> {
    try {
      if (!socket.userData) {
        socket.emit('error', { message: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
        return;
      }

      console.log(`🎮 SocketService - ${socket.userData.username} requesting to join room ${roomId}`);

      // Find room
      const room = await Room.findById(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found', code: 'ROOM_NOT_FOUND' });
        return;
      }

      // Check if player is already in room
      const existingPlayer = room.players.find(p => p.userId.toString() === socket.userData!.userId);
      if (existingPlayer) {
        // If player is already in room, just update their connection status and join socket room
        await room.updatePlayerConnection(socket.userData.userId, true);
        socket.join(`room_${roomId}`);
        
        // Broadcast room update
        this.broadcastToRoom(roomId, 'roomUpdated', { room: room.toSafeObject() });
        
        socket.emit('roomJoined', {
          success: true,
          room: room.toSafeObject()
        });
        return;
      }

      // Add player to room
      await room.addPlayer(socket.userData.userId, socket.userData.username);
      socket.join(`room_${roomId}`);

      // Update user's current room
      const user = await User.findById(socket.userData.userId);
      if (user) {
        await user.joinRoom(room._id);
      }

      // Broadcast room update and player joined event
      this.broadcastToRoom(roomId, 'roomUpdated', { room: room.toSafeObject() });
      this.broadcastToRoom(roomId, 'playerJoined', {
        room: room.toSafeObject(),
        player: {
          userId: socket.userData.userId,
          username: socket.userData.username
        }
      });

      // Broadcast updated room list to all users
      await this.broadcastRoomList();

      console.log(`✅ SocketService - ${socket.userData.username} joined room ${roomId}`);
    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to join room', 
        code: 'JOIN_ROOM_ERROR' 
      });
    }
  }

  private async handleLeaveRoom(socket: AuthenticatedSocket, roomId: string): Promise<void> {
    try {
      console.log(`🔍 handleLeaveRoom - User ${socket.userData!.username} leaving room ${roomId}`);
      
      const room = await Room.findById(roomId);
      if (!room) {
        console.log(`❌ handleLeaveRoom - Room not found: ${roomId}`);
        socket.emit('error', { message: 'Room not found', code: 'ROOM_NOT_FOUND' });
        return;
      }

      console.log(`🔍 handleLeaveRoom - Room found: ${room.roomName}, current players: ${room.players.length}`);
      console.log(`🔍 handleLeaveRoom - Players before removal:`, room.players.map(p => ({ userId: p.userId.toString(), username: p.username })));

      // Remove player from room
      const updatedRoom = await room.removePlayer(socket.userData!.userId as any);
      console.log(`✅ handleLeaveRoom - Player removed, remaining players: ${updatedRoom.players.length}`);
      console.log(`🔍 handleLeaveRoom - Players after removal:`, updatedRoom.players.map(p => ({ userId: p.userId.toString(), username: p.username })));

      // Update user's current room
      const user = await User.findById(socket.userData!.userId);
      if (user) {
        await user.leaveRoom();
        console.log(`✅ handleLeaveRoom - User ${socket.userData!.username} room status updated`);
      }

      // Leave socket room
      socket.leave(`room_${roomId}`);
      socket.userData!.roomId = undefined;
      console.log(`✅ handleLeaveRoom - Socket left room ${roomId}`);

      // Notify the leaving player immediately
      socket.emit('roomLeft', {
        roomId: roomId,
        message: 'Successfully left room'
      });

      // Broadcast to remaining players in room
      console.log(`🔍 handleLeaveRoom - Broadcasting roomUpdated to room_${roomId}`);
      this.io.to(`room_${roomId}`).emit('roomUpdated', {
        room: updatedRoom.toSafeObject()
      });

      console.log(`🔍 handleLeaveRoom - Broadcasting playerLeft to room_${roomId}`);
      this.io.to(`room_${roomId}`).emit('playerLeft', {
        room: updatedRoom.toSafeObject(),
        player: {
          userId: socket.userData!.userId,
          username: socket.userData!.username
        }
      });

      // Update room list for all clients
      console.log(`🔍 handleLeaveRoom - Broadcasting updated room list`);
      this.broadcastRoomList();

      console.log(`🎉 handleLeaveRoom - Successfully processed leave room for ${socket.userData!.username}`);

    } catch (error) {
      console.error('❌ Leave room error:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to leave room', 
        code: 'LEAVE_ROOM_ERROR' 
      });
    }
  }

  private async handleToggleReady(socket: AuthenticatedSocket, roomId: string): Promise<void> {
    try {
      const room = await Room.findById(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found', code: 'ROOM_NOT_FOUND' });
        return;
      }

      // Toggle player ready status
      const updatedRoom = await room.togglePlayerReady(socket.userData!.userId as any);
      
      // Find the player's new ready status
      const player = updatedRoom.players.find(p => p.userId.toString() === socket.userData!.userId);
      const isReady = player?.isReady || false;

      // Broadcast to room
      this.io.to(`room_${roomId}`).emit('roomUpdated', {
        room: updatedRoom.toSafeObject()
      });

      this.io.to(`room_${roomId}`).emit('playerReadyChanged', {
        room: updatedRoom.toSafeObject(),
        player: {
          userId: socket.userData!.userId,
          username: socket.userData!.username
        },
        isReady
      });

    } catch (error) {
      console.error('Toggle ready error:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to update ready status', 
        code: 'TOGGLE_READY_ERROR' 
      });
    }
  }

  // Add after the existing handleLeaveRoom method, before the broadcastRoomList method

  // Game Event Handlers
  private async handleStartGame(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      console.log(`🎮 SocketService - handleStartGame called with data:`, data);
      console.log(`🎮 SocketService - User: ${socket.userData!.username}, Room: ${data.roomId}`);
      
      if (this.gameService) {
        await this.gameService.handleStartGame(socket, data.roomId);
      } else {
        console.error('❌ SocketService - Game service not available');
        socket.emit('error', { message: 'Game service not available', code: 'GAME_SERVICE_UNAVAILABLE' });
      }
    } catch (error) {
      console.error('❌ SocketService - handleStartGame error:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to start game', 
        code: 'START_GAME_ERROR' 
      });
    }
  }

  private async handleBid(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      console.log(`🎮 SocketService.handleBid - Called with data:`, data);
      console.log(`🎮 SocketService.handleBid - Socket userData:`, socket.userData);
      
      if (!socket.userData) {
        console.error('🎮 SocketService.handleBid - No authentication data');
        socket.emit('error', { message: 'Authentication required', code: 'AUTH_REQUIRED' });
        return;
      }

      console.log(`🎮 SocketService.handleBid - ${socket.userData.username} bidding in room ${data.roomId}: ${data.amount}`);
      
      if (this.gameService) {
        console.log(`🎮 SocketService.handleBid - Calling gameService.handleBid...`);
        await this.gameService.handleBid(socket, data);
        console.log(`🎮 SocketService.handleBid - gameService.handleBid completed`);
      } else {
        console.error('🎮 SocketService.handleBid - Game service not available');
        socket.emit('error', { message: 'Game service not available', code: 'GAME_SERVICE_ERROR' });
      }
    } catch (error) {
      console.error('🎮 SocketService.handleBid - Error processing bid:', error);
      socket.emit('error', { message: error instanceof Error ? error.message : 'Failed to process bid', code: 'BID_ERROR' });
    }
  }

  private async handlePlayCards(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      console.log(`🎮 SocketService.handlePlayCards - Called with data:`, data);
      console.log(`🎮 SocketService.handlePlayCards - Socket userData:`, socket.userData);
      
      if (!socket.userData) {
        console.error('🎮 SocketService.handlePlayCards - No authentication data');
        socket.emit('error', { message: 'Authentication required', code: 'AUTH_REQUIRED' });
        return;
      }

      console.log(`🎮 SocketService.handlePlayCards - ${socket.userData.username} playing cards in room ${data.roomId}:`, data.cardIds);
      
      if (this.gameService) {
        console.log(`🎮 SocketService.handlePlayCards - Calling gameService.handlePlayCards...`);
        await this.gameService.handlePlayCards(socket, data);
        console.log(`🎮 SocketService.handlePlayCards - gameService.handlePlayCards completed`);
      } else {
        console.error('🎮 SocketService.handlePlayCards - Game service not available');
        socket.emit('error', { message: 'Game service not available', code: 'GAME_SERVICE_ERROR' });
      }
    } catch (error) {
      console.error('🎮 SocketService.handlePlayCards - Error processing play cards:', error);
      socket.emit('error', { message: error instanceof Error ? error.message : 'Failed to process play cards', code: 'PLAY_CARDS_ERROR' });
    }
  }

  private async handlePass(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      console.log(`🎮 ${socket.userData!.username} passing turn in room ${data.roomId}`);
      
      if (this.gameService) {
        await this.gameService.handlePass(socket, data);
      } else {
        socket.emit('error', { message: 'Game service not available' });
      }
    } catch (error) {
      console.error('Error passing turn:', error);
      socket.emit('error', { message: error instanceof Error ? error.message : 'Failed to pass turn', code: 'PASS_TURN_ERROR' });
    }
  }

  // Method to set game service reference
  public setGameService(gameService: any): void {
    this.gameService = gameService;
  }

  private async handleRequestRoomList(socket: AuthenticatedSocket): Promise<void> {
    try {
      const rooms = await Room.findAvailableRooms();
      socket.emit('roomListUpdated', {
        rooms: rooms.map(room => room.toSafeObject())
      });
    } catch (error) {
      console.error('Request room list error:', error);
      socket.emit('error', { 
        message: 'Failed to get room list', 
        code: 'ROOM_LIST_ERROR' 
      });
    }
  }

  private async handleDisconnection(socket: AuthenticatedSocket, reason: string): Promise<void> {
    if (socket.userData) {
      // Remove from connected users
      this.connectedUsers.delete(socket.id);

      // Update user offline status with a delay to handle quick reconnections (page refresh)
      const userData = socket.userData; // Capture userData before timeout
      setTimeout(async () => {
        try {
          // Check if user has any active sockets
          const hasActiveSockets = Array.from(this.connectedUsers.values()).some(
            s => s.userData?.userId === userData.userId
          );

          if (!hasActiveSockets) {
            const user = await User.findById(userData.userId);
            if (user) {
              await user.updateLoginStatus(false);
              
              // Update player connection status in room if they're in one
              const room = await Room.findOne({ 'players.userId': userData.userId });
              if (room) {
                await room.updatePlayerConnection(userData.userId, false);
                this.broadcastToRoom(room._id.toString(), 'roomUpdated', { room: room.toSafeObject() });
              }
              
              console.log(`🔌 User marked offline after timeout: ${userData.username}`);
            }
          } else {
            console.log(`🔌 User still has active connections: ${userData.username}`);
          }
        } catch (error) {
          console.error('Error updating user offline status:', error);
        }
      }, 5000); // 5 second delay to handle page refreshes

      console.log(`👋 User disconnected: ${socket.userData.username} (${socket.id})`);
    }
  }

  private async broadcastRoomList(): Promise<void> {
    try {
      console.log('📡 Broadcasting room list to all connected users');
      
      // For each connected user, send their personalized room list
      for (const [socketId, socket] of this.connectedUsers) {
        try {
          if (!socket.userData) {
            console.log(`⚠️ Socket ${socketId} has no user data, skipping`);
            continue;
          }

          const rooms = await Room.findVisibleRooms(socket.userData.userId);
          socket.emit('roomListUpdated', {
            rooms: rooms.map(room => room.toSafeObject())
          });
          
          console.log(`✅ Sent ${rooms.length} rooms to user ${socket.userData.username} (${socketId})`);
        } catch (error) {
          console.error(`❌ Failed to send room list to ${socket.userData?.username || socketId}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Failed to broadcast room list:', error);
    }
  }

  private broadcastToRoom(roomId: string, event: keyof ServerToClientEvents, data: any): void {
    const roomName = `room_${roomId}`;
    console.log(`🔊 Broadcasting '${event}' to room '${roomName}'`);
    this.io.to(roomName).emit(event, data);
  }

  // Public methods for external use
  public async notifyRoomUpdate(roomId: string): Promise<void> {
    try {
      const room = await Room.findById(roomId);
      if (room) {
        this.io.to(`room_${roomId}`).emit('roomUpdated', {
          room: room.toSafeObject()
        });
      }
    } catch (error) {
      console.error('Notify room update error:', error);
    }
  }

  public getUserSocket(userId: string): AuthenticatedSocket | undefined {
    return this.connectedUsers.get(userId);
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }
} 