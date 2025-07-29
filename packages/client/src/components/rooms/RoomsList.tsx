'use client';

import { useState, useMemo, useCallback } from 'react';
import { Room } from '../../services/socketService';
import RoomCard from './RoomCard';
import CreateRoomModal, { RoomCreationData } from './CreateRoomModal';

interface RoomsListProps {
  rooms: Room[];
  currentUserId?: string;
  isLoading?: boolean;
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: (roomData: RoomCreationData) => Promise<void>;
  onRefreshRooms: () => void;
  isJoiningRoom?: boolean;
  isCreatingRoom?: boolean;
}

type FilterType = 'all' | 'waiting' | 'playing' | 'joinable';
type SortType = 'newest' | 'oldest' | 'players-asc' | 'players-desc' | 'name';

export default function RoomsList({
  rooms,
  currentUserId,
  isLoading,
  onJoinRoom,
  onCreateRoom,
  onRefreshRooms,
  isJoiningRoom,
  isCreatingRoom
}: RoomsListProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('newest');

  // Filter and sort rooms
  const filteredAndSortedRooms = useMemo(() => {
    let filtered = rooms;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(room =>
        room.name.toLowerCase().includes(query) ||
        room.players.some(player => player.username.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    switch (filterType) {
      case 'waiting':
        filtered = filtered.filter(room => room.status === 'waiting');
        break;
      case 'playing':
        filtered = filtered.filter(room => room.status === 'playing');
        break;
      case 'joinable':
        filtered = filtered.filter(room => 
          room.status === 'waiting' && 
          room.currentPlayerCount < room.maxPlayers &&
          !room.players.some(player => player.userId === currentUserId)
        );
        break;
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortType) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'players-asc':
          return a.currentPlayerCount - b.currentPlayerCount;
        case 'players-desc':
          return b.currentPlayerCount - a.currentPlayerCount;
        case 'name':
          return a.name.localeCompare(b.name, 'zh-CN');
        default:
          return 0;
      }
    });

    return sorted;
  }, [rooms, searchQuery, filterType, sortType, currentUserId]);

  const handleCreateRoom = useCallback(async (roomData: RoomCreationData) => {
    await onCreateRoom(roomData);
    setIsCreateModalOpen(false);
  }, [onCreateRoom]);

  const getFilterCount = useCallback((type: FilterType) => {
    switch (type) {
      case 'all':
        return rooms.length;
      case 'waiting':
        return rooms.filter(room => room.status === 'waiting').length;
      case 'playing':
        return rooms.filter(room => room.status === 'playing').length;
      case 'joinable':
        return rooms.filter(room => 
          room.status === 'waiting' && 
          room.currentPlayerCount < room.maxPlayers &&
          !room.players.some(player => player.userId === currentUserId)
        ).length;
      default:
        return 0;
    }
  }, [rooms, currentUserId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🏠 游戏房间</h2>
          <p className="text-gray-600 mt-1">选择房间开始游戏，或创建新房间邀请朋友</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onRefreshRooms}
            disabled={isLoading}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:cursor-not-allowed"
          >
            {isLoading ? '🔄' : '🔄'} 刷新
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            ➕ 创建房间
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
        {/* Search */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            搜索房间或玩家
          </label>
          <input
            id="search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="输入房间名称或玩家用户名..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter Tabs */}
        <div>
          <div className="flex items-center space-x-1 overflow-x-auto">
            {[
              { key: 'all' as FilterType, label: '全部', icon: '📋' },
              { key: 'waiting' as FilterType, label: '等待中', icon: '⏳' },
              { key: 'playing' as FilterType, label: '游戏中', icon: '🎮' },
              { key: 'joinable' as FilterType, label: '可加入', icon: '🚪' },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filterType === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {icon} {label} ({getFilterCount(key)})
              </button>
            ))}
          </div>
        </div>

        {/* Sort Options */}
        <div>
          <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-2">
            排序方式
          </label>
          <select
            id="sort"
            value={sortType}
            onChange={(e) => setSortType(e.target.value as SortType)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="newest">📅 最新创建</option>
            <option value="oldest">📅 最早创建</option>
            <option value="players-asc">👥 玩家数 (少→多)</option>
            <option value="players-desc">👥 玩家数 (多→少)</option>
            <option value="name">🔤 房间名称</option>
          </select>
        </div>
      </div>

      {/* Room Count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>显示 {filteredAndSortedRooms.length} 个房间</span>
        {searchQuery && (
          <span>搜索: &ldquo;{searchQuery}&rdquo;</span>
        )}
      </div>

      {/* Rooms Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-gray-100 rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredAndSortedRooms.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏠</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            {searchQuery ? '没有找到匹配的房间' : '暂无房间'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery 
              ? '尝试调整搜索条件或筛选器'
              : '还没有人创建房间，成为第一个吧！'
            }
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              ➕ 创建第一个房间
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onJoinRoom={onJoinRoom}
              currentUserId={currentUserId}
              isJoining={isJoiningRoom}
            />
          ))}
        </div>
      )}

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateRoom={handleCreateRoom}
        isCreating={isCreatingRoom}
      />
    </div>
  );
} 