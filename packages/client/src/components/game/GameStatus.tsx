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
    <div className="bg-black bg-opacity-50 text-white p-2">
      <div className="flex justify-between items-center max-w-6xl mx-auto">
        {/* Left side - Game info */}
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded text-sm font-semibold ${phaseInfo.color}`}>
            {phaseInfo.text}
          </div>
          
          {gameState.landlord && (
            <div className="flex items-center space-x-2">
              <span className="text-yellow-400">👑</span>
              <span className="text-sm">
                地主: {gameState.players.find(p => p.userId === gameState.landlord)?.username}
              </span>
            </div>
          )}

          {gameState.currentTurn !== undefined && (
            <div className="text-sm">
              当前回合: {gameState.players[gameState.currentTurn]?.username}
            </div>
          )}
        </div>

        {/* Center - Room ID */}
        <div className="text-center">
          <div className="text-xs opacity-75">房间 ID</div>
          <div className="text-sm font-mono">{gameState.id.slice(-8)}</div>
        </div>

        {/* Right side - Player info */}
        <div className="flex items-center space-x-4">
          {currentPlayer && (
            <div className="text-sm">
              <span className="opacity-75">我的手牌: </span>
              <span className="font-semibold">{currentPlayer.cardCount} 张</span>
            </div>
          )}

          <div className="text-sm">
            <span className="opacity-75">在线: </span>
            <span className="font-semibold">
              {gameState.players.filter(p => p.isConnected).length}/{gameState.players.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameStatus; 