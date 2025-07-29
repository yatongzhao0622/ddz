'use client';

import { useRouter } from 'next/navigation';
import { Room } from '../../services/socketService';

interface RoomCardProps {
  room: Room;
  onJoinRoom: (roomId: string) => void;
  currentUserId?: string;
  isJoining?: boolean;
}

export default function RoomCard({ room, onJoinRoom, currentUserId, isJoining }: RoomCardProps) {
  const router = useRouter();
  const isRoomFull = room.currentPlayerCount >= room.maxPlayers;
  const isPlayerInRoom = room.players.some(player => player.userId === currentUserId);
  const canJoin = !isRoomFull && !isPlayerInRoom && room.status === 'waiting';

  // Debug logging
  console.log('🔍 RoomCard - Room:', room.name, {
    roomId: room.id,
    currentUserId,
    players: room.players.map(p => ({ userId: p.userId, username: p.username })),
    isPlayerInRoom,
    canJoin,
    isRoomFull,
    currentPlayerCount: room.currentPlayerCount,
    maxPlayers: room.maxPlayers
  });

  const getStatusColor = () => {
    if (isPlayerInRoom) return 'bg-blue-100 text-blue-800'; // Player is in this room
    switch (room.status) {
      case 'waiting': return 'bg-green-100 text-green-800';
      case 'playing': return 'bg-yellow-100 text-yellow-800';
      case 'finished': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = () => {
    if (isPlayerInRoom) {
      return room.status === 'waiting' ? '我的房间' : '游戏中';
    }
    switch (room.status) {
      case 'waiting': return '等待中';
      case 'playing': return '游戏中';
      case 'finished': return '已结束';
      default: return room.status;
    }
  };

  const handleJoinClick = () => {
    if (canJoin && !isJoining) {
      onJoinRoom(room.id);
    }
  };

  const handleRoomNameClick = () => {
    // Navigate directly to room detail page
    router.push(`/rooms/${room.id}`);
  };

  const handleEnterRoom = () => {
    // For players already in room, go directly to room detail
    router.push(`/rooms/${room.id}`);
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-200">
      {/* Room Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 
            className="text-lg font-semibold text-gray-800 mb-1 truncate cursor-pointer hover:text-blue-600 transition-colors"
            onClick={handleRoomNameClick}
            title="Click to view room details"
          >
            {room.name}
          </h3>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
            {room.isPrivate && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                🔒 私人
              </span>
            )}
          </div>
        </div>
        
        {/* Player Count */}
        <div className="text-right">
          <div className="text-sm text-gray-500">玩家</div>
          <div className="text-lg font-bold text-gray-800">
            {room.currentPlayerCount}/{room.maxPlayers}
          </div>
        </div>
      </div>

      {/* Player List Preview */}
      <div className="mb-4">
        <div className="text-sm text-gray-600 mb-2">玩家列表:</div>
        <div className="flex flex-wrap gap-2">
          {room.players.map((player, index) => (
            <div key={player.userId} className="flex items-center space-x-1">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {player.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-gray-700 truncate max-w-20">
                {player.username}
              </span>
              {player.isReady && (
                <span className="text-green-500 text-xs">✓</span>
              )}
              {!player.isConnected && (
                <span className="text-red-500 text-xs">⚫</span>
              )}
            </div>
          ))}
          
          {/* Empty Slots */}
          {Array.from({ length: room.maxPlayers - room.currentPlayerCount }).map((_, index) => (
            <div key={`empty-${index}`} className="flex items-center space-x-1">
              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 text-xs">
                ?
              </div>
              <span className="text-sm text-gray-400">空位</span>
            </div>
          ))}
        </div>
      </div>

      {/* Room Info */}
      <div className="text-xs text-gray-500 mb-4 space-y-1">
        <div>创建时间: {new Date(room.createdAt).toLocaleString('zh-CN')}</div>
        {isPlayerInRoom && (
          <div className="text-blue-600 font-medium">🎯 你在这个房间里</div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-2 border-t border-gray-100 space-y-2">
        {isPlayerInRoom ? (
          <>
            <button
              onClick={handleEnterRoom}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              🎮 进入房间
            </button>
            <button
              onClick={handleRoomNameClick}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              👁️ 查看详情
            </button>
          </>
        ) : canJoin ? (
          <>
            <button
              onClick={handleJoinClick}
              disabled={isJoining}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isJoining ? '🔄 加入中...' : '🚪 加入房间'}
            </button>
            <button
              onClick={handleRoomNameClick}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              👁️ 查看详情
            </button>
          </>
        ) : (
          <>
            <button
              disabled
              className="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded-lg cursor-not-allowed font-medium"
            >
              {isRoomFull ? '🚫 房间已满' : room.status === 'playing' ? '🎮 游戏进行中' : '❌ 无法加入'}
            </button>
            <button
              onClick={handleRoomNameClick}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              👁️ 查看详情
            </button>
          </>
        )}
      </div>
    </div>
  );
} 