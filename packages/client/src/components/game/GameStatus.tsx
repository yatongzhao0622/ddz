'use client';

import React from 'react';
import { GameState } from '../../types/game';

interface GameStatusProps {
  gameState: GameState;
  currentUserId: string;
}

const GameStatus: React.FC<GameStatusProps> = ({ gameState, currentUserId }) => {
  const currentPlayer = gameState.players.find(p => p.userId === currentUserId);
  
  const getGamePhaseDisplay = () => {
    switch (gameState.phase) {
      case 'waiting':
        return { text: '等待开始', color: 'bg-gray-500' };
      case 'bidding':
        return { text: '叫地主', color: 'bg-orange-500' };
      case 'playing':
        return { text: '游戏中', color: 'bg-green-500' };
      case 'finished':
        return { text: '游戏结束', color: 'bg-red-500' };
      default:
        return { text: '未知', color: 'bg-gray-500' };
    }
  };

  const phaseInfo = getGamePhaseDisplay();

  return (
    <div className="bg-gradient-to-r from-black/60 via-black/70 to-black/60 backdrop-blur-sm text-white py-3 px-6 border-b border-white/10 rounded-2xl">
      <div className="flex justify-between items-center mx-auto">
        {/* Left side - Game info */}
        <div className="flex items-center space-x-6 min-w-0 flex-1">
          <div className={`px-4 py-2 rounded-lg text-sm font-bold shadow-lg border border-white/20 ${phaseInfo.color}`}>
            {phaseInfo.text}
          </div>
          
          {gameState.currentTurn !== undefined && (
            <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">
                {gameState.players[gameState.currentTurn]?.username} 的回合
              </span>
            </div>
          )}

          {gameState.landlord && (
            <div className="flex items-center space-x-2 bg-yellow-500/20 backdrop-blur-sm px-3 py-2 rounded-lg border border-yellow-500/30">
              <span className="text-yellow-400 text-lg">👑</span>
              <span className="text-sm font-medium">
                地主: {gameState.players.find(p => p.userId === gameState.landlord)?.username}
              </span>
            </div>
          )}
        </div>

        {/* Center - Room ID */}
        <div className="text-center px-6">
          <div className="bg-white/10 backdrop-blur-sm px-4 py-3 rounded-lg border border-white/20">
            <div className="text-xs opacity-75 mb-1 font-medium">房间 ID</div>
            <div className="text-sm font-mono font-bold tracking-wider">{gameState.id.slice(-8)}</div>
          </div>
        </div>

        {/* Right side - Player info */}
        <div className="flex items-center space-x-4 min-w-0 flex-1 justify-end">
          {currentPlayer && (
            <div className="bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20">
              <div className="text-xs opacity-75 mb-1">我的手牌</div>
              <div className="text-sm font-bold">{currentPlayer.cardCount} 张</div>
            </div>
          )}

          <div className="bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20">
            <div className="text-xs opacity-75 mb-1">在线状态</div>
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                {gameState.players.map((player, index) => (
                  <div
                    key={player.userId}
                    className={`w-2 h-2 rounded-full ${
                      player.isConnected ? 'bg-green-400' : 'bg-red-400'
                    }`}
                    title={`${player.username}: ${player.isConnected ? '在线' : '离线'}`}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold">
                {gameState.players.filter(p => p.isConnected).length}/{gameState.players.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameStatus; 