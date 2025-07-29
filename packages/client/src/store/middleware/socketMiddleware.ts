import { Middleware } from '@reduxjs/toolkit';
import { RootState, AppDispatch } from '../index';
import { updateConnectionState, setSocketError } from '../slices/socketSlice';
import { 
  updateRoomList, 
  updateCurrentRoom, 
  playerJoined, 
  playerLeft, 
  playerReadyChanged,
  gameStarted 
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
      dispatch(updateConnectionState(socketState));
    });

    // Socket errors
    socketService.on('error', (data) => {
      dispatch(setSocketError(data.message));
      console.error('🔧 SocketMiddleware - Socket error:', data);
    });

    // Room list updates
    socketService.on('roomListUpdated', (data) => {
      console.log('🔧 SocketMiddleware - Room list updated:', data.rooms?.length, 'rooms');
      dispatch(updateRoomList(data.rooms));
    });

    // Room updates
    socketService.on('roomUpdated', (data) => {
      console.log('🔧 SocketMiddleware - Room updated:', data.room?.id);
      dispatch(updateCurrentRoom(data.room));
    });

    // Player events
    socketService.on('playerJoined', (data) => {
      console.log('🔧 SocketMiddleware - Player joined:', data.player?.username);
      dispatch(playerJoined(data));
    });

    socketService.on('playerLeft', (data) => {
      console.log('🔧 SocketMiddleware - Player left:', data.player?.username);
      dispatch(playerLeft(data));
    });

    socketService.on('playerReadyChanged', (data) => {
      console.log('🔧 SocketMiddleware - Player ready changed:', data.player?.username, data.isReady);
      dispatch(playerReadyChanged(data));
    });

    // Game events
    socketService.on('gameStarted', (data) => {
      console.log('🔧 SocketMiddleware - Game started:', data.room?.id);
      dispatch(gameStarted(data));
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