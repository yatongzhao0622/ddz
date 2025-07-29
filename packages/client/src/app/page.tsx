'use client';

import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

interface ServerMessage {
  message: string;
  socketId: string;
}

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [serverMessage, setServerMessage] = useState<ServerMessage | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Ensure we're on the client side
    setIsClient(true);
    
    if (typeof window !== 'undefined') {
      // Dynamic import of socket.io-client for client-side only
      import('socket.io-client').then(({ io }) => {
        const socketConnection = io('http://localhost:3001');
        setSocket(socketConnection);

        socketConnection.on('connect', () => {
          console.log('Connected to server:', socketConnection.id);
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
        if (socket) {
          socket.close();
        }
      };
    }
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'disconnected': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  // Show loading state during hydration
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Dou Dizhu Online...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🃏 斗地主 (Dou Dizhu) Online
          </h1>
          <p className="text-xl text-gray-600">
            Multiplayer Card Game - Development Environment
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Connection Status */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
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
                  <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                    {socket.id || 'Connecting...'}
                  </span>
                </div>
              )}
              {serverMessage && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-green-800 font-medium">Server Message:</p>
                  <p className="text-green-700">{serverMessage.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              ⚙️ System Status
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Frontend:</span>
                <span className="text-green-500 font-bold">✅ Next.js 15</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Backend:</span>
                <span className="text-green-500 font-bold">✅ Express 5</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Real-time:</span>
                <span className="text-green-500 font-bold">✅ Socket.IO</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">State:</span>
                <span className="text-green-500 font-bold">✅ Redux Toolkit</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Styling:</span>
                <span className="text-green-500 font-bold">✅ TailwindCSS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Development Info */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            🚀 Development Environment
          </h2>
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">Phase 1</div>
              <div className="text-blue-800">Foundation ✅</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">Phase 2</div>
              <div className="text-yellow-800">Core Systems ⏳</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">Phase 3</div>
              <div className="text-gray-800">Game Logic ⭕</div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-600">
          <p>🔧 Monorepo with Turbo • 📦 pnpm Workspaces • 🎯 TypeScript</p>
          <p className="text-sm mt-2 text-gray-500">
            Hydration-safe Socket.IO connection with browser extension compatibility
          </p>
        </div>
      </div>
    </div>
  );
}
