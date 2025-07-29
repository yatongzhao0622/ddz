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
}

export interface ServerToClientEvents {
  authenticated: (data: { success: boolean; user?: any; error?: string }) => void;
  roomUpdated: (data: { room: any }) => void;
  roomListUpdated: (data: { rooms: any[] }) => void;
  playerJoined: (data: { room: any; player: any }) => void;
  playerLeft: (data: { room: any; player: any }) => void;
  playerReadyChanged: (data: { room: any; player: any; isReady: boolean }) => void;
  gameStarted: (data: { room: any }) => void;
  error: (data: { message: string; code: string }) => void;
}

// Socket user data interface
interface SocketUserData {
  userId: string;
  username: string;
  roomId?: string;
}

// Extend Socket interface
interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  userData?: SocketUserData;
}

export class SocketService {
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();

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

      // Authentication handler
      socket.on('authenticate', async (data: { token: string }) => {
        try {
          await this.handleAuthentication(socket, data.token);
        } catch (error) {
          console.error('Socket authentication error:', error);
          socket.emit('authenticated', {
            success: false,
            error: 'Authentication failed'
          });
        }
      });

      // Room event handlers (require authentication)
      socket.on('joinRoom', async (data: { roomId: string }) => {
        if (!socket.userData) {
          socket.emit('error', { message: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
          return;
        }
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
        await this.handleStartGame(socket, data.roomId);
      });

      socket.on('requestRoomList', async () => {
        await this.handleRequestRoomList(socket);
      });

      // Disconnection handler
      socket.on('disconnect', async (reason: string) => {
        console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
        await this.handleDisconnection(socket, reason);
      });
    });
  }

  private async handleAuthentication(socket: AuthenticatedSocket, token: string): Promise<void> {
    try {
      // Verify token
      const payload = verifyToken(token);
      if (!payload) {
        socket.emit('authenticated', {
          success: false,
          error: 'Invalid token'
        });
        return;
      }

      // Get user from database
      const user = await User.findById(payload.userId);
      if (!user) {
        socket.emit('authenticated', {
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Update user online status
      await user.updateLoginStatus(true);

      // Store user data in socket
      socket.userData = {
        userId: user._id.toString(),
        username: user.username,
        roomId: user.currentRoomId?.toString()
      };

      // Track connected user
      this.connectedUsers.set(socket.userData.userId, socket);

      // Join user's current room if they have one
      if (socket.userData.roomId) {
        socket.join(`room_${socket.userData.roomId}`);
      }

      socket.emit('authenticated', {
        success: true,
        user: {
          id: user._id,
          username: user.username,
          roomId: user.currentRoomId?.toString() || null
        }
      });

      console.log(`✅ User authenticated: ${user.username} (${socket.id})`);
    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('authenticated', {
        success: false,
        error: 'Authentication failed'
      });
    }
  }

  private async handleJoinRoom(socket: AuthenticatedSocket, roomId: string): Promise<void> {
    try {
      console.log(`🔍 handleJoinRoom - Attempting to join room: ${roomId}`);
      console.log(`🔍 handleJoinRoom - Room ID type: ${typeof roomId}, length: ${roomId.length}`);
      
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        console.log(`❌ handleJoinRoom - Invalid ObjectId format: ${roomId}`);
        socket.emit('error', { message: 'Invalid room ID format', code: 'INVALID_ROOM_ID' });
        return;
      }
      
      const room = await Room.findById(roomId);
      if (!room) {
        console.log(`❌ handleJoinRoom - Room not found for ID: ${roomId}`);
        
        // List all rooms for debugging
        const allRooms = await Room.find({}).select('_id roomName');
        console.log(`🔍 handleJoinRoom - Available rooms:`, allRooms.map(r => ({ id: r._id.toString(), name: r.roomName })));
        
        socket.emit('error', { message: 'Room not found', code: 'ROOM_NOT_FOUND' });
        return;
      }

      console.log(`✅ handleJoinRoom - Found room: ${room.roomName} (${room._id})`);

      // Check if player can join room
      if (room.status !== 'waiting') {
        console.log(`❌ handleJoinRoom - Room is not in waiting status: ${room.status}`);
        socket.emit('error', { message: 'Room is not accepting new players', code: 'ROOM_NOT_WAITING' });
        return;
      }

      if (room.players.length >= room.maxPlayers) {
        console.log(`❌ handleJoinRoom - Room is full: ${room.players.length}/${room.maxPlayers}`);
        socket.emit('error', { message: 'Room is full', code: 'ROOM_FULL' });
        return;
      }

      // Check if player is already in room
      const existingPlayer = room.players.find(p => p.userId.toString() === socket.userData!.userId);
      if (existingPlayer) {
        console.log(`✅ handleJoinRoom - Player already in room, updating connection`);
        // Player already in room, just join the socket room
        socket.join(`room_${roomId}`);
        socket.userData!.roomId = roomId;
        
        // Send current room state to the player who just connected
        socket.emit('roomUpdated', {
          room: room.toSafeObject()
        });
        
        // Also broadcast that the player reconnected (to update connection status)
        this.io.to(`room_${roomId}`).emit('playerJoined', {
          room: room.toSafeObject(),
          player: {
            userId: socket.userData!.userId,
            username: socket.userData!.username,
            isReady: existingPlayer.isReady,
            isConnected: true
          }
        });
        
        // Update room list for all clients
        this.broadcastRoomList();
        return;
      }

      // Add player to room
      const updatedRoom = await room.addPlayer(
        socket.userData!.userId as any,
        socket.userData!.username
      );

      console.log(`✅ handleJoinRoom - Player ${socket.userData!.username} added to room`);

      // Update user's current room
      const user = await User.findById(socket.userData!.userId);
      if (user) {
        await user.joinRoom(room._id);
      }

      // Join socket room
      socket.join(`room_${roomId}`);
      socket.userData!.roomId = roomId;

      // Broadcast to room
      this.io.to(`room_${roomId}`).emit('roomUpdated', {
        room: updatedRoom.toSafeObject()
      });

      this.io.to(`room_${roomId}`).emit('playerJoined', {
        room: updatedRoom.toSafeObject(),
        player: {
          userId: socket.userData!.userId,
          username: socket.userData!.username
        }
      });

      // Update room list for all clients
      this.broadcastRoomList();

    } catch (error) {
      console.error('❌ handleJoinRoom error:', error);
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

  private async handleStartGame(socket: AuthenticatedSocket, roomId: string): Promise<void> {
    try {
      const room = await Room.findById(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found', code: 'ROOM_NOT_FOUND' });
        return;
      }

      // Check if user is room creator
      if (room.createdBy.toString() !== socket.userData!.userId) {
        socket.emit('error', { 
          message: 'Only room creator can start the game', 
          code: 'NOT_ROOM_CREATOR' 
        });
        return;
      }

      // Start game
      const updatedRoom = await room.startGame();

      // Broadcast to room
      this.io.to(`room_${roomId}`).emit('gameStarted', {
        room: updatedRoom.toSafeObject()
      });

      this.io.to(`room_${roomId}`).emit('roomUpdated', {
        room: updatedRoom.toSafeObject()
      });

      // Update room list for all clients
      this.broadcastRoomList();

    } catch (error) {
      console.error('Start game error:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to start game', 
        code: 'START_GAME_ERROR' 
      });
    }
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
      this.connectedUsers.delete(socket.userData.userId);

      // Update user offline status with a delay to handle quick reconnections (page refresh)
      const userData = socket.userData; // Capture userData before timeout
      setTimeout(async () => {
        try {
          // Check if user reconnected in the meantime
          if (!this.connectedUsers.has(userData.userId)) {
            const user = await User.findById(userData.userId);
            if (user) {
              await user.updateLoginStatus(false);
              console.log(`🔌 User marked offline after timeout: ${userData.username}`);
            }
          } else {
            console.log(`🔌 User reconnected, not marking offline: ${userData.username}`);
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
      const rooms = await Room.findAvailableRooms();
      this.io.emit('roomListUpdated', {
        rooms: rooms.map(room => room.toSafeObject())
      });
    } catch (error) {
      console.error('Broadcast room list error:', error);
    }
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