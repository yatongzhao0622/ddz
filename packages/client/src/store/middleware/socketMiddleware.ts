import { Middleware } from '@reduxjs/toolkit';
import { RootState, AppDispatch } from '../index';
import { updateConnectionState, setSocketError } from '../slices/socketSlice';
import { 
    updateRoomList,
  updateCurrentRoom,
  playerJoined,
  playerLeft,
  playerReadyChanged,
  gameStarted,
  clearCurrentRoom 
} from '../slices/roomsSlice';

// Socket middleware to sync Socket.IO events with Redux state
export const socketMiddleware: Middleware<{}, RootState, AppDispatch> = (store) => (next) => (action) => {
  // Pass through all actions first
  const result = next(action);

  // Handle specific socket actions
  if (typeof window !== 'undefined') {
    // Initialize socket event listeners when needed
    if (action.type === 'socket/connect/fulfilled' || action.type === 'auth/login/fulfilled') {
      initializeSocketEventListeners(store.dispatch);
    }

    // Clean up when disconnecting
    if (action.type === 'socket/disconnect/fulfilled' || action.type === 'auth/logout/fulfilled') {
      cleanupSocketEventListeners();
    }
  }

  return result;
};

// Track if listeners are already initialized to prevent duplicates
let listenersInitialized = false;

// Initialize Socket.IO event listeners
function initializeSocketEventListeners(dispatch: AppDispatch): void {
  if (listenersInitialized) {
    console.log('🔧 SocketMiddleware - Event listeners already initialized');
    return;
  }

  // Use dynamic import to avoid SSR issues
  import('../../services/socketServiceInstance').then(({ socketService }) => {
    console.log('🔧 SocketMiddleware - Initializing Socket.IO event listeners');

    // Connection state updates
    socketService.on('stateChange', (socketState) => {
      dispatch(updateConnectionState(socketState as any));
    });

    // Socket errors
    socketService.on('error', (data) => {
      dispatch(setSocketError((data as any).message));
      console.error('🔧 SocketMiddleware - Socket error:', data);
    });

    // Room list updates
    socketService.on('roomListUpdated', (data) => {
      console.log('🔧 SocketMiddleware - Room list updated:', (data as any).rooms?.length, 'rooms');
      dispatch(updateRoomList((data as any).rooms));
    });

    // Room updates - CRITICAL: This should set the current room
    socketService.on('roomUpdated', (data) => {
      const roomData = (data as any).room;
      console.log('🔧 SocketMiddleware - Room updated:', roomData?.id);
      console.log('🔧 SocketMiddleware - Room data:', data);
      console.log('🔧 SocketMiddleware - Setting as current room');
      dispatch(updateCurrentRoom(roomData));
    });

          // Player events
      socketService.on('playerJoined', (data) => {
        const eventData = data as any;
        console.log('🔧 SocketMiddleware - Player joined:', eventData.player?.username);
        console.log('🔧 SocketMiddleware - Player joined room data:', eventData.room);
        dispatch(playerJoined(eventData));
        // Also update current room if this affects current user
        if (eventData.room) {
          dispatch(updateCurrentRoom(eventData.room));
        }
      });

      socketService.on('playerLeft', (data) => {
        const eventData = data as any;
        console.log('🔧 SocketMiddleware - Player left:', eventData.player?.username);
        console.log('🔧 SocketMiddleware - Updated room after player left:', eventData.room);
        console.log('🔧 SocketMiddleware - Room players after leave:', eventData.room?.players);
        dispatch(playerLeft(eventData));
        // Update current room
        if (eventData.room) {
          console.log('🔧 SocketMiddleware - Updating current room after player left');
          dispatch(updateCurrentRoom(eventData.room));
        }
      });

      // Handle room left event for the leaving player
      socketService.on('roomLeft', (data) => {
        const eventData = data as any;
        console.log('🔧 SocketMiddleware - User left room:', eventData);
        // Clear current room for the leaving player
        dispatch(clearCurrentRoom());
      });

    socketService.on('playerReadyChanged', (data) => {
      const eventData = data as any;
      console.log('🔧 SocketMiddleware - Player ready changed:', eventData.player?.username, eventData.isReady);
      dispatch(playerReadyChanged(eventData));
      // Update current room
      if (eventData.room) {
        dispatch(updateCurrentRoom(eventData.room));
      }
    });

    // Game events
    socketService.on('gameStarted', (data) => {
      const eventData = data as any;
      console.log('🔧 SocketMiddleware - Game started:', eventData.room?.id);
      dispatch(gameStarted(eventData));
    });

    listenersInitialized = true;
    console.log('✅ SocketMiddleware - All event listeners initialized');

  }).catch((error) => {
    console.error('❌ SocketMiddleware - Failed to initialize event listeners:', error);
    dispatch(setSocketError('Failed to initialize real-time connection'));
  });
}

// Cleanup Socket.IO event listeners
function cleanupSocketEventListeners(): void {
  if (!listenersInitialized) {
    return;
  }

  // Use dynamic import to avoid SSR issues
  import('../../services/socketServiceInstance').then(({ socketService }) => {
    console.log('🔧 SocketMiddleware - Cleaning up Socket.IO event listeners');

    // Remove all event listeners
    const eventTypes = [
      'stateChange',
      'error',
      'roomListUpdated',
      'roomUpdated',
      'playerJoined',
      'playerLeft',
      'playerReadyChanged',
      'gameStarted'
    ];

    eventTypes.forEach(eventType => {
      // Note: This removes all listeners for each event type
      // In a more complex setup, you might want to track specific callbacks
      try {
        socketService.off(eventType, () => {});
      } catch (error) {
        console.warn(`Failed to remove ${eventType} listener:`, error);
      }
    });

    listenersInitialized = false;
    console.log('✅ SocketMiddleware - Event listeners cleaned up');

  }).catch((error) => {
    console.error('❌ SocketMiddleware - Failed to cleanup event listeners:', error);
  });
} 