import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useCallback, useRef } from 'react';
import { RootState, AppDispatch } from '../store';
import { connectSocket, disconnectSocket, authenticateSocket } from '../store/slices/socketSlice';
import { requestRoomList, joinRoom, leaveRoom, toggleReady, startGame } from '../store/slices/roomsSlice';

export const useSocket = () => {
  const dispatch = useDispatch<AppDispatch>();
  const socketState = useSelector((state: RootState) => state.socket);
  const authState = useSelector((state: RootState) => state.auth);
  const roomsState = useSelector((state: RootState) => state.rooms);
  
  const autoConnectRef = useRef(false);
  const connectionAttemptRef = useRef(false);

  // Auto-connect when authenticated
  useEffect(() => {
    console.log('🔌 useSocket - Auth state check:', {
      isAuthenticated: authState.isAuthenticated,
      hasToken: !!authState.token,
      autoConnectRef: autoConnectRef.current,
      isConnected: socketState.connectionState.isConnected,
      isConnecting: socketState.connectionState.isConnecting,
      socketAuthenticated: socketState.connectionState.isAuthenticated
    });

    if (authState.isAuthenticated && authState.token && !autoConnectRef.current) {
      if (!socketState.connectionState.isConnected && !socketState.connectionState.isConnecting) {
        console.log('🔌 useSocket - Auto-connecting with auth token');
        autoConnectRef.current = true;
        connectionAttemptRef.current = true;
        dispatch(connectSocket(authState.token));
      } else if (socketState.connectionState.isConnected && !socketState.connectionState.isAuthenticated) {
        console.log('🔌 useSocket - Socket connected but not authenticated, authenticating now');
        dispatch(authenticateSocket(authState.token));
      }
    }
  }, [authState.isAuthenticated, authState.token, socketState.connectionState.isConnected, socketState.connectionState.isConnecting, socketState.connectionState.isAuthenticated, dispatch]);

  // Reset connection flags when authentication changes
  useEffect(() => {
    if (!authState.isAuthenticated) {
      autoConnectRef.current = false;
      connectionAttemptRef.current = false;
    }
  }, [authState.isAuthenticated]);

  // Auto-disconnect when logged out
  useEffect(() => {
    if (!authState.isAuthenticated && socketState.connectionState.isConnected) {
      console.log('🔌 useSocket - Auto-disconnecting (user logged out)');
      autoConnectRef.current = false;
      connectionAttemptRef.current = false;
      dispatch(disconnectSocket());
    }
  }, [authState.isAuthenticated, socketState.connectionState.isConnected, dispatch]);

  // Connection methods
  const connect = useCallback((token?: string) => {
    const tokenToUse = token || authState.token;
    if (tokenToUse) {
      console.log('🔌 useSocket - Manual connect with token');
      autoConnectRef.current = true;
      return dispatch(connectSocket(tokenToUse));
    } else {
      console.log('🔌 useSocket - Manual connect without token');
      return dispatch(connectSocket());
    }
  }, [dispatch, authState.token]);

  const disconnect = useCallback(() => {
    console.log('🔌 useSocket - Manual disconnect');
    autoConnectRef.current = false;
    connectionAttemptRef.current = false;
    return dispatch(disconnectSocket());
  }, [dispatch]);

  const authenticate = useCallback((token: string) => {
    console.log('🔌 useSocket - Manual authenticate');
    return dispatch(authenticateSocket(token));
  }, [dispatch]);

  // Room operations
  const getRoomList = useCallback(() => {
    return dispatch(requestRoomList());
  }, [dispatch]);

  const joinGameRoom = useCallback((roomId: string) => {
    return dispatch(joinRoom(roomId));
  }, [dispatch]);

  const leaveGameRoom = useCallback((roomId: string) => {
    return dispatch(leaveRoom(roomId));
  }, [dispatch]);

  const togglePlayerReady = useCallback((roomId: string) => {
    return dispatch(toggleReady(roomId));
  }, [dispatch]);

  const startGameInRoom = useCallback((roomId: string) => {
    return dispatch(startGame(roomId));
  }, [dispatch]);

  return {
    // Connection state
    ...socketState.connectionState,
    lastError: socketState.lastError,
    isManuallyDisconnected: socketState.isManuallyDisconnected,
    autoReconnectEnabled: socketState.autoReconnectEnabled,

    // Room state
    rooms: roomsState,

    // Connection methods
    connect,
    disconnect,
    authenticate,

    // Room methods
    getRoomList,
    joinRoom: joinGameRoom,
    leaveRoom: leaveGameRoom,
    toggleReady: togglePlayerReady,
    startGame: startGameInRoom,
  };
}; 