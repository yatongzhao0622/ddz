'use client';

import React from 'react';
import { GamePhase, GamePlayer } from '../../types/game';

interface GameControlsProps {
  gamePhase: GamePhase;
  isMyTurn: boolean;
  currentPlayer?: GamePlayer;
  hasSelectedCards?: boolean;
  onBid?: (amount: number) => void;
  onPlay?: () => void;
  onPass?: () => void;
  onHint?: () => void;
  onSortCards?: () => void;
}

const GameControls: React.FC<GameControlsProps> = ({
  gamePhase,
  isMyTurn,
  currentPlayer,
  hasSelectedCards = false,
  onBid,
  onPlay,
  onPass,
  onHint,
  onSortCards
}) => {
  const renderBiddingControls = () => {
    if (gamePhase !== 'bidding' || !isMyTurn) return null;

    return (
      <div className="flex space-x-2">
        <button
          onClick={() => onBid?.(0)}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
        >
          不叫
        </button>
        <button
          onClick={() => onBid?.(1)}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors text-sm"
        >
          1分
        </button>
        <button
          onClick={() => onBid?.(2)}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-sm"
        >
          2分
        </button>
        <button
          onClick={() => onBid?.(3)}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
        >
          3分
        </button>
      </div>
    );
  };

  const renderPlayingControls = () => {
    if (gamePhase !== 'playing' || !isMyTurn) return null;

    return (
      <div className="flex space-x-2">
        <button
          onClick={onPlay}
          disabled={!hasSelectedCards}
          className={`px-6 py-2 rounded transition-colors text-sm ${
            hasSelectedCards
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          出牌
        </button>
        <button
          onClick={onPass}
          className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
        >
          不要
        </button>
        <button
          onClick={onHint}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
          title="提示可出牌型"
        >
          提示
        </button>
      </div>
    );
  };

  const renderUtilityControls = () => {
    return (
      <div className="flex space-x-2 mt-2">
        <button
          onClick={onSortCards}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs"
          title="整理手牌"
        >
          整理
        </button>
        <button
          className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-xs"
          title="游戏设置"
        >
          设置
        </button>
      </div>
    );
  };

  return (
    <div className="bg-black bg-opacity-50 text-white p-3 rounded-lg">
      <div className="flex flex-col items-center">
        {/* Main action controls */}
        <div className="mb-2">
          {renderBiddingControls()}
          {renderPlayingControls()}
        </div>

        {/* Utility controls */}
        {renderUtilityControls()}

        {/* Status info */}
        {isMyTurn && (
          <div className="mt-2 text-yellow-400 text-sm font-semibold animate-pulse">
            轮到你了！
          </div>
        )}

        {currentPlayer && !isMyTurn && (
          <div className="mt-2 text-gray-400 text-sm">
            等待其他玩家...
          </div>
        )}
      </div>
    </div>
  );
};

export default GameControls; 