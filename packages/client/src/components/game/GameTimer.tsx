'use client';

import React, { useState, useEffect } from 'react';
import { TimerState } from '../../types/game';

interface GameTimerProps {
  timer: TimerState;
  onTimeout?: () => void;
}

const GameTimer: React.FC<GameTimerProps> = ({ timer, onTimeout }) => {
  const [timeLeft, setTimeLeft] = useState(timer.timeLeft);

  useEffect(() => {
    setTimeLeft(timer.timeLeft);
  }, [timer.timeLeft]);

  useEffect(() => {
    if (!timer.isActive) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        
        if (newTime <= 0) {
          onTimeout?.();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.isActive, onTimeout]);

  if (!timer.isActive) {
    return null;
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isWarning = timeLeft <= timer.warningThreshold;

  const getTimerColor = () => {
    if (timeLeft <= 10) return 'text-red-500 bg-red-100';
    if (isWarning) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getProgressWidth = () => {
    // Assuming initial time was 30 seconds for calculation
    const initialTime = 30;
    return Math.max(0, (timeLeft / initialTime) * 100);
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      {/* Timer display */}
      <div className={`px-4 py-2 rounded-lg font-mono text-lg font-bold ${getTimerColor()}`}>
        {minutes}:{seconds.toString().padStart(2, '0')}
      </div>

      {/* Progress bar */}
      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            isWarning ? 'bg-red-500' : 'bg-green-500'
          }`}
          style={{ width: `${getProgressWidth()}%` }}
        />
      </div>

      {/* Warning text */}
      {isWarning && (
        <div className="text-red-500 text-xs font-semibold animate-pulse">
          时间不多了！
        </div>
      )}
    </div>
  );
};

export default GameTimer; 