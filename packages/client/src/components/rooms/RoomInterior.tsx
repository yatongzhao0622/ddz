'use client';

import { useState, useCallback } from 'react';
import { Room, Player } from '../../services/socketService';
import PlayerAvatar from './PlayerAvatar';

interface RoomInteriorProps {
  room: Room;
  currentUserId: string;
  onLeaveRoom: () => void;
  onToggleReady: () => void;
  onStartGame: () => void;
  isLeavingRoom?: boolean;
  isTogglingReady?: boolean;
  isStartingGame?: boolean;
}

export default function RoomInterior({
  room,
  currentUserId,
  onLeaveRoom,
  onToggleReady,
  onStartGame,
  isLeavingRoom,
  isTogglingReady,
  isStartingGame
}: RoomInteriorProps) {
  const [showSettings, setShowSettings] = useState(false);

  const currentPlayer = room.players.find(p => p.userId === currentUserId);
  const isRoomCreator = room.createdBy === currentUserId;
  const canStartGame = isRoomCreator && 
    room.players.length >= 2 && 
    room.players.every(p => p.isReady || p.userId === currentUserId) &&
    room.status === 'waiting';

  // Debug logging for start game conditions
  console.log('🔍 RoomInterior - Start Game Debug:', {
    isRoomCreator,
    currentUserId,
    roomCreatedBy: room.createdBy,
    playerCount: room.players.length,
    playersReady: room.players.map(p => ({ userId: p.userId, username: p.username, isReady: p.isReady })),
    allPlayersReady: room.players.every(p => p.isReady || p.userId === currentUserId),
    roomStatus: room.status,
    canStartGame
  });

  const getReadyPlayersCount = useCallback(() => {
    return room.players.filter(p => p.isReady).length;
  }, [room.players]);

  const getRoomStatusText = useCallback(() => {
    switch (room.status) {
      case 'waiting':
        return `等待玩家 (${room.currentPlayerCount}/${room.maxPlayers})`;
      case 'playing':
        return '游戏进行中';
      case 'finished':
        return '游戏已结束';
      default:
        return room.status;
    }
  }, [room.status, room.currentPlayerCount, room.maxPlayers]);

  const getEmptySlots = useCallback(() => {
    return Array.from({ length: room.maxPlayers - room.currentPlayerCount });
  }, [room.maxPlayers, room.currentPlayerCount]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Room Header */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                🏠 {room.name}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center space-x-1">
                  <span>📊</span>
                  <span>{getRoomStatusText()}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span>⏰</span>
                  <span>创建于 {new Date(room.createdAt).toLocaleString('zh-CN')}</span>
                </span>
                {room.isPrivate && (
                  <span className="flex items-center space-x-1 text-yellow-600">
                    <span>🔒</span>
                    <span>私人房间</span>
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              {isRoomCreator && (
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="房间设置"
                >
                  ⚙️
                </button>
              )}
              
              <button
                onClick={onLeaveRoom}
                disabled={isLeavingRoom}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLeavingRoom ? '🔄 离开中...' : '🚪 离开房间'}
              </button>
            </div>
          </div>

          {/* Room Settings (if creator) */}
          {showSettings && isRoomCreator && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">⚙️ 房间设置</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">房间ID:</span>
                  <p className="text-gray-800 font-mono">{room.id}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">最大玩家:</span>
                  <p className="text-gray-800">{room.maxPlayers} 人</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">房间类型:</span>
                  <p className="text-gray-800">{room.isPrivate ? '🔒 私人' : '🌐 公开'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">房间状态:</span>
                  <p className="text-gray-800">{getRoomStatusText()}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Players Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              👥 玩家列表 ({room.currentPlayerCount}/{room.maxPlayers})
            </h2>
            <div className="text-sm text-gray-600">
              {getReadyPlayersCount()}/{room.currentPlayerCount} 人已准备
            </div>
          </div>

          {/* Current Players */}
          <div className="space-y-4 mb-6">
            {room.players.map((player) => (
              <div
                key={player.userId}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  player.userId === currentUserId
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <PlayerAvatar
                    player={player}
                    size="lg"
                    isCurrentUser={player.userId === currentUserId}
                    showStatus={true}
                    showReadyStatus={true}
                  />
                  
                  {/* Player Actions */}
                  <div className="flex items-center space-x-3">
                    {player.userId === room.createdBy && (
                      <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                        👑 房主
                      </span>
                    )}
                    
                    {player.userId === currentUserId && room.status === 'waiting' && (
                      <button
                        onClick={onToggleReady}
                        disabled={isTogglingReady}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${
                          player.isReady
                            ? 'bg-orange-600 text-white hover:bg-orange-700 disabled:bg-gray-400'
                            : 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400'
                        }`}
                      >
                        {isTogglingReady ? (
                          '🔄 更新中...'
                        ) : player.isReady ? (
                          '❌ 取消准备'
                        ) : (
                          '✅ 准备就绪'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Empty Slots */}
            {getEmptySlots().map((_, index) => (
              <div
                key={`empty-${index}`}
                className="p-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 text-lg">
                    ?
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-500 font-medium">等待玩家加入...</p>
                    <p className="text-gray-400 text-sm">空位 #{index + 1}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Game Control */}
          {room.status === 'waiting' && (
            <div className="pt-6 border-t border-gray-200">
              {isRoomCreator ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2">👑 房主控制</h3>
                    <p className="text-blue-700 text-sm mb-4">
                      所有玩家准备就绪后，你可以开始游戏。至少需要2名玩家。
                    </p>
                    <button
                      onClick={onStartGame}
                      disabled={!canStartGame || isStartingGame}
                      className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isStartingGame ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>开始游戏中...</span>
                        </div>
                      ) : canStartGame ? (
                        '🎮 开始游戏'
                      ) : (
                        `⏳ 等待所有玩家准备 (${getReadyPlayersCount()}/${room.currentPlayerCount})`
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">⏳ 等待开始</h3>
                  <p className="text-yellow-700 text-sm">
                    请确保你已准备就绪，等待房主开始游戏。
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Game Status */}
          {room.status === 'playing' && (
            <div className="pt-6 border-t border-gray-200">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <h3 className="font-semibold text-green-800 mb-2">🎮 游戏进行中</h3>
                <p className="text-green-700 text-sm">
                  游戏已开始！准备好你的策略吧。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">📝 游戏说明</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">🎯 游戏目标</h4>
              <ul className="space-y-1">
                <li>• 斗地主是一个3人纸牌游戏</li>
                <li>• 一人做地主，两人做农民</li>
                <li>• 地主先出牌，农民配合对抗</li>
                <li>• 最先出完手牌的一方获胜</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">🎮 操作说明</h4>
              <ul className="space-y-1">
                <li>• 点击"准备就绪"表示你已准备好</li>
                <li>• 房主可以在所有人准备后开始游戏</li>
                <li>• 游戏中点击卡牌进行选择和出牌</li>
                <li>• 遵循牌型规则和大小顺序</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 