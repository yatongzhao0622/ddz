import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Room, Player } from '../../services/socketService';
import { socketService } from '../../services/socketServiceInstance';

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
  
  // Real-time updates
  lastRoomUpdate: Date | null;
  lastPlayerJoined: Player | null;
  lastPlayerLeft: Player | null;
}

const initialState: RoomsState = {
  availableRooms: [],
  isLoadingRooms: false,
  roomsError: null,
  
  currentRoom: null,
  isJoiningRoom: false,
  isLeavingRoom: false,
  roomActionError: null,
  
  currentUserReady: false,
  isTogglingReady: false,
  
  isStartingGame: false,
  gameStartError: null,
  
  lastRoomUpdate: null,
  lastPlayerJoined: null,
  lastPlayerLeft: null
};

// Async Thunks for Room Operations
export const requestRoomList = createAsyncThunk(
  'rooms/requestList',
  async (_, { rejectWithValue }) => {
    try {
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
      if (!socketService.isAuthenticated()) {
        return rejectWithValue('Not authenticated');
      }
      
      socketService.joinRoom(roomId);
      return roomId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to join room');
    }
  }
);

export const leaveRoom = createAsyncThunk(
  'rooms/leave',
  async (roomId: string, { rejectWithValue }) => {
    try {
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
      if (!socketService.isAuthenticated()) {
        return rejectWithValue('Not authenticated');
      }
      
      socketService.startGame(roomId);
      return roomId;
    } catch (error) {
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
      state.currentRoom = room;
      state.lastRoomUpdate = new Date();
      state.roomActionError = null;
      
      // Update current user ready state if we're in this room
      if (state.currentRoom) {
        // This would be set based on the current user ID from auth state
        // For now, we'll handle this in the component or via middleware
      }
    },

    // Player joined event
    playerJoined: (state, action: PayloadAction<{ room: Room; player: Player }>) => {
      const { room, player } = action.payload;
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
    gameStarted: (state, action: PayloadAction<{ room: Room }>) => {
      const { room } = action.payload;
      state.currentRoom = room;
      state.isStartingGame = false;
      state.gameStartError = null;
      state.lastRoomUpdate = new Date();
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
    },

    // Clear current room
    clearCurrentRoom: (state) => {
      state.currentRoom = null;
      state.currentUserReady = false;
      state.lastPlayerJoined = null;
      state.lastPlayerLeft = null;
    },

    // Reset rooms state
    resetRoomsState: (state) => {
      Object.assign(state, initialState);
    }
  },
  extraReducers: (builder) => {
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
  resetRoomsState
} = roomsSlice.actions;

export default roomsSlice.reducer; 