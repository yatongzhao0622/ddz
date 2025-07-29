'use client';

import React from 'react';
import { GamePlayer, GamePhase, Card as CardType } from '../../types/game';
import Card from './Card';

interface PlayerAreaProps {
  player: GamePlayer;
  position: 'bottom' | 'left' | 'right' | 'top';
  isCurrentPlayer: boolean;
  isCurrentTurn: boolean;
  gamePhase: GamePhase;
  onCardSelect?: (cardId: string) => void;
  showCards?: boolean;
  selectedCards?: string[]; // Add selectedCards prop
}

const PlayerArea: React.FC<PlayerAreaProps> = ({
  player,
  position,
  isCurrentPlayer,
  isCurrentTurn,
  gamePhase,
  onCardSelect,
  showCards = false,
  selectedCards = []
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
    switch (position) {
      case 'right':
        return 'flex items-center justify-center';
      case 'left':
        return 'flex items-center justify-center';
      case 'bottom':
        return 'flex items-end justify-center';
      default:
        return 'flex items-center justify-center space-x-1';
    }
  };

  const getPlayerInfoClasses = () => {
    const baseClasses = 'flex flex-col items-center space-y-2';
    switch (position) {
      case 'right':
        return `${baseClasses}`;
      case 'left':
        return `${baseClasses}`;
      case 'bottom':
        return `${baseClasses}`;
      default:
        return baseClasses;
    }
  };

  const renderPlayerAvatar = () => {
    const avatarSize = position === 'bottom' ? 'w-16 h-16' : 'w-14 h-14';
    const isLandlord = player.role === 'landlord';
    
    return (
      <div className="relative">
        <div className={`${avatarSize} rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold ${
          position === 'bottom' ? 'text-lg' : 'text-base'
        } shadow-lg ${
          isCurrentTurn ? 'ring-4 ring-yellow-400 ring-opacity-75 animate-pulse' : ''
        } ${isLandlord ? 'ring-2 ring-yellow-500' : ''}`}>
          {player.username.charAt(0).toUpperCase()}
        </div>
        {isLandlord && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-xs">
            👑
          </div>
        )}
        {isCurrentTurn && (
          <div className={`absolute ${
            position === 'bottom' ? '-bottom-2' : '-bottom-1'
          } left-1/2 transform -translate-x-1/2 bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-bold`}>
            出牌
          </div>
        )}
      </div>
    );
  };

  const renderCardCount = () => {
    if (position === 'bottom') return null;
    
    return (
      <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm font-bold">
        {player.cardCount}张
      </div>
    );
  };

  if (showCards && player.cards) {
    return (
      <div className="flex flex-col items-center space-y-3">
        <div className={getPlayerInfoClasses()}>
          {renderPlayerAvatar()}
          <span className="text-white font-bold text-sm bg-black/40 backdrop-blur-sm px-3 py-1 rounded-lg">
            {player.username}
          </span>
        </div>
        <div className={getCardContainerClasses()}>
          {player.cards.map((card, index) => {
            const isSelected = selectedCards?.includes(card.id);
            let cardStyle: React.CSSProperties = {};
            
            if (position === 'bottom') {
              // Fan layout for bottom player
              const totalCards = player.cards.length;
              const centerIndex = (totalCards - 1) / 2;
              const offsetFromCenter = index - centerIndex;
              const rotationAngle = offsetFromCenter * 3; // 3 degrees per card
              const translateY = Math.abs(offsetFromCenter) * 2; // Slight curve
              
              cardStyle = {
                transform: `rotate(${rotationAngle}deg) translateY(${translateY}px) ${
                  isSelected ? 'translateY(-20px) scale(1.05)' : ''
                }`,
                marginLeft: index === 0 ? '0' : '-8px',
                zIndex: isSelected ? 50 : index
              };
            } else {
              // Horizontal stacked layout for side players
              cardStyle = {
                marginLeft: index === 0 ? '0' : '-6px',
                zIndex: player.cards.length - index
              };
            }
            
            return (
              <Card
                key={card.id}
                card={card}
                isSelected={isSelected}
                onClick={() => onCardSelect?.(card.id)}
                size={position === 'bottom' ? 'medium' : 'small'}
                className={position === 'bottom' ? 'transition-all duration-200 hover:scale-105' : ''}
                style={cardStyle}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className={getPlayerInfoClasses()}>
        {renderPlayerAvatar()}
        <span className="text-white font-bold text-sm bg-black/40 backdrop-blur-sm px-3 py-1 rounded-lg">
          {player.username}
        </span>
        {renderCardCount()}
      </div>
      <div className={getCardContainerClasses()}>
        {Array.from({ length: player.cardCount }, (_, index) => (
          <div
            key={index}
            className={`
              w-12 h-18
              bg-gradient-to-br from-blue-900 to-blue-800
              border border-blue-600 rounded-md
              flex items-center justify-center text-blue-300 text-2xl
              shadow-md
            `}
            style={{
              marginLeft: index === 0 ? '0' : '-30px',
              zIndex: player.cardCount - index
            }}
          >
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerArea; 