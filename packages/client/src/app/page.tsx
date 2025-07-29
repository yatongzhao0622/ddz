'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import UserProfile from '../components/auth/UserProfile';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, error } = useAuth();
  const socket = useSocket();
  const [isClient, setIsClient] = useState(false);

  // Debug logging for auth state changes
  useEffect(() => {
    console.log('🔍 Home - Auth state changed:', { isAuthenticated, isLoading, hasUser: !!user, error });
  }, [isAuthenticated, isLoading, user, error]);

  // Debug logging for socket state changes
  useEffect(() => {
    console.log('🔍 Home - Socket state changed:', {
      isConnected: socket.isConnected,
      isAuthenticated: socket.isAuthenticated,
      roomCount: socket.rooms.availableRooms.length,
      currentRoom: socket.rooms.currentRoom?.id,
      lastError: socket.lastError,
      connectionError: socket.connectionError
    });
  }, [socket.isConnected, socket.isAuthenticated, socket.rooms.availableRooms.length, socket.rooms.currentRoom, socket.lastError, socket.connectionError]);

  // Manual authentication handler
  const handleManualAuthenticate = useCallback(() => {
    const token = localStorage.getItem('token');
    if (token && socket.isConnected && !socket.isAuthenticated) {
      console.log('🔧 Manual authentication attempt with token:', token.substring(0, 20) + '...');
      socket.authenticate(token);
    } else {
      console.log('🔧 Cannot authenticate:', { 
        hasToken: !!token, 
        isConnected: socket.isConnected, 
        alreadyAuthenticated: socket.isAuthenticated 
      });
    }
  }, [socket]);

  // Manual reconnect handler
  const handleManualReconnect = useCallback(() => {
    const token = localStorage.getItem('token');
    console.log('🔧 Manual reconnect attempt');
    if (socket.isConnected) {
      socket.disconnect();
    }
    setTimeout(() => {
      socket.connect(token || undefined);
    }, 1000);
  }, [socket]);

  // Memoize debug info to prevent unnecessary re-renders
  const debugInfo = useMemo(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return `Auth: ${isAuthenticated ? 'YES' : 'NO'}, Socket: ${socket.isConnected ? 'YES' : 'NO'}, Token: ${token ? 'EXISTS' : 'NONE'}`;
  }, [isAuthenticated, socket.isConnected]);

  // Stable callback for clearing localStorage
  const clearAllAndReload = useCallback(() => {
    console.log('🧹 Clearing all localStorage and reloading...');
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    }
  }, []);

  // Set client flag only once
  useEffect(() => {
    console.log('🔍 Home - Setting client flag');
    setIsClient(true);
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    console.log('🔍 Home - Redirect check:', { isClient, isLoading, isAuthenticated });
    
    if (isClient && !isLoading && !isAuthenticated) {
      console.log('🔍 Home - Redirecting to login (not authenticated)');
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, isClient, router]);

  // Request room list when socket is authenticated
  useEffect(() => {
    if (socket.isAuthenticated && socket.rooms.availableRooms.length === 0) {
      console.log('🔍 Home - Requesting room list');
      socket.getRoomList();
    }
  }, [socket.isAuthenticated, socket.rooms.availableRooms.length, socket.getRoomList]);

  const getSocketStatusColor = () => {
    if (socket.isConnected && socket.isAuthenticated) return 'text-green-500';
    if (socket.isConnected) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSocketStatusText = () => {
    if (socket.isConnected && socket.isAuthenticated) return 'CONNECTED & AUTHENTICATED';
    if (socket.isConnected) return 'CONNECTED (NOT AUTHENTICATED)';
    if (socket.isConnecting) return 'CONNECTING...';
    if (socket.isReconnecting) return 'RECONNECTING...';
    return 'DISCONNECTED';
  };

  // Show loading while checking authentication
  if (isLoading || !isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner message="Loading Dou Dizhu Online..." />
          <div className="mt-4 p-4 bg-white rounded-lg shadow-lg max-w-md">
            <p className="text-xs text-gray-600 mb-3">{debugInfo}</p>
            <button 
              onClick={clearAllAndReload}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              🧹 Clear All & Reset
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If there's an error and we're not authenticated, show the clear option
  if (error && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8 flex items-center justify-center">
        <div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">Error: {error}</p>
          <p className="text-xs text-gray-500 mb-4">{debugInfo}</p>
          <div className="space-y-2">
            <button 
              onClick={clearAllAndReload}
              className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              🧹 Clear All & Go to Login
            </button>
            <button 
              onClick={() => router.push('/login')}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Redirect handling is done in useEffect, show loading during redirect
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner message="Redirecting to login..." />
          <div className="mt-4 p-4 bg-white rounded-lg shadow-lg max-w-md">
            <p className="text-xs text-gray-600 mb-3">{debugInfo}</p>
            <button 
              onClick={clearAllAndReload}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              🧹 Clear All & Reset
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with User Profile */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                🃏 斗地主 (Dou Dizhu) Online
              </h1>
              <p className="text-gray-600">Welcome back, {user.username}!</p>
              <p className="text-xs text-gray-500 mt-1">{debugInfo}</p>
            </div>
            <div className="flex items-center space-x-3">
              <UserProfile compact={true} />
              <button 
                onClick={clearAllAndReload}
                className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300 transition-colors"
                title="Clear all and reset"
              >
                🧹 Reset
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6">
          {/* Real-time Connection Status */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              🔗 Real-time Connection
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Status:</span>
                <span className={`font-bold ${getSocketStatusColor()}`}>
                  {getSocketStatusText()}
                </span>
              </div>
              {socket.socketId && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Socket ID:</span>
                  <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                    {socket.socketId}
                  </span>
                </div>
              )}
              
              {/* Authentication Controls */}
              {socket.isConnected && !socket.isAuthenticated && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-yellow-800 font-medium mb-2">Socket Connected - Authentication Required</p>
                  <button
                    onClick={handleManualAuthenticate}
                    className="w-full bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                  >
                    🔐 Authenticate Socket
                  </button>
                </div>
              )}

              {/* Reconnection Controls */}
              {(!socket.isConnected || socket.connectionError) && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-blue-800 font-medium mb-2">Connection Issues Detected</p>
                  <button
                    onClick={handleManualReconnect}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    🔄 Reconnect Socket
                  </button>
                </div>
              )}

              {socket.connectionError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-red-800 font-medium">Connection Error:</p>
                  <p className="text-red-700 text-sm">{socket.connectionError}</p>
                </div>
              )}
              {socket.lastError && socket.lastError !== socket.connectionError && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
                  <p className="text-orange-800 font-medium">Last Error:</p>
                  <p className="text-orange-700 text-sm">{socket.lastError}</p>
                </div>
              )}

              {/* Debug Info */}
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
                <p className="text-gray-700 font-medium text-sm mb-1">Debug Info:</p>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>Connected: {socket.isConnected ? '✅' : '❌'}</div>
                  <div>Authenticated: {socket.isAuthenticated ? '✅' : '❌'}</div>
                  <div>Token Available: {localStorage.getItem('token') ? '✅' : '❌'}</div>
                  <div>Reconnect Attempts: {socket.reconnectAttempts}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Room Management */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              🏠 Game Rooms
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Available Rooms:</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                  {socket.rooms.availableRooms.length}
                </span>
              </div>
              
              {socket.rooms.currentRoom && (
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-green-800 font-medium">Current Room:</p>
                  <p className="text-green-700 text-sm">{socket.rooms.currentRoom.name}</p>
                  <p className="text-green-600 text-xs">
                    Players: {socket.rooms.currentRoom.currentPlayerCount}/{socket.rooms.currentRoom.maxPlayers}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <button 
                  onClick={() => socket.getRoomList()}
                  disabled={!socket.isAuthenticated || socket.rooms.isLoadingRooms}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {socket.rooms.isLoadingRooms ? '🔄 Loading...' : '🔄 Refresh Rooms'}
                </button>
                <button 
                  onClick={() => router.push('/rooms')}
                  disabled={!socket.isAuthenticated}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  🏠 Browse Rooms
                </button>
                <button 
                  disabled={!socket.isAuthenticated}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  ⚡ Quick Match
                </button>
              </div>
            </div>
          </div>

          {/* User Profile Card */}
          <div className="lg:col-span-1 md:col-span-2">
            <UserProfile />
          </div>
        </div>

        {/* System Status */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            ⚙️ System Status
          </h2>
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-green-600 font-bold">✅ Frontend</div>
              <div className="text-sm text-green-800">Next.js 15</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-green-600 font-bold">✅ Backend</div>
              <div className="text-sm text-green-800">Express 5</div>
            </div>
            <div className={`text-center p-3 rounded-lg ${socket.isConnected ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className={`font-bold ${socket.isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {socket.isConnected ? '✅' : '❌'} Real-time
              </div>
              <div className={`text-sm ${socket.isConnected ? 'text-green-800' : 'text-red-800'}`}>Socket.IO</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-green-600 font-bold">✅ State</div>
              <div className="text-sm text-green-800">Redux</div>
            </div>
            <div className={`text-center p-3 rounded-lg ${socket.isAuthenticated ? 'bg-green-50' : 'bg-yellow-50'}`}>
              <div className={`font-bold ${socket.isAuthenticated ? 'text-green-600' : 'text-yellow-600'}`}>
                {socket.isAuthenticated ? '✅' : '⏳'} Auth
              </div>
              <div className={`text-sm ${socket.isAuthenticated ? 'text-green-800' : 'text-yellow-800'}`}>JWT+Socket</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-green-600 font-bold">✅ UI</div>
              <div className="text-sm text-green-800">Tailwind</div>
            </div>
          </div>
        </div>

        {/* Development Progress */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            🚀 Development Progress
          </h2>
          <div className="grid md:grid-cols-4 lg:grid-cols-7 gap-4 text-center">
            <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="text-xl font-bold text-green-600">Phase 1</div>
              <div className="text-green-800">Foundation ✅</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="text-xl font-bold text-green-600">Phase 2</div>
              <div className="text-green-800">Core Systems ✅</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="text-xl font-bold text-green-600">Phase 3</div>
              <div className="text-green-800">Server Real-time ✅</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="text-xl font-bold text-green-600">Phase 4</div>
              <div className="text-green-800">Client Auth ✅</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="text-xl font-bold text-green-600">Phase 5</div>
              <div className="text-green-800">Real-time UI ✅</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="text-xl font-bold text-green-600">Phase 6</div>
              <div className="text-green-800">Room Management ✅</div>
            </div>
            <div 
              className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors"
              onClick={() => window.open('/demo/game-layout', '_blank')}
              title="Click to view Game Interface Demo"
            >
              <div className="text-xl font-bold text-purple-600">Phase 7</div>
              <div className="text-purple-800">Game Interface ✅</div>
              <div className="text-xs text-purple-600 mt-1">🎮 Click to Demo</div>
            </div>
          </div>
          <div className="mt-4 text-center text-gray-600">
            <p>🎮 Complete game interface with authentic Dou Dizhu cards and layout!</p>
            <p className="text-sm mt-1">Click Phase 7 to test the game components</p>
          </div>
        </div>
      </div>
    </div>
  );
}
