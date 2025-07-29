import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SocketState } from '../../services/socketService';
import { socketService } from '../../services/socketServiceInstance';

// Socket Redux State Interface
interface SocketReduxState {
  // Connection state
  connectionState: SocketState;
  // Error state
  lastError: string | null;
  // Manual connection control
  isManuallyDisconnected: boolean;
  // Auto-reconnect settings
  autoReconnectEnabled: boolean;
}

const initialState: SocketReduxState = {
  connectionState: {
    isConnected: false,
    isAuthenticated: false,
    isConnecting: false,
    isReconnecting: false,
    connectionError: null,
    reconnectAttempts: 0,
    lastConnectedAt: null,
    socketId: null
  },
  lastError: null,
  isManuallyDisconnected: false,
  autoReconnectEnabled: true
};

// Async Thunks for Socket Operations
export const connectSocket = createAsyncThunk(
  'socket/connect',
  async (token: string | undefined = undefined, { rejectWithValue }) => {
    try {
      const success = await socketService.connect(token);
      if (!success) {
        return rejectWithValue('Failed to connect to server');
      }
      return socketService.getState();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Connection failed');
    }
  }
);

export const disconnectSocket = createAsyncThunk(
  'socket/disconnect',
  async (_, { rejectWithValue }) => {
    try {
      socketService.disconnect();
      return true;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Disconnect failed');
    }
  }
);

export const authenticateSocket = createAsyncThunk(
  'socket/authenticate',
  async (token: string, { rejectWithValue }) => {
    try {
      const success = await socketService.authenticate(token);
      if (!success) {
        return rejectWithValue('Authentication failed');
      }
      return socketService.getState();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Authentication failed');
    }
  }
);

// Socket Slice
const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    // Update connection state from socket service
    updateConnectionState: (state, action: PayloadAction<SocketState>) => {
      state.connectionState = action.payload;
    },

    // Set socket error
    setSocketError: (state, action: PayloadAction<string>) => {
      state.lastError = action.payload;
    },

    // Clear socket error
    clearSocketError: (state) => {
      state.lastError = null;
    },

    // Set manual disconnect flag
    setManuallyDisconnected: (state, action: PayloadAction<boolean>) => {
      state.isManuallyDisconnected = action.payload;
    },

    // Toggle auto-reconnect
    setAutoReconnectEnabled: (state, action: PayloadAction<boolean>) => {
      state.autoReconnectEnabled = action.payload;
    },

    // Reset socket state
    resetSocketState: (state) => {
      state.connectionState = initialState.connectionState;
      state.lastError = null;
      state.isManuallyDisconnected = false;
    }
  },
  extraReducers: (builder) => {
    // Connect Socket
    builder
      .addCase(connectSocket.pending, (state) => {
        state.connectionState.isConnecting = true;
        state.lastError = null;
        state.isManuallyDisconnected = false;
      })
      .addCase(connectSocket.fulfilled, (state, action) => {
        state.connectionState = action.payload;
        state.lastError = null;
      })
      .addCase(connectSocket.rejected, (state, action) => {
        state.connectionState.isConnecting = false;
        state.connectionState.isConnected = false;
        state.lastError = action.payload as string;
      });

    // Disconnect Socket
    builder
      .addCase(disconnectSocket.pending, (state) => {
        state.isManuallyDisconnected = true;
      })
      .addCase(disconnectSocket.fulfilled, (state) => {
        state.connectionState = initialState.connectionState;
        state.lastError = null;
      })
      .addCase(disconnectSocket.rejected, (state, action) => {
        state.lastError = action.payload as string;
      });

    // Authenticate Socket
    builder
      .addCase(authenticateSocket.pending, (state) => {
        state.lastError = null;
      })
      .addCase(authenticateSocket.fulfilled, (state, action) => {
        state.connectionState = action.payload;
        state.lastError = null;
      })
      .addCase(authenticateSocket.rejected, (state, action) => {
        state.connectionState.isAuthenticated = false;
        state.lastError = action.payload as string;
      });
  }
});

export const {
  updateConnectionState,
  setSocketError,
  clearSocketError,
  setManuallyDisconnected,
  setAutoReconnectEnabled,
  resetSocketState
} = socketSlice.actions;

export default socketSlice.reducer; 