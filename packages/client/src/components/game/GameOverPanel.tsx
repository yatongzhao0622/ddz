import React from 'react';
import { Player } from '../../types/game';

interface GameOverPanelProps {
  winners: Player[];
  currentUserId: string;
  onLeaveGame?: () => void;
}

const GameOverPanel: React.FC<GameOverPanelProps> = ({ winners, currentUserId, onLeaveGame }) => {
  const isWinner = winners.some(winner => winner.userId === currentUserId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl transform animate-fadeIn">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">
            {isWinner ? '🎉 恭喜获胜！' : '游戏结束'}
          </h2>
          
          <div className="mb-6">
            <p className="text-xl mb-2">
              {winners.length > 1 ? '获胜者：' : '获胜者：'}
            </p>
            <div className="space-y-2">
              {winners.map((winner, index) => (
                <p 
                  key={winner.userId}
                  className={`text-lg ${winner.userId === currentUserId ? 'text-green-600 font-bold' : 'text-gray-700'}`}
                >
                  {winner.username}
                  {winner.role === 'landlord' ? ' (地主)' : ' (农民)'}
                </p>
              ))}
            </div>
          </div>

          {onLeaveGame && (
            <button
              onClick={onLeaveGame}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-colors w-full"
            >
              离开游戏
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameOverPanel; 