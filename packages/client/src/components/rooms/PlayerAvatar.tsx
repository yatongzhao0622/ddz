'use client';

import { Player } from '../../services/socketService';

interface PlayerAvatarProps {
  player: Player;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  showReadyStatus?: boolean;
  isCurrentUser?: boolean;
  onClick?: () => void;
}

export default function PlayerAvatar({ 
  player, 
  size = 'md', 
  showStatus = true, 
  showReadyStatus = true,
  isCurrentUser = false,
  onClick 
}: PlayerAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const getAvatarColor = () => {
    if (!player.isConnected) return 'bg-gray-400';
    if (isCurrentUser) return 'bg-blue-600';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!player.isConnected) return '离线';
    if (player.isReady) return '准备就绪';
    return '在线';
  };

  const getStatusColor = () => {
    if (!player.isConnected) return 'text-gray-500';
    if (player.isReady) return 'text-green-600';
    return 'text-blue-600';
  };

  return (
    <div 
      className={`flex items-center space-x-3 ${onClick ? 'cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors' : ''}`}
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="relative">
        <div className={`${sizeClasses[size]} ${getAvatarColor()} rounded-full flex items-center justify-center text-white font-bold`}>
          {player.username.charAt(0).toUpperCase()}
        </div>
        
        {/* Connection Status Indicator */}
        {showStatus && (
          <div className="absolute -bottom-1 -right-1">
            <div className={`w-3 h-3 rounded-full border-2 border-white ${
              player.isConnected ? 'bg-green-400' : 'bg-gray-400'
            }`} />
          </div>
        )}
        
        {/* Ready Status Indicator */}
        {showReadyStatus && player.isReady && player.isConnected && (
          <div className="absolute -top-1 -right-1">
            <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
          </div>
        )}
      </div>

      {/* Player Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <p className={`font-medium text-gray-900 truncate ${textSizes[size]}`}>
            {player.username}
          </p>
          {isCurrentUser && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
              你
            </span>
          )}
        </div>
        
        {showStatus && (
          <p className={`${getStatusColor()} text-xs truncate`}>
            {getStatusText()}
          </p>
        )}
      </div>

      {/* Additional Status Icons */}
      <div className="flex items-center space-x-1">
        {player.isReady && player.isConnected && showReadyStatus && (
          <div className="flex items-center space-x-1">
            <span className="text-green-500 text-sm">✓</span>
            <span className="text-xs text-green-600">就绪</span>
          </div>
        )}
        
        {!player.isConnected && showStatus && (
          <div className="flex items-center space-x-1">
            <span className="text-gray-400 text-sm">⚫</span>
            <span className="text-xs text-gray-500">离线</span>
          </div>
        )}
      </div>
    </div>
  );
} 