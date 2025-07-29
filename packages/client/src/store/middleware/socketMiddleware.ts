import { Middleware } from '@reduxjs/toolkit';
import { RootState, AppDispatch } from '../index';
import { updateConnectionState, setSocketError } from '../slices/socketSlice';
import { 
    updateRoomList,
  updateCurrentRoom,
  playerJoined,
  playerLeft,
  playerReadyChanged,
  gameStarted as roomGameStarted,
  clearCurrentRoom
} from '../slices/roomsSlice';
import {
  gameStarted as gameGameStarted,
  updateGameState
} from '../slices/gameSlice';

// Socket middleware to sync Socket.IO events with Redux state
export const socketMiddleware: Middleware<{}, RootState, AppDispatch> = (store) => (next) => (action) => {
  // Pass through all actions first
  const result = next(action);

  // Handle specific socket actions
  if (typeof window !== 'undefined') {
    console.log('🔧 SocketMiddleware - Processing action:', (action as any).type);
    
    // Check if updateCurrentRoom action indicates we need to restore game state
    if ((action as any).type === 'rooms/updateCurrentRoom') {
      const state = store.getState();
      if (state.rooms.needsGameStateRestore && state.rooms.gameSessionToRestore) {
        console.log('🎮 SocketMiddleware - Detected need for game state restoration from updateCurrentRoom');
        console.log('🎮 SocketMiddleware - GameSession to restore:', state.rooms.gameSessionToRestore);
        
        // Request game state from server or use the room data to restore state
        import('../../services/socketServiceInstance').then(async ({ socketService }) => {
          console.log('🎮 SocketMiddleware - Restoring game state from room update');
          
          // Since we have room data with gameSession, we can restore the game state
          // We need to get the current room data and fetch real game state from server
          const currentState = store.getState();
          const currentRoom = currentState.rooms.currentRoom;
          
          if (currentRoom && (currentRoom as any).gameSession) {
            console.log('🎮 SocketMiddleware - Fetching real game state from server for gameSession:', (currentRoom as any).gameSession);
            
            try {
              // Import gameService to fetch real game state
              const { gameService } = await import('../../services/gameService');
              const response = await gameService.getGameState(currentRoom.id);
              
              if (response.success && response.data) {
                console.log('🎮 SocketMiddleware - Real game state fetched successfully:', response.data);
                
                const restorationData = {
                  success: true,
                  game: response.data,
                  room: currentRoom,
                  message: 'Game state restored from server'
                };
                
                console.log('🎮 SocketMiddleware - Dispatching real game state restoration:', restorationData);
                
                // Dispatch to both room and game slices
                store.dispatch(roomGameStarted(restorationData));
                store.dispatch(gameGameStarted(restorationData));
                
                console.log('🎮 SocketMiddleware - Real game state restoration completed');
              } else {
                console.error('🎮 SocketMiddleware - Failed to fetch game state:', response);
                // Create fallback mock data
                const mockGameData = {
                  id: (currentRoom as any).gameSession,
                  roomId: currentRoom.id,
                  phase: 'playing',
                  players: currentRoom.players.map((player: any) => ({
                    ...player,
                    cards: [], // Initialize empty cards array as fallback
                    cardCount: 0,
                    isReady: player.isReady,
                    isConnected: player.isConnected || true,
                    score: 0
                  })),
                  currentTurn: 0,
                  landlord: null,
                  landlordCards: [],
                  lastPlay: null,
                  gameHistory: [],
                  isGameActive: true
                };
                
                const fallbackData = {
                  success: true,
                  game: mockGameData,
                  room: currentRoom,
                  message: 'Game state restored with fallback data'
                };
                
                store.dispatch(roomGameStarted(fallbackData));
                store.dispatch(gameGameStarted(fallbackData));
              }
            } catch (error) {
              console.error('🎮 SocketMiddleware - Error fetching game state:', error);
              // Create fallback mock data on error
              const mockGameData = {
                id: (currentRoom as any).gameSession,
                roomId: currentRoom.id,
                phase: 'playing',
                players: currentRoom.players.map((player: any) => ({
                  ...player,
                  cards: [], // Initialize empty cards array as fallback
                  cardCount: 0,
                  isReady: player.isReady,
                  isConnected: player.isConnected || true,
                  score: 0
                })),
                currentTurn: 0,
                landlord: null,
                landlordCards: [],
                lastPlay: null,
                gameHistory: [],
                isGameActive: true
              };
              
              const fallbackData = {
                success: true,
                game: mockGameData,
                room: currentRoom,
                message: 'Game state restored with fallback data'
              };
              
              store.dispatch(roomGameStarted(fallbackData));
              store.dispatch(gameGameStarted(fallbackData));
            }
          }
        });
        
        // Clear the flag
        store.dispatch({ type: 'rooms/clearGameStateRestoreFlag' });
      }
    }
    
    // Force initialize listeners if not done yet and we have socket-related activity
    const socketRelatedActions = [
      'socket/connect/fulfilled', 
      'auth/login/fulfilled',
      'socket/updateConnectionState',
      'rooms/joinRoom/fulfilled',
      'rooms/updateCurrentRoom'
    ];
    
    if (socketRelatedActions.some(actionType => (action as any).type.includes(actionType.split('/')[0]))) {
      if (!listenersInitialized) {
        console.log('🔧 SocketMiddleware - Force initializing listeners for:', (action as any).type);
        initializeSocketEventListeners(store.dispatch);
      }
    }
    
    // Initialize socket event listeners when needed
    if ((action as any).type === 'socket/connect/fulfilled' || (action as any).type === 'auth/login/fulfilled') {
      console.log('🔧 SocketMiddleware - Triggering listener initialization for:', (action as any).type);
      initializeSocketEventListeners(store.dispatch);
    }

    // Clean up when disconnecting
    if ((action as any).type === 'socket/disconnect/fulfilled' || (action as any).type === 'auth/logout/fulfilled') {
      console.log('🔧 SocketMiddleware - Cleaning up listeners for:', (action as any).type);
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

  console.log('🔧 SocketMiddleware - Starting listener initialization...');
  
  // Use dynamic import to avoid SSR issues
  import('../../services/socketServiceInstance').then(({ socketService }) => {
    console.log('🔧 SocketMiddleware - Initializing Socket.IO event listeners');
    console.log('🔧 SocketMiddleware - SocketService available:', !!socketService);
    console.log('🔧 SocketMiddleware - Adding gameStateRestored listener...');

    // Connection state updates
    socketService.on('connect', () => {
      console.log('🔧 SocketMiddleware - Connected to server');
      dispatch(updateConnectionState({
        isConnected: true,
        lastConnectedAt: new Date()
      }));
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
      console.log('🔧SocketMiddleware - Game started - RAW eventData:', eventData);
      console.log('🔧 SocketMiddleware - Game started - eventData.game:', eventData.game);
      
      // Dispatch to both roomsSlice and gameSlice
      dispatch(roomGameStarted(eventData));
      dispatch(gameGameStarted(eventData));
    });

    // Handle game state restoration for reconnecting players
    console.log('🔧 SocketMiddleware - Setting up gameStateRestored listener...');
    
    // Test if we can receive any events at all
    socketService.on('test', (data) => {
      console.log('🔍 SocketMiddleware - Test event received:', data);
    });
    
    // Add some other event listeners to test if they work
    socketService.on('connect', () => {
      console.log('🔍 SocketMiddleware - Connect event received');
    });
    
    socketService.on('roomUpdated', (data) => {
      console.log('🔍 SocketMiddleware - RoomUpdated event received');
    });
    
    socketService.on('gameStateRestored', (data) => {
      const eventData = data as any;
      console.log('🔄 SocketMiddleware - Game state restored event received');
      console.log('🔄 SocketMiddleware - Event data:', eventData);
      console.log('🔄 SocketMiddleware - Event success:', eventData.success);
      console.log('🔄 SocketMiddleware - Event game:', !!eventData.game);
      console.log('🔄 SocketMiddleware - Event room:', !!eventData.room);
      console.log('🔄 SocketMiddleware - Event game data structure:', eventData.game);
      console.log('🔄 SocketMiddleware - Event room data structure:', eventData.room);
      
      if (eventData.success && eventData.game && eventData.room) {
        console.log('🔄 SocketMiddleware - Dispatching game state restoration...');
        console.log('🔄 SocketMiddleware - About to dispatch roomGameStarted with:', eventData);
        // Restore room state
        dispatch(roomGameStarted(eventData));
        console.log('🔄 SocketMiddleware - Room state restored');
        console.log('🔄 SocketMiddleware - About to dispatch gameGameStarted with:', eventData);
        // Restore game state  
        dispatch(gameGameStarted(eventData));
        console.log('🔄 SocketMiddleware - Game state restored');
        console.log('🔄 SocketMiddleware - Game state restoration complete');
      } else {
        console.log('🔄 SocketMiddleware - Game state restoration failed - missing data');
        console.log('🔄 SocketMiddleware - Missing: success?', !eventData.success, 'game?', !eventData.game, 'room?', !eventData.room);
      }
    });
    console.log('🔧 SocketMiddleware - gameStateRestored listener added successfully');

    // Game state update events
    socketService.on('gameStateUpdated', (data) => {
      console.log('🎮 SocketMiddleware - Game state updated received:', data);
      const eventData = data as any;
      if (eventData) {
        dispatch(updateGameState(eventData));
      }
    });

    // Cards play result
    socketService.on('cardsPlayResult', (data) => {
      console.log('🎮 SocketMiddleware - Cards play result received:', data);
      // The game state will be updated via gameStateUpdated event
    });

    // Pass result
    socketService.on('passResult', (data) => {
      console.log('🎮 SocketMiddleware - Pass result received:', data);
      // The game state will be updated via gameStateUpdated event
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