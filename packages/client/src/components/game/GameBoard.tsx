'use client';

import React from 'react';
import { GameState, GamePlayer } from '../../types/game';
import PlayerArea from './PlayerArea';
import PlayArea from './PlayArea';
import GameStatus from './GameStatus';

interface GameBoardProps {
  gameState: GameState;
  currentUserId: string;
  onCardSelect?: (cardId: string) => void;
  onCardPlay?: () => void;
  onPass?: () => void;
  onBid?: (amount: number) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  currentUserId,
  onCardSelect,
  onCardPlay,
  onPass,
  onBid
}) => {
  // Find current user's position and arrange other players
  const currentPlayerIndex = gameState.players.findIndex(p => p.userId === currentUserId);
  const currentPlayer = gameState.players[currentPlayerIndex];
  
  // Arrange players: current player at bottom, others clockwise
  const getPlayerArrangement = (): {
    bottom: GamePlayer;
    left: GamePlayer;
    right: GamePlayer;
  } => {
    const players = gameState.players;
    
    return {
      bottom: players[currentPlayerIndex], // Current player
      left: players[(currentPlayerIndex + 1) % 3], // Next player clockwise
      right: players[(currentPlayerIndex + 2) % 3] // Player after that
    };
  };

  const playerArrangement = getPlayerArrangement();

  return (
    <div className="h-screen w-full bg-gradient-to-br from-green-800 via-green-600 to-green-800 relative overflow-hidden">
      {/* Game Status Bar */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <GameStatus 
          gameState={gameState}
          currentUserId={currentUserId}
        />
      </div>

      {/* Top Player (Opposite) */}
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2">
        <PlayerArea
          player={playerArrangement.left}
          position="top"
          isCurrentPlayer={false}
          isCurrentTurn={gameState.currentTurn === playerArrangement.left.position}
          gamePhase={gameState.phase}
        />
      </div>

      {/* Left Player */}
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
        <PlayerArea
          player={playerArrangement.right}
          position="left"
          isCurrentPlayer={false}
          isCurrentTurn={gameState.currentTurn === playerArrangement.right.position}
          gamePhase={gameState.phase}
        />
      </div>

      {/* Right Player */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
        <PlayerArea
          player={playerArrangement.left}
          position="right"
          isCurrentPlayer={false}
          isCurrentTurn={gameState.currentTurn === playerArrangement.left.position}
          gamePhase={gameState.phase}
        />
      </div>

      {/* Central Play Area */}
      <div className="absolute inset-0 flex items-center justify-center">
        <PlayArea
          gameState={gameState}
          currentPlayer={currentPlayer}
          onCardPlay={onCardPlay}
          onPass={onPass}
          onBid={onBid}
        />
      </div>

      {/* Current Player Area (Bottom) */}
      <div className="absolute bottom-0 left-0 right-0">
        <PlayerArea
          player={playerArrangement.bottom}
          position="bottom"
          isCurrentPlayer={true}
          isCurrentTurn={gameState.currentTurn === playerArrangement.bottom.position}
          gamePhase={gameState.phase}
          onCardSelect={onCardSelect}
          showCards={true}
        />
      </div>

      {/* Turn Indicator */}
      {gameState.currentTurn !== undefined && (
        <div className="absolute top-4 right-4 z-20">
          <div className="bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-semibold animate-pulse">
            {gameState.players[gameState.currentTurn]?.username} 的回合
          </div>
        </div>
      )}

      {/* Game Phase Indicator */}
      <div className="absolute top-4 left-4 z-20">
        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
          gameState.phase === 'bidding' ? 'bg-orange-500 text-white' :
          gameState.phase === 'playing' ? 'bg-blue-500 text-white' :
          gameState.phase === 'finished' ? 'bg-red-500 text-white' :
          'bg-gray-500 text-white'
        }`}>
          {gameState.phase === 'bidding' ? '叫地主' :
           gameState.phase === 'playing' ? '游戏中' :
           gameState.phase === 'finished' ? '游戏结束' :
           '等待中'}
        </div>
      </div>

      {/* Landlord Indicator */}
      {gameState.landlord && (
        <div className="absolute top-12 left-4 z-20">
          <div className="bg-yellow-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
            👑 地主: {gameState.players.find(p => p.userId === gameState.landlord)?.username}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard; 