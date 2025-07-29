'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { Player } from '../../services/socketService';
import RoomsList from '../../components/rooms/RoomsList';
import { RoomCreationData } from '../../components/rooms/CreateRoomModal';
import { createRoom, loadAvailableRooms, joinRoom } from '../../store/slices/roomsSlice';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function RoomsPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading, user } = useAuth();
  const socket = useSocket();
  const roomsState = useSelector((state: RootState) => state.rooms);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isClient && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, isClient, router]);

  // Load room list when socket is authenticated (prioritize API over Socket.IO for initial load)
  useEffect(() => {
    if (socket.isAuthenticated && roomsState.availableRooms.length === 0) {
      // Use API to load initial room list, then Socket.IO for real-time updates
      dispatch(loadAvailableRooms());
    }
  }, [socket.isAuthenticated, roomsState.availableRooms.length, dispatch]);

  // Navigate to room interior if current user is in a room
  useEffect(() => {
    console.log('🔍 Navigation check - Current room state:', {
      currentRoom: roomsState.currentRoom,
      userId: user?.id,
      roomPlayers: roomsState.currentRoom?.players
    });
    
    if (roomsState.currentRoom && user?.id) {
      const isUserInRoom = roomsState.currentRoom.players.some(
        (player: Player) => player.userId === user.id
      );
      
      console.log('🔍 Navigation check - User in room:', isUserInRoom);
      
      if (isUserInRoom) {
        console.log('🔍 Navigation - Redirecting to room:', `/rooms/${roomsState.currentRoom.id}`);
        router.push(`/rooms/${roomsState.currentRoom.id}`);
      }
    }
  }, [roomsState.currentRoom, user?.id, router]);

  const handleJoinRoom = useCallback((roomId: string) => {
    console.log('🔍 handleJoinRoom - Joining room:', roomId);
    dispatch(joinRoom(roomId));
  }, [dispatch]);

  const handleCreateRoom = useCallback(async (roomData: RoomCreationData) => {
    try {
      await dispatch(createRoom(roomData)).unwrap();
      // Room creation success - user will be automatically redirected to the room
    } catch (error) {
      console.error('Failed to create room:', error);
      // Error handling is already done in the Redux slice
    }
  }, [dispatch]);

  const handleRefreshRooms = useCallback(() => {
    // Use API to refresh room list for most up-to-date data
    dispatch(loadAvailableRooms());
  }, [dispatch]);

  if (isLoading || !isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <LoadingSpinner message="Loading rooms..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <LoadingSpinner message="Redirecting to login..." />
      </div>
    );
  }

  if (!socket.isConnected || !socket.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-6xl mb-4">🔌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">连接服务器中</h2>
          <p className="text-gray-600 mb-4">
            正在建立实时连接...
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <div>连接状态: {socket.isConnected ? '✅ 已连接' : '❌ 未连接'}</div>
            <div>认证状态: {socket.isAuthenticated ? '✅ 已认证' : '❌ 未认证'}</div>
          </div>
          {socket.connectionError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 text-sm">{socket.connectionError}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="text-blue-600 hover:text-blue-700 transition-colors"
              >
                ← 返回首页
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  🏠 游戏房间
                </h1>
                <p className="text-gray-600">
                  欢迎, {user.username}！选择或创建房间开始游戏
                </p>
              </div>
            </div>
            
            {/* User Status */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <div className={`w-3 h-3 rounded-full ${socket.isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-gray-600">
                  {socket.isConnected ? '在线' : '离线'}
                </span>
              </div>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                {user.username.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <RoomsList
          rooms={roomsState.availableRooms}
          currentUserId={user.id}
          isLoading={roomsState.isLoadingRooms}
          onJoinRoom={handleJoinRoom}
          onCreateRoom={handleCreateRoom}
          onRefreshRooms={handleRefreshRooms}
          isJoiningRoom={roomsState.isJoiningRoom}
          isCreatingRoom={roomsState.isCreatingRoom}
        />
      </div>

      {/* Room Actions Feedback */}
      {roomsState.roomActionError && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          ❌ {roomsState.roomActionError}
        </div>
      )}

      {roomsState.roomsError && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          ❌ {roomsState.roomsError}
        </div>
      )}

      {roomsState.roomCreationError && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          ❌ {roomsState.roomCreationError}
        </div>
      )}
    </div>
  );
} 