import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Room, Player } from '../../services/socketService';
import { roomService, ApiRoom } from '../../services/roomService';
import { RoomCreationData } from '../../components/rooms/CreateRoomModal';

// Helper function to convert API room to client room format
const convertApiRoomToRoom = (apiRoom: ApiRoom): Room => {
  console.log('🔍 convertApiRoomToRoom - Converting:', apiRoom);
  
  const convertedRoom: Room = {
    id: apiRoom.id,
    name: apiRoom.name,
    maxPlayers: apiRoom.maxPlayers,
    currentPlayerCount: apiRoom.currentPlayerCount,
    status: apiRoom.status,
    createdBy: apiRoom.createdBy,
    players: apiRoom.players.map(p => ({
      userId: p.userId,
      username: p.username,
      isReady: p.isReady,
      isConnected: p.isConnected
    })),
    isPrivate: apiRoom.isPrivate,
    createdAt: apiRoom.createdAt
  };
  
  console.log('🔍 convertApiRoomToRoom - Converted to:', convertedRoom);
  return convertedRoom;
};

// Rooms Redux State Interface
interface RoomsState {
  // Room list
  availableRooms: Room[];
  isLoadingRooms: boolean;
  roomsError: string | null;
  
  // Current room state
  currentRoom: Room | null;
  isJoiningRoom: boolean;
  isLeavingRoom: boolean;
  roomActionError: string | null;
  
  // Player state in current room
  currentUserReady: boolean;
  isTogglingReady: boolean;
  
  // Game state
  isStartingGame: boolean;
  gameStartError: string | null;
  
  // Room creation
  isCreatingRoom: boolean;
  roomCreationError: string | null;
  
  // Real-time updates
  lastRoomUpdate: Date | null;
  lastPlayerJoined: Player | null;
  lastPlayerLeft: Player | null;
  needsGameStateRestore: boolean;
  gameSessionToRestore: any;
}

const initialState: RoomsState = {
  availableRooms: [],
  isLoadingRooms: false,
  roomsError: null,
  
  currentRoom: null as Room | null,
  isJoiningRoom: false,
  isLeavingRoom: false,
  roomActionError: null,
  
  currentUserReady: false,
  isTogglingReady: false,
  
  isStartingGame: false,
  gameStartError: null,
  
  isCreatingRoom: false,
  roomCreationError: null,
  
  lastRoomUpdate: null,
  lastPlayerJoined: null,
  lastPlayerLeft: null,
  needsGameStateRestore: false,
  gameSessionToRestore: null as string | null
};

// API-based Async Thunks for Room Operations
export const createRoom = createAsyncThunk(
  'rooms/create',
  async (roomData: RoomCreationData, { rejectWithValue }) => {
    try {
      const apiRoom = await roomService.createRoom(roomData);
      const room = convertApiRoomToRoom(apiRoom);
      
      // After creating room via API, join it via Socket.IO for real-time updates
      if (typeof window !== 'undefined') {
        const { socketService } = await import('../../services/socketServiceInstance');
        if (socketService.isAuthenticated()) {
          socketService.joinRoom(room.id);
        }
      }
      
      return room;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create room');
    }
  }
);

export const loadAvailableRooms = createAsyncThunk(
  'rooms/loadAvailable',
  async (_, { rejectWithValue }) => {
    try {
      const apiRooms = await roomService.getAvailableRooms();
      return apiRooms.map(convertApiRoomToRoom);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load rooms');
    }
  }
);

// Socket-based Async Thunks for Real-time Operations  
export const requestRoomList = createAsyncThunk(
  'rooms/requestList',
  async (_, { rejectWithValue }) => {
    try {
      if (typeof window === 'undefined') {
        return rejectWithValue('Not available on server side');
      }
      
      const { socketService } = await import('../../services/socketServiceInstance');
      
      if (!socketService.isConnected()) {
        return rejectWithValue('Not connected to server');
      }
      
      socketService.requestRoomList();
      return true;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to request room list');
    }
  }
);

export const joinRoom = createAsyncThunk(
  'rooms/join',
  async (roomId: string, { rejectWithValue }) => {
    try {
      console.log('🔍 Redux joinRoom - Attempting to join room:', roomId);
      
      if (typeof window === 'undefined') {
        return rejectWithValue('Not available on server side');
      }
      
      const { socketService } = await import('../../services/socketServiceInstance');
      
      if (!socketService.isAuthenticated()) {
        return rejectWithValue('Not authenticated');
      }
      
      console.log('🔍 Redux joinRoom - Emitting joinRoom via Socket.IO:', roomId);
      socketService.joinRoom(roomId);
      return roomId;
    } catch (error) {
      console.error('❌ Redux joinRoom - Error:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to join room');
    }
  }
);

export const leaveRoom = createAsyncThunk(
  'rooms/leave',
  async (roomId: string, { rejectWithValue }) => {
    try {
      if (typeof window === 'undefined') {
        return rejectWithValue('Not available on server side');
      }
      
      const { socketService } = await import('../../services/socketServiceInstance');
      
      if (!socketService.isAuthenticated()) {
        return rejectWithValue('Not authenticated');
      }
      
      socketService.leaveRoom(roomId);
      return roomId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to leave room');
    }
  }
);

export const toggleReady = createAsyncThunk(
  'rooms/toggleReady',
  async (roomId: string, { rejectWithValue }) => {
    try {
      if (typeof window === 'undefined') {
        return rejectWithValue('Not available on server side');
      }
      
      const { socketService } = await import('../../services/socketServiceInstance');
      
      if (!socketService.isAuthenticated()) {
        return rejectWithValue('Not authenticated');
      }
      
      socketService.toggleReady(roomId);
      return roomId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to toggle ready state');
    }
  }
);

export const startGame = createAsyncThunk(
  'rooms/startGame',
  async (roomId: string, { rejectWithValue }) => {
    try {
      console.log('🎮 startGame thunk - Starting game for room:', roomId);
      
      if (typeof window === 'undefined') {
        console.error('🎮 startGame thunk - Not in browser environment');
        return rejectWithValue('Not available on server side');
      }
      
      const { socketService } = await import('../../services/socketServiceInstance');
      
      if (!socketService.isAuthenticated()) {
        console.error('🎮 startGame thunk - Not authenticated');
        return rejectWithValue('Not authenticated');
      }
      
      console.log('🎮 startGame thunk - Calling socketService.startGame');
      socketService.startGame(roomId);
      console.log('🎮 startGame thunk - startGame called successfully');
      return roomId;
    } catch (error) {
      console.error('🎮 startGame thunk - Error:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to start game');
    }
  }
);

// Rooms Slice
const roomsSlice = createSlice({
  name: 'rooms',
  initialState,
  reducers: {
    // Real-time room list updates
    updateRoomList: (state, action: PayloadAction<Room[]>) => {
      state.availableRooms = action.payload;
      state.lastRoomUpdate = new Date();
      state.roomsError = null;
    },

    // Real-time room updates
    updateCurrentRoom: (state, action: PayloadAction<Room>) => {
      const room = action.payload;
      console.log('🔧 Redux updateCurrentRoom - Setting current room:', room?.id);
      console.log('🔧 Redux updateCurrentRoom - Room players:', room?.players);
      console.log('🔧 Redux updateCurrentRoom - Room status:', room?.status);
      console.log('🔧 Redux updateCurrentRoom - Room gameSession:', (room as any)?.gameSession);
      
      state.currentRoom = room;
      state.lastRoomUpdate = new Date();
      state.roomActionError = null;
      
      // Check if this room has an active game session
      if (room?.status === 'playing' && (room as any)?.gameSession) {
        console.log('🎮 Redux updateCurrentRoom - Room has active game session, should restore game state');
        // Set a flag that middleware can detect to restore game state
        state.needsGameStateRestore = true;
        state.gameSessionToRestore = (room as any).gameSession;
      }
      
      // Update current user ready state if we're in this room
      if (state.currentRoom) {
        // This would be set based on the current user ID from auth state
        // For now, we'll handle this in the component or via middleware
      }
    },

    // Player joined event
    playerJoined: (state, action: PayloadAction<{ room: Room; player: Player }>) => {
      const { room, player } = action.payload;
      console.log('🔧 Redux playerJoined - Player:', player.username, 'Room:', room?.id);
      state.currentRoom = room;
      state.lastPlayerJoined = player;
      state.lastRoomUpdate = new Date();
    },

    // Player left event
    playerLeft: (state, action: PayloadAction<{ room: Room; player: Player }>) => {
      const { room, player } = action.payload;
      state.currentRoom = room;
      state.lastPlayerLeft = player;
      state.lastRoomUpdate = new Date();
    },

    // Player ready changed event
    playerReadyChanged: (state, action: PayloadAction<{ room: Room; player: Player; isReady: boolean }>) => {
      const { room } = action.payload;
      state.currentRoom = room;
      state.lastRoomUpdate = new Date();
    },

    // Game started event
    gameStarted: (state, action: PayloadAction<{ room: Room; game: any; message: string }>) => {
      const { room, game, message } = action.payload;
      console.log('🎮 Redux gameStarted - Game started for room:', room?.id);
      console.log('🎮 Redux gameStarted - Game data:', game);
      
      // Update room status to playing
      if (room) {
        state.currentRoom = { ...room, status: 'playing' };
        console.log('🎮 Redux gameStarted - Updated room status to playing');
      }
      
      // Clear any room-related loading states
      state.isStartingGame = false;
      state.gameStartError = null;
      state.lastRoomUpdate = new Date();
      
      console.log('🎮 Redux gameStarted - Room updated, ready for game UI');
    },

    // Set current user ready state
    setCurrentUserReady: (state, action: PayloadAction<boolean>) => {
      state.currentUserReady = action.payload;
    },

    // Clear room errors
    clearRoomErrors: (state) => {
      state.roomsError = null;
      state.roomActionError = null;
      state.gameStartError = null;
      state.roomCreationError = null;
    },

    // Clear current room and game state
    clearCurrentRoom: (state) => {
      console.log('🔧 Redux - Clearing current room state');
      state.currentRoom = null;
      state.currentUserReady = false;
      state.lastPlayerJoined = null;
      state.lastPlayerLeft = null;
      state.isJoiningRoom = false;
      state.isLeavingRoom = false;
      state.isTogglingReady = false;
      state.isStartingGame = false;
      state.roomActionError = null;
      state.gameStartError = null;
    },

    // Clear game state restore flag
    clearGameStateRestoreFlag: (state) => {
      state.needsGameStateRestore = false;
      state.gameSessionToRestore = null;
    },

    // Reset rooms state
    resetRoomsState: (state) => {
      Object.assign(state, initialState);
    }
  },
  extraReducers: (builder) => {
    // Create Room
    builder
      .addCase(createRoom.pending, (state) => {
        state.isCreatingRoom = true;
        state.roomCreationError = null;
      })
      .addCase(createRoom.fulfilled, (state, action) => {
        state.isCreatingRoom = false;
        state.roomCreationError = null;
        state.currentRoom = action.payload;
        // Add to available rooms list if not already there
        const exists = state.availableRooms.find(room => room.id === action.payload.id);
        if (!exists) {
          state.availableRooms.unshift(action.payload);
        }
      })
      .addCase(createRoom.rejected, (state, action) => {
        state.isCreatingRoom = false;
        state.roomCreationError = action.payload as string;
      });

    // Load Available Rooms
    builder
      .addCase(loadAvailableRooms.pending, (state) => {
        state.isLoadingRooms = true;
        state.roomsError = null;
      })
      .addCase(loadAvailableRooms.fulfilled, (state, action) => {
        state.isLoadingRooms = false;
        state.roomsError = null;
        state.availableRooms = action.payload;
      })
      .addCase(loadAvailableRooms.rejected, (state, action) => {
        state.isLoadingRooms = false;
        state.roomsError = action.payload as string;
      });

    // Request Room List
    builder
      .addCase(requestRoomList.pending, (state) => {
        state.isLoadingRooms = true;
        state.roomsError = null;
      })
      .addCase(requestRoomList.fulfilled, (state) => {
        state.isLoadingRooms = false;
        state.roomsError = null;
      })
      .addCase(requestRoomList.rejected, (state, action) => {
        state.isLoadingRooms = false;
        state.roomsError = action.payload as string;
      });

    // Join Room
    builder
      .addCase(joinRoom.pending, (state) => {
        state.isJoiningRoom = true;
        state.roomActionError = null;
      })
      .addCase(joinRoom.fulfilled, (state) => {
        state.isJoiningRoom = false;
        state.roomActionError = null;
      })
      .addCase(joinRoom.rejected, (state, action) => {
        state.isJoiningRoom = false;
        state.roomActionError = action.payload as string;
      });

    // Leave Room
    builder
      .addCase(leaveRoom.pending, (state) => {
        state.isLeavingRoom = true;
        state.roomActionError = null;
      })
      .addCase(leaveRoom.fulfilled, (state) => {
        state.isLeavingRoom = false;
        state.roomActionError = null;
        state.currentRoom = null;
        state.currentUserReady = false;
      })
      .addCase(leaveRoom.rejected, (state, action) => {
        state.isLeavingRoom = false;
        state.roomActionError = action.payload as string;
      });

    // Toggle Ready
    builder
      .addCase(toggleReady.pending, (state) => {
        state.isTogglingReady = true;
        state.roomActionError = null;
      })
      .addCase(toggleReady.fulfilled, (state) => {
        state.isTogglingReady = false;
        state.roomActionError = null;
      })
      .addCase(toggleReady.rejected, (state, action) => {
        state.isTogglingReady = false;
        state.roomActionError = action.payload as string;
      });

    // Start Game
    builder
      .addCase(startGame.pending, (state) => {
        state.isStartingGame = true;
        state.gameStartError = null;
      })
      .addCase(startGame.fulfilled, (state) => {
        state.isStartingGame = false;
        state.gameStartError = null;
      })
      .addCase(startGame.rejected, (state, action) => {
        state.isStartingGame = false;
        state.gameStartError = action.payload as string;
      });
  }
});

export const {
  updateRoomList,
  updateCurrentRoom,
  playerJoined,
  playerLeft,
  playerReadyChanged,
  gameStarted,
  setCurrentUserReady,
  clearRoomErrors,
  clearCurrentRoom,
  clearGameStateRestoreFlag,
  resetRoomsState
} = roomsSlice.actions;

export default roomsSlice.reducer; 