import { io, Socket } from 'socket.io-client';

// Data Type Definitions
export interface User {
  id: string;
  username: string;
  roomId?: string | null;
}

export interface Player {
  userId: string;
  username: string;
  isReady: boolean;
  isConnected: boolean;
}

export interface Room {
  id: string;
  name: string;
  maxPlayers: number;
  currentPlayerCount: number;
  status: 'waiting' | 'playing' | 'finished';
  createdBy: string;
  players: Player[];
  isPrivate: boolean;
  createdAt: string;
}

export interface AuthenticationData {
  success: boolean;
  user?: User;
  error?: string;
}

export interface RoomEventData {
  room: Room;
}

export interface PlayerEventData {
  room: Room;
  player: Player;
}

export interface PlayerReadyEventData {
  room: Room;
  player: Player;
  isReady: boolean;
}

export interface RoomListEventData {
  rooms: Room[];
}

export interface ErrorEventData {
  message: string;
  code: string;
}

// Server Event Types (matching server-side interface)
export interface ServerToClientEvents {
  authenticated: (data: AuthenticationData) => void;
  roomUpdated: (data: RoomEventData) => void;
  roomListUpdated: (data: RoomListEventData) => void;
  playerJoined: (data: PlayerEventData) => void;
  playerLeft: (data: PlayerEventData) => void;
  playerReadyChanged: (data: PlayerReadyEventData) => void;
  gameStarted: (data: RoomEventData) => void;
  error: (data: ErrorEventData) => void;
}

// Client Event Types (matching server-side interface)
export interface ClientToServerEvents {
  authenticate: (data: { token: string }) => void;
  joinRoom: (data: { roomId: string }) => void;
  leaveRoom: (data: { roomId: string }) => void;
  toggleReady: (data: { roomId: string }) => void;
  startGame: (data: { roomId: string }) => void;
  requestRoomList: () => void;
}

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface SocketConnectionConfig {
  serverUrl: string;
  autoConnect: boolean;
  reconnection: boolean;
  reconnectionAttempts: number;
  reconnectionDelay: number;
  reconnectionDelayMax: number;
  randomizationFactor: number;
  timeout: number;
}

export interface SocketState {
  isConnected: boolean;
  isAuthenticated: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  connectionError: string | null;
  reconnectAttempts: number;
  lastConnectedAt: Date | null;
  socketId: string | null;
}

export type SocketEventCallback<T = unknown> = (data: T) => void;

export class SocketService {
  private socket: TypedSocket | null = null;
  private config: SocketConnectionConfig;
  private eventListeners: Map<string, Set<SocketEventCallback<unknown>>> = new Map();
  private authToken: string | null = null;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private currentState: SocketState = {
    isConnected: false,
    isAuthenticated: false,
    isConnecting: false,
    isReconnecting: false,
    connectionError: null,
    reconnectAttempts: 0,
    lastConnectedAt: null,
    socketId: null
  };

  constructor(config?: Partial<SocketConnectionConfig>) {
    this.config = {
      serverUrl: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
      timeout: 20000,
      ...config
    };

    // Auto-connect on instantiation if enabled
    if (this.config.autoConnect && typeof window !== 'undefined') {
      this.connect();
    }
  }

  // Connection Management
  public connect(token?: string): Promise<boolean> {
    if (this.socket?.connected && this.currentState.isAuthenticated) {
      console.log('🔌 SocketService - Already connected and authenticated');
      return Promise.resolve(true);
    }

    return new Promise((resolve, reject) => {
      console.log('🔌 SocketService - Connecting to server...', this.config.serverUrl);
      
      this.updateState({ isConnecting: true, connectionError: null });

      if (token) {
        this.authToken = token;
      }

      try {
        this.socket = io(this.config.serverUrl, {
          autoConnect: true,
          reconnection: this.config.reconnection,
          reconnectionAttempts: this.config.reconnectionAttempts,
          reconnectionDelay: this.config.reconnectionDelay,
          reconnectionDelayMax: this.config.reconnectionDelayMax,
          randomizationFactor: this.config.randomizationFactor,
          timeout: this.config.timeout,
          transports: ['websocket', 'polling'],
        });

        this.setupSocketEventHandlers();

        // Connection success handler
        const onConnect = () => {
          console.log('✅ SocketService - Connected to server', this.socket?.id);
          this.updateState({
            isConnected: true,
            isConnecting: false,
            connectionError: null,
            reconnectAttempts: 0,
            lastConnectedAt: new Date(),
            socketId: this.socket?.id || null
          });

          // Auto-authenticate if token available
          if (this.authToken) {
            console.log('🔌 SocketService - Auto-authenticating with token');
            this.authenticate(this.authToken).then((success) => {
              resolve(success);
            }).catch((error) => {
              // Don't reject on authentication failure, just resolve connection success
              console.warn('🔌 SocketService - Auto-authentication failed, but connection successful:', error);
              resolve(true);
            });
          } else {
            resolve(true);
          }
        };

        // Handle initial authentication request
        const onInitialAuth = (data: AuthenticationData) => {
          if (!data.success && data.error === 'Please authenticate' && this.authToken) {
            console.log('🔌 SocketService - Server requesting authentication, auto-authenticating');
            this.socket?.emit('authenticate', { token: this.authToken });
          }
        };

        // Connection error handler
        const onConnectError = (error: Error) => {
          console.error('❌ SocketService - Connection error:', error);
          this.updateState({
            isConnecting: false,
            connectionError: error.message || 'Connection failed'
          });
          reject(error);
        };

        this.socket.once('connect', onConnect);
        this.socket.once('connect_error', onConnectError);
        this.socket.once('authenticated', onInitialAuth);

      } catch (error) {
        console.error('❌ SocketService - Connection setup error:', error);
        this.updateState({
          isConnecting: false,
          connectionError: error instanceof Error ? error.message : 'Connection setup failed'
        });
        reject(error);
      }
    });
  }

  public disconnect(): void {
    console.log('🔌 SocketService - Disconnecting...');
    
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.updateState({
      isConnected: false,
      isAuthenticated: false,
      isConnecting: false,
      isReconnecting: false,
      connectionError: null,
      socketId: null
    });

    this.authToken = null;
  }

  // Authentication
  public authenticate(token: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.authToken = token;

      const onAuthenticated = (data: AuthenticationData) => {
        if (data.success) {
          console.log('✅ SocketService - Authentication successful', data.user);
          this.updateState({ isAuthenticated: true });
          resolve(true);
        } else {
          // Don't treat initial "Please authenticate" as an error
          if (data.error === 'Please authenticate') {
            console.log('🔌 SocketService - Server requesting authentication');
            // Just emit the authenticate event, don't reject
            this.socket?.emit('authenticate', { token });
            return;
          }
          
          console.error('❌ SocketService - Authentication failed:', data.error);
          this.updateState({ isAuthenticated: false });
          reject(new Error(data.error || 'Authentication failed'));
        }
      };

      this.socket.on('authenticated', onAuthenticated);
      this.socket.emit('authenticate', { token });

      // Timeout for authentication
      setTimeout(() => {
        this.socket?.off('authenticated', onAuthenticated);
        reject(new Error('Authentication timeout'));
      }, 10000);
    });
  }

  // Socket Event Handlers
  private setupSocketEventHandlers(): void {
    if (!this.socket) return;

    // Use raw socket reference for reserved Socket.IO events
    const rawSocket = this.socket as Socket;

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔌 SocketService - Connected');
      this.updateState({
        isConnected: true,
        isReconnecting: false,
        connectionError: null,
        socketId: this.socket?.id || null
      });
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('🔌 SocketService - Disconnected:', reason);
      this.updateState({
        isConnected: false,
        isAuthenticated: false,
        socketId: null
      });

      // Handle reconnection for specific disconnect reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't auto-reconnect
        console.log('🔌 SocketService - Server initiated disconnect, not reconnecting');
      } else {
        // Client or network issue, attempt reconnection
        this.handleReconnection();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ SocketService - Connection error:', error);
      this.updateState({
        connectionError: error.message || 'Connection error',
        isConnecting: false
      });
    });

    // Socket.IO reserved events using raw socket
    rawSocket.on('reconnect', (attemptNumber: number) => {
      console.log(`🔄 SocketService - Reconnected after ${attemptNumber} attempts`);
      this.updateState({
        isReconnecting: false,
        reconnectAttempts: 0,
        connectionError: null
      });

      // Re-authenticate after reconnection
      if (this.authToken) {
        this.authenticate(this.authToken).catch((error) => {
          console.error('❌ SocketService - Re-authentication failed:', error);
        });
      }
    });

    rawSocket.on('reconnect_error', (error: Error) => {
      console.error('❌ SocketService - Reconnection error:', error);
      this.updateState({
        reconnectAttempts: this.currentState.reconnectAttempts + 1
      });
    });

    rawSocket.on('reconnect_failed', () => {
      console.error('❌ SocketService - Reconnection failed after all attempts');
      this.updateState({
        isReconnecting: false,
        connectionError: 'Failed to reconnect to server'
      });
    });

    // Server events
    this.socket.on('error', (data: ErrorEventData) => {
      console.error('❌ SocketService - Server error:', data);
      this.notifyListeners('error', data);
    });

    this.socket.on('roomUpdated', (data: RoomEventData) => {
      console.log('🏠 SocketService - Room updated:', data.room?.id);
      this.notifyListeners('roomUpdated', data);
    });

    this.socket.on('roomListUpdated', (data: RoomListEventData) => {
      console.log('📋 SocketService - Room list updated:', data.rooms?.length, 'rooms');
      this.notifyListeners('roomListUpdated', data);
    });

    this.socket.on('playerJoined', (data: PlayerEventData) => {
      console.log('👤 SocketService - Player joined:', data.player?.username);
      this.notifyListeners('playerJoined', data);
    });

    this.socket.on('playerLeft', (data: PlayerEventData) => {
      console.log('👤 SocketService - Player left:', data.player?.username);
      this.notifyListeners('playerLeft', data);
    });

    this.socket.on('playerReadyChanged', (data: PlayerReadyEventData) => {
      console.log('👤 SocketService - Player ready changed:', data.player?.username, data.isReady);
      this.notifyListeners('playerReadyChanged', data);
    });

    this.socket.on('gameStarted', (data: RoomEventData) => {
      console.log('🎮 SocketService - Game started:', data.room?.id);
      this.notifyListeners('gameStarted', data);
    });
  }

  // Reconnection with exponential backoff
  private handleReconnection(): void {
    if (!this.config.reconnection || this.currentState.reconnectAttempts >= this.config.reconnectionAttempts) {
      console.log('🔌 SocketService - Max reconnection attempts reached');
      return;
    }

    this.updateState({ isReconnecting: true });

    const delay = Math.min(
      this.config.reconnectionDelay * Math.pow(2, this.currentState.reconnectAttempts),
      this.config.reconnectionDelayMax
    );

    const jitter = delay * this.config.randomizationFactor * Math.random();
    const reconnectDelay = delay + jitter;

    console.log(`🔄 SocketService - Reconnecting in ${Math.round(reconnectDelay)}ms (attempt ${this.currentState.reconnectAttempts + 1})`);

    this.reconnectTimeoutId = setTimeout(() => {
      this.updateState({ reconnectAttempts: this.currentState.reconnectAttempts + 1 });
      this.connect(this.authToken || undefined).catch((error) => {
        console.error('❌ SocketService - Reconnection failed:', error);
        this.handleReconnection();
      });
    }, reconnectDelay);
  }

  // Event Management
  public on<T = unknown>(event: string, callback: SocketEventCallback<T>): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback as SocketEventCallback<unknown>);
  }

  public off<T = unknown>(event: string, callback: SocketEventCallback<T>): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback as SocketEventCallback<unknown>);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  private notifyListeners(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ SocketService - Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Room Operations
  public joinRoom(roomId: string): void {
    if (!this.socket || !this.currentState.isAuthenticated) {
      throw new Error('Socket not connected or not authenticated');
    }
    this.socket.emit('joinRoom', { roomId });
  }

  public leaveRoom(roomId: string): void {
    if (!this.socket || !this.currentState.isAuthenticated) {
      throw new Error('Socket not connected or not authenticated');
    }
    this.socket.emit('leaveRoom', { roomId });
  }

  public toggleReady(roomId: string): void {
    if (!this.socket || !this.currentState.isAuthenticated) {
      throw new Error('Socket not connected or not authenticated');
    }
    this.socket.emit('toggleReady', { roomId });
  }

  public startGame(roomId: string): void {
    if (!this.socket || !this.currentState.isAuthenticated) {
      throw new Error('Socket not connected or not authenticated');
    }
    this.socket.emit('startGame', { roomId });
  }

  public requestRoomList(): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('requestRoomList');
  }

  // State Management
  private updateState(updates: Partial<SocketState>): void {
    this.currentState = { ...this.currentState, ...updates };
    this.notifyListeners('stateChange', this.currentState);
  }

  public getState(): SocketState {
    return { ...this.currentState };
  }

  // Utility Methods
  public isConnected(): boolean {
    return this.currentState.isConnected;
  }

  public isAuthenticated(): boolean {
    return this.currentState.isAuthenticated;
  }

  public getSocketId(): string | null {
    return this.currentState.socketId;
  }
} 