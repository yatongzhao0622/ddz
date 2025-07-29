import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import socketSlice from './slices/socketSlice';
import roomsSlice from './slices/roomsSlice';
import { socketMiddleware } from './middleware/socketMiddleware';

export const store: EnhancedStore = configureStore({
  reducer: {
    auth: authSlice,
    socket: socketSlice,
    rooms: roomsSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Ignore socket state updates with Date objects
        ignoredPaths: ['socket.connectionState.lastConnectedAt', 'rooms.lastRoomUpdate'],
      },
    }).concat(socketMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 