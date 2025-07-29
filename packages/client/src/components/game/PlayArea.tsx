'use client';

import React from 'react';
import { GameState, GamePlayer, GamePhase, PlayedCards } from '../../types/game';
import { validateCardHand, canPass } from '../../utils/cardValidation';
import Card from './Card';

interface PlayAreaProps {
  gameState: GameState;
  currentPlayer: GamePlayer;
  selectedCards?: string[];
  onCardPlay?: () => void;
  onPass?: () => void;
  onBid?: (amount: number) => void;
}

const PlayArea: React.FC<PlayAreaProps> = ({
  gameState,
  currentPlayer,
  selectedCards = [],
  onCardPlay,
  onPass,
  onBid
}) => {
  const isMyTurn = currentPlayer && gameState.currentTurn === currentPlayer.position;
  const lastPlay = gameState.lastPlay;

  const renderBiddingControls = () => {
    if (gameState.phase !== 'bidding' || !isMyTurn) {
      return null;
    }

    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <h3 className="text-lg font-semibold text-center mb-3">叫地主</h3>
        <div className="flex space-x-4">
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

    const hasSelectedCards = selectedCards.length > 0;
    const validation = validateCardHand(
      selectedCards, 
      currentPlayer.cards,
      lastPlay ? {
        userId: lastPlay.playerId,
        cards: lastPlay.cards,
        handType: lastPlay.cardType
      } : undefined,
      currentPlayer.userId
    );
    const isValidHand = validation.isValid;

    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        {/* Show last play if exists */}
        {lastPlay && lastPlay.cards.length > 0 && (
          <div className="text-center mb-4">
            <div className="text-sm text-gray-600 mb-1">上家出牌</div>
            <div className="flex justify-center space-x-2">
              {lastPlay.cards.map((card, index) => (
                <Card key={index} card={card} size="small" />
              ))}
            </div>
          </div>
        )}

        {/* Show validation message if cards selected */}
        {hasSelectedCards && (
          <div className={`text-center text-sm mb-3 ${isValidHand ? 'text-green-600' : 'text-red-600'}`}>
            {validation.message}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex space-x-4">
          {/* Pass button - only show if there's a last play and it's not from current player */}
          {canPass(lastPlay ? {
            userId: lastPlay.playerId,
            cards: lastPlay.cards,
            handType: lastPlay.cardType
          } : undefined, currentPlayer.userId) && (
            <button
              onClick={onPass}
              className="px-6 py-2 rounded bg-gray-500 text-white hover:bg-gray-600 transition-colors"
            >
              不要
            </button>
          )}

          {/* Play button */}
          <button
            onClick={onCardPlay}
            disabled={!hasSelectedCards || !isValidHand}
            className={`px-6 py-2 rounded transition-colors ${
              hasSelectedCards && isValidHand
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            出牌 {hasSelectedCards ? `(${selectedCards.length})` : ''}
          </button>
        </div>
      </div>
    );
  };

  const renderLastPlayedCards = () => {
    if (!lastPlay || !lastPlay.cards?.length) {
      return (
        <div className="text-white text-center">
          <p className="text-lg">等待出牌...</p>
        </div>
      );
    }

    const player = gameState.players.find(p => p.userId === lastPlay.playerId);

    return (
      <div className="text-center">
        <p className="text-white mb-2">
          {player?.username} 出了:
        </p>
        <div className="flex justify-center space-x-1 mb-2">
          {lastPlay.cards?.map((card) => (
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