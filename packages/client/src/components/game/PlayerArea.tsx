'use client';

import React from 'react';
import { GamePlayer, GamePhase, Card as CardType } from '../../types/game';
import Card from './Card';

interface PlayerAreaProps {
  player: GamePlayer;
  position: 'top' | 'left' | 'right' | 'bottom';
  isCurrentPlayer: boolean;
  isCurrentTurn: boolean;
  gamePhase: GamePhase;
  onCardSelect?: (cardId: string) => void;
  showCards?: boolean;
}

const PlayerArea: React.FC<PlayerAreaProps> = ({
  player,
  position,
  isCurrentPlayer,
  isCurrentTurn,
  gamePhase,
  onCardSelect,
  showCards = false
}) => {
  const getPositionClasses = () => {
    const baseClasses = "flex flex-col items-center space-y-2";
    
    switch (position) {
      case 'top':
        return `${baseClasses} transform`;
      case 'left':
        return `${baseClasses} transform -rotate-90`;
      case 'right':
        return `${baseClasses} transform rotate-90`;
      case 'bottom':
      default:
        return baseClasses;
    }
  };

  const getCardContainerClasses = () => {
    const baseClasses = "flex";
    
    switch (position) {
      case 'top':
        return `${baseClasses} flex-row space-x-1`;
      case 'left':
      case 'right':
        return `${baseClasses} flex-col space-y-1`;
      case 'bottom':
      default:
        return `${baseClasses} flex-row space-x-2`;
    }
  };

  const getPlayerInfoClasses = () => {
    const baseClasses = "text-center p-2 rounded-lg min-w-max";
    
    if (isCurrentTurn) {
      return `${baseClasses} bg-yellow-400 text-black ring-2 ring-yellow-300 animate-pulse`;
    }
    
    if (player.role === 'landlord') {
      return `${baseClasses} bg-yellow-600 text-white ring-2 ring-yellow-500`;
    }
    
    return `${baseClasses} bg-gray-700 text-white`;
  };

  const renderCards = () => {
    if (showCards && isCurrentPlayer) {
      // Show actual cards for current player
      return (
        <div className={getCardContainerClasses()}>
          {player.cards.map((card, index) => (
            <Card
              key={card.id}
              card={card}
              size={position === 'bottom' ? 'medium' : 'small'}
              isSelected={card.isSelected}
              onClick={() => onCardSelect?.(card.id)}
              className={position === 'bottom' ? 'hover:translate-y-[-4px]' : ''}
            />
          ))}
        </div>
      );
    } else {
      // Show card backs for other players
      const cardCount = player.cardCount;
      const cardsToShow = Math.min(cardCount, position === 'bottom' ? 17 : 8); // Limit display
      
      return (
        <div className={getCardContainerClasses()}>
          {Array.from({ length: cardsToShow }, (_, index) => (
            <div
              key={index}
              className={`
                ${position === 'bottom' ? 'w-12 h-18' : 'w-8 h-12'}
                bg-blue-900 border-2 border-blue-700 rounded-lg
                flex items-center justify-center text-white text-xs
                ${position === 'left' || position === 'right' ? 'transform rotate-90' : ''}
              `}
            >
              🂠
            </div>
          ))}
          {cardCount > cardsToShow && (
            <div className="text-white text-xs bg-gray-600 rounded px-2 py-1">
              +{cardCount - cardsToShow}
            </div>
          )}
        </div>
      );
    }
  };

  const getPlayerStatusIcon = () => {
    if (!player.isConnected) return '🔌';
    if (player.role === 'landlord') return '👑';
    if (player.isReady) return '✅';
    return '⏳';
  };

  return (
    <div className={getPositionClasses()}>
      {/* Player Info */}
      <div className={getPlayerInfoClasses()}>
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getPlayerStatusIcon()}</span>
          <div>
            <div className="font-semibold text-sm">
              {player.username}
            </div>
            <div className="text-xs opacity-75">
              {player.cardCount} 张牌
            </div>
          </div>
        </div>
        
        {/* Additional info for current turn */}
        {isCurrentTurn && (
          <div className="text-xs mt-1 font-bold">
            {gamePhase === 'bidding' ? '叫地主中...' : '出牌中...'}
          </div>
        )}
        
        {/* Bid amount during bidding phase */}
        {gamePhase === 'bidding' && player.bidAmount !== undefined && (
          <div className="text-xs mt-1">
            叫分: {player.bidAmount === 0 ? '不叫' : player.bidAmount}
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="relative">
        {renderCards()}
        
        {/* Card count indicator for non-current players */}
        {!isCurrentPlayer && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
            {player.cardCount}
          </div>
        )}
      </div>

      {/* Connection status indicator */}
      {!player.isConnected && (
        <div className="text-red-400 text-xs">
          🔌 连接断开
        </div>
      )}
    </div>
  );
};

export default PlayerArea; 