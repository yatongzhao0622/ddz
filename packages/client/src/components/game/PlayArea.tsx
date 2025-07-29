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
      <div className="flex flex-col items-center justify-center space-y-6">
        <h3 className="text-xl font-bold text-white text-center mb-2">叫地主</h3>
        <div className="flex space-x-3">
          <button
            onClick={() => onBid?.(0)}
            className="px-6 py-3 bg-gradient-to-b from-gray-500 to-gray-700 text-white rounded-xl hover:from-gray-400 hover:to-gray-600 transition-all duration-200 shadow-lg font-bold border border-gray-400"
          >
            不叫
          </button>
          <button
            onClick={() => onBid?.(1)}
            className="px-6 py-3 bg-gradient-to-b from-yellow-500 to-yellow-700 text-white rounded-xl hover:from-yellow-400 hover:to-yellow-600 transition-all duration-200 shadow-lg font-bold border border-yellow-400"
          >
            1分
          </button>
          <button
            onClick={() => onBid?.(2)}
            className="px-6 py-3 bg-gradient-to-b from-orange-500 to-orange-700 text-white rounded-xl hover:from-orange-400 hover:to-orange-600 transition-all duration-200 shadow-lg font-bold border border-orange-400"
          >
            2分
          </button>
          <button
            onClick={() => onBid?.(3)}
            className="px-6 py-3 bg-gradient-to-b from-red-500 to-red-700 text-white rounded-xl hover:from-red-400 hover:to-red-600 transition-all duration-200 shadow-lg font-bold border border-red-400"
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
      <div className="flex flex-col items-center justify-center space-y-6">
        {/* Show last play if exists */}
        {lastPlay && lastPlay.cards.length > 0 && (
          <div className="text-center mb-4 bg-black/40 backdrop-blur-sm p-4 rounded-xl border border-white/20">
            <div className="text-sm text-gray-300 mb-3 font-semibold">上家出牌</div>
            <div className="flex justify-center space-x-1 mb-2">
              {lastPlay.cards.map((card, index) => (
                <Card key={index} card={card} size="small" />
              ))}
            </div>
            <div className="text-xs text-gray-400 bg-white/10 px-3 py-1 rounded-lg inline-block">
              {lastPlay.cardType}
            </div>
          </div>
        )}

        {/* Show validation message if cards selected */}
        {hasSelectedCards && (
          <div className={`text-center text-sm mb-3 px-4 py-2 rounded-xl font-semibold ${
            isValidHand 
              ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
              : 'bg-red-500/20 text-red-300 border border-red-500/30'
          }`}>
            {validation.message}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex space-x-4">
          {/* Pass button */}
          {canPass(lastPlay ? {
            userId: lastPlay.playerId,
            cards: lastPlay.cards,
            handType: lastPlay.cardType
          } : undefined, currentPlayer.userId) && (
            <button
              onClick={onPass}
              className="px-8 py-3 bg-gradient-to-b from-gray-500 to-gray-700 text-white rounded-xl hover:from-gray-400 hover:to-gray-600 transition-all duration-200 shadow-lg font-bold border border-gray-400"
            >
              不要
            </button>
          )}

          {/* Play button */}
          <button
            onClick={onCardPlay}
            disabled={!hasSelectedCards || !isValidHand}
            className={`px-8 py-3 rounded-xl transition-all duration-200 shadow-lg font-bold border ${
              hasSelectedCards && isValidHand
                ? 'bg-gradient-to-b from-blue-500 to-blue-700 text-white hover:from-blue-400 hover:to-blue-600 border-blue-400'
                : 'bg-gradient-to-b from-gray-600 to-gray-800 text-gray-400 cursor-not-allowed border-gray-600'
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
        <div className="text-white text-center bg-black/30 backdrop-blur-sm p-8 rounded-xl border border-white/20">
          <p className="text-xl font-semibold">等待出牌...</p>
        </div>
      );
    }

    const player = gameState.players.find(p => p.userId === lastPlay.playerId);

    return (
      <div className="text-center bg-black/40 backdrop-blur-sm p-6 rounded-xl border border-white/20">
        <p className="text-white mb-4 text-lg font-semibold">
          {player?.username} 出了:
        </p>
        <div className="flex justify-center space-x-1 mb-3">
          {lastPlay.cards?.map((card) => (
            <Card
              key={card.id}
              card={card}
              size="small"
              className="shadow-lg"
            />
          ))}
        </div>
        <p className="text-white text-sm opacity-75 bg-white/10 px-3 py-1 rounded-lg inline-block">
          {lastPlay.cardType}
        </p>
      </div>
    );
  };

  const renderLandlordCards = () => {
    if (gameState.phase === 'bidding' && gameState.landlordCards.length > 0) {
      return (
        <div className="absolute -top-8 text-center bg-black/40 backdrop-blur-sm p-4 rounded-xl border border-white/20">
          <p className="text-white mb-3 font-semibold">底牌</p>
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
          <div className="text-white text-center bg-black/30 backdrop-blur-sm p-8 rounded-xl border border-white/20">
            <p className="text-xl font-semibold">等待玩家准备...</p>
          </div>
        );
      case 'bidding':
        return (
          <div className="text-white text-center bg-black/30 backdrop-blur-sm p-8 rounded-xl border border-white/20">
            <p className="text-lg mb-3 font-semibold">叫地主阶段</p>
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
          <div className="text-white text-center bg-black/30 backdrop-blur-sm p-8 rounded-xl border border-white/20">
            <p className="text-xl font-semibold">游戏结束</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative w-96 h-80 flex flex-col items-center justify-center">
      {/* Landlord cards display */}
      {renderLandlordCards()}

      {/* Main play area content */}
      <div className="flex-1 flex items-center justify-center w-full">
        {renderGamePhaseInfo()}
      </div>

      {/* Control buttons at bottom */}
      <div className="mt-6">
        {renderBiddingControls()}
        {renderPlayingControls()}
      </div>

      {/* Turn indicator */}
      {isMyTurn && (
        <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-2 rounded-xl text-sm font-bold animate-pulse shadow-lg border border-red-400">
            轮到你了！
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayArea; 