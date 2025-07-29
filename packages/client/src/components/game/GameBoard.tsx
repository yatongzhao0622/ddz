'use client';

import React from 'react';
import { GameState, GamePlayer, GamePhase } from '../../types/game';
import PlayerArea from './PlayerArea';
import PlayArea from './PlayArea';
import GameStatus from './GameStatus';
import GameOverPanel from './GameOverPanel';

interface GameBoardProps {
  gameState: GameState;
  currentUserId: string;
  selectedCards?: string[];
  onCardSelect?: (cardId: string) => void;
  onCardPlay?: () => void;
  onPass?: () => void;
  onBid?: (amount: number) => void;
  onLeaveGame?: () => void;
}

const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  currentUserId,
  selectedCards = [],
  onCardSelect,
  onCardPlay,
  onPass,
  onBid,
  onLeaveGame
}) => {
  // Find current user's position and arrange other players
  const currentPlayerIndex = gameState.players.findIndex(p => p.userId === currentUserId);
  const currentPlayer = gameState.players[currentPlayerIndex];
  
  // Arrange players: current player at bottom, others clockwise
  const getPlayerArrangement = (): {
    bottom: GamePlayer;
    right: GamePlayer;
    left: GamePlayer;
  } => {
    const players = gameState.players;
    
    return {
      bottom: players[currentPlayerIndex], // Current player
      right: players[(currentPlayerIndex + 1) % 3], // Next player clockwise (right side)
      left: players[(currentPlayerIndex + 2) % 3] // Third player (left side)
    };
  };

  const playerArrangement = getPlayerArrangement();

  return (
    <div className="h-screen w-full relative overflow-hidden bg-gradient-to-br from-green-900 via-green-800 to-green-900">
      {/* Felt texture overlay */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, rgba(0,0,0,0.15) 1px, transparent 0)`,
        backgroundSize: '20px 20px'
      }}></div>
      
      {/* Game Status Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/40 to-transparent p-4">
        <GameStatus 
          gameState={gameState}
          currentUserId={currentUserId}
        />
      </div>

      {/* Right Player */}
      <div className="absolute top-1/2 right-8 transform -translate-y-1/2 z-20">
        <PlayerArea
          player={playerArrangement.right}
          position="right"
          isCurrentPlayer={false}
          isCurrentTurn={gameState.currentTurn === playerArrangement.right.position}
          gamePhase={gameState.phase}
        />
      </div>

      {/* Left Player */}
      <div className="absolute top-1/2 left-8 transform -translate-y-1/2 z-20">
        <PlayerArea
          player={playerArrangement.left}
          position="left"
          isCurrentPlayer={false}
          isCurrentTurn={gameState.currentTurn === playerArrangement.left.position}
          gamePhase={gameState.phase}
        />
      </div>

      {/* Central Play Area */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/10">
          <PlayArea
            gameState={gameState}
            currentPlayer={currentPlayer}
            selectedCards={selectedCards}
            onCardPlay={onCardPlay}
            onPass={onPass}
            onBid={onBid}
          />
        </div>
      </div>

      {/* Current Player Area (Bottom) */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
        <div className="bg-gradient-to-t from-black/40 to-transparent pt-8 pb-4 px-8 rounded-t-2xl">
          <PlayerArea
            player={playerArrangement.bottom}
            position="bottom"
            isCurrentPlayer={true}
            isCurrentTurn={gameState.currentTurn === playerArrangement.bottom.position}
            gamePhase={gameState.phase}
            onCardSelect={onCardSelect}
            selectedCards={selectedCards}
            showCards={true}
          />
        </div>
      </div>

      {/* Turn Indicator */}
      {gameState.currentTurn !== undefined && gameState.phase !== GamePhase.FINISHED && (
        <div className="absolute top-8 right-8 z-30">
          <div className="bg-yellow-500 text-black px-4 py-2 rounded-xl text-sm font-bold animate-pulse shadow-lg">
            {gameState.players[gameState.currentTurn]?.username} 的回合
          </div>
        </div>
      )}

      {/* Game Phase Indicator */}
      <div className="absolute top-8 left-8 z-30">
        <div className={`px-4 py-2 rounded-xl text-sm font-bold shadow-lg ${
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
        <div className="absolute top-20 left-8 z-30">
          <div className="bg-yellow-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2">
            <span className="text-lg">👑</span>
            <span>地主: {gameState.players.find(p => p.userId === gameState.landlord)?.username}</span>
          </div>
        </div>
      )}

      {/* Game Over Panel */}
      {gameState.phase === GamePhase.FINISHED && gameState.winners && (
        <GameOverPanel
          winners={gameState.winners}
          currentUserId={currentUserId}
          onLeaveGame={onLeaveGame}
        />
      )}
    </div>
  );
};

export default GameBoard; 