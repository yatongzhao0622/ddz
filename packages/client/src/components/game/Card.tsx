'use client';

import React from 'react';
import { Card as CardType, CardSuit, CardRank } from '../../types/game';

interface CardProps {
  card: CardType;
  isSelected?: boolean;
  isDisabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  onClick?: (card: CardType) => void;
  className?: string;
}

const Card: React.FC<CardProps> = ({
  card,
  isSelected = false,
  isDisabled = false,
  size = 'medium',
  onClick,
  className = ''
}) => {
  const getSuitSymbol = (suit?: CardSuit): string => {
    if (!suit) return ''; // Jokers don't have suits
    
    switch (suit) {
      case CardSuit.SPADES: return '♠';
      case CardSuit.HEARTS: return '♥';
      case CardSuit.DIAMONDS: return '♦';
      case CardSuit.CLUBS: return '♣';
      default: return '';
    }
  };

  const getSuitColor = (suit?: CardSuit): string => {
    if (!suit) return 'text-purple-600'; // Jokers
    
    switch (suit) {
      case CardSuit.HEARTS:
      case CardSuit.DIAMONDS:
        return 'text-red-600';
      case CardSuit.SPADES:
      case CardSuit.CLUBS:
        return 'text-gray-800';
      default:
        return 'text-gray-800';
    }
  };

  const getRankDisplay = (rank: CardRank): string => {
    switch (rank) {
      case CardRank.BLACK_JOKER: return '小王';
      case CardRank.RED_JOKER: return '大王';
      case CardRank.JACK: return 'J';
      case CardRank.QUEEN: return 'Q'; 
      case CardRank.KING: return 'K';
      case CardRank.ACE: return 'A';
      default: return rank;
    }
  };

  const getSizeClasses = (size: string): string => {
    switch (size) {
      case 'small':
        return 'w-8 h-12 text-xs';
      case 'large':
        return 'w-16 h-24 text-lg';
      case 'medium':
      default:
        return 'w-12 h-18 text-sm';
    }
  };

  const getCardBackground = (): string => {
    if (card.rank === CardRank.BLACK_JOKER) {
      return 'bg-gradient-to-br from-gray-900 to-gray-700';
    }
    if (card.rank === CardRank.RED_JOKER) {
      return 'bg-gradient-to-br from-red-600 to-red-800';
    }
    return 'bg-white';
  };

  const getTextColor = (): string => {
    if (card.rank === CardRank.BLACK_JOKER || card.rank === CardRank.RED_JOKER) {
      return 'text-white';
    }
    return getSuitColor(card.suit);
  };

  const handleClick = () => {
    if (!isDisabled && onClick) {
      onClick(card);
    }
  };

  return (
    <div
      className={`
        ${getSizeClasses(size)}
        ${getCardBackground()}
        ${getTextColor()}
        border-2 border-gray-300 rounded-lg cursor-pointer
        select-none relative overflow-hidden
        transition-all duration-200 ease-in-out
        hover:scale-105 hover:shadow-lg
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 transform translate-y-[-8px]' : ''}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      onClick={handleClick}
      title={`${getRankDisplay(card.rank)}${card.suit ? getSuitSymbol(card.suit) : ''}`}
    >
      {/* Top-left corner */}
      <div className="absolute top-1 left-1 flex flex-col items-center leading-none">
        <span className="font-bold">{getRankDisplay(card.rank)}</span>
        {card.suit && (
          <span className="text-xs">{getSuitSymbol(card.suit)}</span>
        )}
      </div>

      {/* Center symbol/character */}
      <div className="absolute inset-0 flex items-center justify-center">
        {card.rank === CardRank.BLACK_JOKER ? (
          <div className="text-center">
            <div className="text-lg font-bold">小</div>
            <div className="text-xs">王</div>
          </div>
        ) : card.rank === CardRank.RED_JOKER ? (
          <div className="text-center">
            <div className="text-lg font-bold">大</div>
            <div className="text-xs">王</div>
          </div>
        ) : (
          <span className="text-2xl font-bold opacity-20">
            {getSuitSymbol(card.suit)}
          </span>
        )}
      </div>

      {/* Bottom-right corner (rotated) */}
      <div className="absolute bottom-1 right-1 flex flex-col items-center leading-none transform rotate-180">
        <span className="font-bold">{getRankDisplay(card.rank)}</span>
        {card.suit && (
          <span className="text-xs">{getSuitSymbol(card.suit)}</span>
        )}
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 rounded-lg border-2 border-blue-500"></div>
      )}
    </div>
  );
};

export default Card; 