import { Server as SocketIOServer, Socket } from 'socket.io';
import { Room } from '../models/Room';
import { User } from '../models/User';
import { verifyToken, TokenPayload } from '../utils/auth';

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
      const room = await Room.findById(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found', code: 'ROOM_NOT_FOUND' });
        return;
      }

      // Add player to room
      const updatedRoom = await room.addPlayer(
        socket.userData!.userId as any,
        socket.userData!.username
      );

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
      console.error('Join room error:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to join room', 
        code: 'JOIN_ROOM_ERROR' 
      });
    }
  }

  private async handleLeaveRoom(socket: AuthenticatedSocket, roomId: string): Promise<void> {
    try {
      const room = await Room.findById(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found', code: 'ROOM_NOT_FOUND' });
        return;
      }

      // Remove player from room
      const updatedRoom = await room.removePlayer(socket.userData!.userId as any);

      // Update user's current room
      const user = await User.findById(socket.userData!.userId);
      if (user) {
        await user.leaveRoom();
      }

      // Leave socket room
      socket.leave(`room_${roomId}`);
      socket.userData!.roomId = undefined;

      // Broadcast to room
      this.io.to(`room_${roomId}`).emit('roomUpdated', {
        room: updatedRoom.toSafeObject()
      });

      this.io.to(`room_${roomId}`).emit('playerLeft', {
        room: updatedRoom.toSafeObject(),
        player: {
          userId: socket.userData!.userId,
          username: socket.userData!.username
        }
      });

      // Update room list for all clients
      this.broadcastRoomList();

    } catch (error) {
      console.error('Leave room error:', error);
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

      // Update user offline status
      try {
        const user = await User.findById(socket.userData.userId);
        if (user) {
          await user.updateLoginStatus(false);
        }
      } catch (error) {
        console.error('Error updating user offline status:', error);
      }

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