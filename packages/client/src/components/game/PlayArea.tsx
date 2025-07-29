'use client';

import React from 'react';
import { GameState, GamePlayer, GamePhase } from '../../types/game';
import Card from './Card';

interface PlayAreaProps {
  gameState: GameState;
  currentPlayer?: GamePlayer;
  onCardPlay?: () => void;
  onPass?: () => void;
  onBid?: (amount: number) => void;
}

const PlayArea: React.FC<PlayAreaProps> = ({
  gameState,
  currentPlayer,
  onCardPlay,
  onPass,
  onBid
}) => {
  const isMyTurn = currentPlayer && gameState.currentTurn === currentPlayer.position;

  const renderBiddingControls = () => {
    if (gameState.phase !== 'bidding' || !isMyTurn) {
      return null;
    }

    return (
      <div className="bg-white bg-opacity-90 rounded-lg p-4 shadow-lg">
        <h3 className="text-lg font-semibold text-center mb-3">叫地主</h3>
        <div className="flex space-x-2 justify-center">
          <button
            onClick={() => onBid?.(0)}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            不叫
          </button>
          <button
            onClick={() => onBid?.(1)}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
          >
            1分
          </button>
          <button
            onClick={() => onBid?.(2)}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
          >
            2分
          </button>
          <button
            onClick={() => onBid?.(3)}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            3分
          </button>
        </div>
      </div>
    );
  };

  const renderPlayingControls = () => {
    if (gameState.phase !== 'playing' || !isMyTurn) {
      return null;
    }

    const hasSelectedCards = currentPlayer?.cards.some(card => card.isSelected) || false;

    return (
      <div className="bg-white bg-opacity-90 rounded-lg p-4 shadow-lg">
        <h3 className="text-lg font-semibold text-center mb-3">出牌</h3>
        <div className="flex space-x-3 justify-center">
          <button
            onClick={onCardPlay}
            disabled={!hasSelectedCards}
            className={`px-6 py-2 rounded transition-colors ${
              hasSelectedCards
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            出牌
          </button>
          <button
            onClick={onPass}
            className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            不要
          </button>
        </div>
      </div>
    );
  };

  const renderLastPlayedCards = () => {
    if (!gameState.lastPlay || !gameState.lastPlay.cards.length) {
      return (
        <div className="text-white text-center">
          <p className="text-lg">等待出牌...</p>
        </div>
      );
    }

    const lastPlay = gameState.lastPlay;
    const player = gameState.players.find(p => p.userId === lastPlay.playerId);

    return (
      <div className="text-center">
        <p className="text-white mb-2">
          {player?.username} 出了:
        </p>
        <div className="flex justify-center space-x-1 mb-2">
          {lastPlay.cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              size="small"
              className="shadow-lg"
            />
          ))}
        </div>
        <p className="text-white text-sm opacity-75">
          {lastPlay.cardType}
        </p>
      </div>
    );
  };

  const renderLandlordCards = () => {
    if (gameState.phase === 'bidding' && gameState.landlordCards.length > 0) {
      return (
        <div className="absolute top-4 text-center">
          <p className="text-white mb-2">底牌:</p>
          <div className="flex justify-center space-x-1">
            {gameState.landlordCards.map((card) => (
              <Card
                key={card.id}
                card={card}
                size="small"
                className="shadow-lg"
              />
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderGamePhaseInfo = () => {
    switch (gameState.phase) {
      case 'waiting':
        return (
          <div className="text-white text-center">
            <p className="text-xl">等待玩家准备...</p>
          </div>
        );
      case 'bidding':
        return (
          <div className="text-white text-center">
            <p className="text-lg mb-2">叫地主阶段</p>
            {!isMyTurn && (
              <p className="text-sm opacity-75">
                等待 {gameState.players[gameState.currentTurn]?.username} 叫地主
              </p>
            )}
          </div>
        );
      case 'playing':
        return renderLastPlayedCards();
      case 'finished':
        return (
          <div className="text-white text-center">
            <p className="text-xl">游戏结束</p>
            {/* Game results will be shown here */}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative w-80 h-60 flex flex-col items-center justify-center">
      {/* Landlord cards display */}
      {renderLandlordCards()}

      {/* Main play area content */}
      <div className="flex-1 flex items-center justify-center">
        {renderGamePhaseInfo()}
      </div>

      {/* Control buttons at bottom */}
      <div className="mt-4">
        {renderBiddingControls()}
        {renderPlayingControls()}
      </div>

      {/* Turn timer could go here */}
      {isMyTurn && (
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
          <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm animate-pulse">
            轮到你了！
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayArea; 