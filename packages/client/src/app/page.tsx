'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import UserProfile from '../components/auth/UserProfile';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Socket } from 'socket.io-client';

interface ServerMessage {
  message: string;
  socketId: string;
}

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, error } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [serverMessage, setServerMessage] = useState<ServerMessage | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Debug logging for auth state changes
  useEffect(() => {
    console.log('🔍 Home - Auth state changed:', { isAuthenticated, isLoading, hasUser: !!user, error });
  }, [isAuthenticated, isLoading, user, error]);

  // Memoize debug info to prevent unnecessary re-renders
  const debugInfo = useMemo(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return `Auth: ${isAuthenticated ? 'YES' : 'NO'}, Loading: ${isLoading ? 'YES' : 'NO'}, Token: ${token ? 'EXISTS' : 'NONE'}, Error: ${error || 'NONE'}`;
  }, [isAuthenticated, isLoading, error]);

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

  // Redirect to login if not authenticated - with detailed logging
  useEffect(() => {
    console.log('🔍 Home - Redirect check:', { isClient, isLoading, isAuthenticated });
    
    if (isClient && !isLoading && !isAuthenticated) {
      console.log('🔍 Home - Redirecting to login (not authenticated)');
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, isClient, router]);

  // Socket connection effect - only when actually authenticated
  useEffect(() => {
    console.log('🔍 Home - Socket effect check:', { isClient, isAuthenticated, userId: user?.id });
    
    if (!isClient || !isAuthenticated || !user?.id) {
      console.log('🔍 Home - Skipping socket connection');
      return;
    }

    console.log('🔍 Home - Creating socket connection');
    let socketConnection: Socket | null = null;
    
    // Dynamic import of socket.io-client for client-side only
    import('socket.io-client').then(({ io }) => {
      socketConnection = io('http://localhost:3001');
      setSocket(socketConnection);

      socketConnection.on('connect', () => {
        console.log('Connected to server:', socketConnection!.id);
        setConnectionStatus('connected');
      });

      socketConnection.on('welcome', (data: ServerMessage) => {
        console.log('Welcome message:', data);
        setServerMessage(data);
      });

      socketConnection.on('disconnect', () => {
        console.log('Disconnected from server');
        setConnectionStatus('disconnected');
      });
    });

    return () => {
      console.log('🔍 Home - Cleaning up socket connection');
      if (socketConnection) {
        socketConnection.close();
      }
    };
  }, [isClient, isAuthenticated, user?.id]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'disconnected': return 'text-red-500';
      default: return 'text-yellow-500';
    }
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
          {/* Connection Status */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              🔗 Real-time Connection
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Status:</span>
                <span className={`font-bold ${getStatusColor()}`}>
                  {connectionStatus.toUpperCase()}
                </span>
              </div>
              {socket && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Socket ID:</span>
                  <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                    {socket.id || 'Connecting...'}
                  </span>
                </div>
              )}
              {serverMessage && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-green-800 font-medium">Server Message:</p>
                  <p className="text-green-700 text-sm">{serverMessage.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Game Actions */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              🎮 Game Actions
            </h2>
            <div className="space-y-3">
              <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                🏠 Browse Rooms
              </button>
              <button className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium">
                ➕ Create Room
              </button>
              <button className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium">
                ➕ Quick Match
              </button>
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
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-green-600 font-bold">✅ Real-time</div>
              <div className="text-sm text-green-800">Socket.IO</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-green-600 font-bold">✅ State</div>
              <div className="text-sm text-green-800">Redux</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-green-600 font-bold">✅ Auth</div>
              <div className="text-sm text-green-800">JWT</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-green-600 font-bold">✅ UI</div>
              <div className="text-sm text-green-800">Tailwind</div>
            </div>
          </div>
        </div>

        {/* Development Info */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            🚀 Development Progress
          </h2>
          <div className="grid md:grid-cols-4 gap-4 text-center">
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
              <div className="text-green-800">Real-time ✅</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <div className="text-xl font-bold text-blue-600">Phase 4</div>
              <div className="text-blue-800">Auth UI ✅</div>
            </div>
          </div>
          <div className="mt-4 text-center text-gray-600">
            <p>🔧 Authenticated user interface with JWT token management</p>
          </div>
        </div>
      </div>
    </div>
  );
}
