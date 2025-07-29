'use client';

import React, { useState } from 'react';
import GameBoard from '../../../components/game/GameBoard';
import Card from '../../../components/game/Card';
import { GameState, GamePlayer, GamePhase, PlayerRole, CardSuit, CardRank } from '../../../types/game';

// Mock data for demo
const createMockGameState = (phase: GamePhase = GamePhase.PLAYING): GameState => {
  const mockPlayers: GamePlayer[] = [
    {
      userId: 'user1',
      username: '张三',
      position: 0,
      role: PlayerRole.LANDLORD,
      cards: [
        { id: '1', suit: CardSuit.HEARTS, rank: CardRank.ACE, value: 14, isSelected: false },
        { id: '2', suit: CardSuit.SPADES, rank: CardRank.KING, value: 13, isSelected: true },
        { id: '3', suit: CardSuit.DIAMONDS, rank: CardRank.QUEEN, value: 12, isSelected: false },
        { id: '4', rank: CardRank.RED_JOKER, value: 17, isSelected: false },
        { id: '5', suit: CardSuit.CLUBS, rank: CardRank.TWO, value: 15, isSelected: false }
      ],
      cardCount: 15,
      isReady: true,
      isConnected: true,
      isTurn: phase === GamePhase.PLAYING,
      bidAmount: 3
    },
    {
      userId: 'user2',
      username: '李四',
      position: 1,
      role: PlayerRole.FARMER,
      cards: [],
      cardCount: 17,
      isReady: true,
      isConnected: true,
      isTurn: false,
      bidAmount: 0
    },
    {
      userId: 'user3',
      username: '王五',
      position: 2,
      role: PlayerRole.FARMER,
      cards: [],
      cardCount: 16,
      isReady: true,
      isConnected: false,
      isTurn: false,
      bidAmount: 1
    }
  ];

  return {
    id: 'demo-game-123',
    phase,
    players: mockPlayers,
    currentTurn: 0,
    landlord: 'user1',
    landlordCards: [
      { id: 'l1', suit: CardSuit.HEARTS, rank: CardRank.THREE, value: 3 },
      { id: 'l2', suit: CardSuit.SPADES, rank: CardRank.FOUR, value: 4 },
      { id: 'l3', rank: CardRank.BLACK_JOKER, value: 16 }
    ],
    playedCards: [],
    lastPlay: phase === GamePhase.PLAYING ? {
      playerId: 'user2',
      cards: [
        { id: 'p1', suit: CardSuit.DIAMONDS, rank: CardRank.SEVEN, value: 7 },
        { id: 'p2', suit: CardSuit.CLUBS, rank: CardRank.SEVEN, value: 7 }
      ],
      cardType: 'pair',
      timestamp: new Date()
    } : undefined,
    gameHistory: ['张三 叫了 3分', '李四 出了 对7', '轮到 张三'],
    startedAt: new Date(),
    turnTimeLimit: 30,
    turnStartedAt: new Date()
  };
};

const GameLayoutDemo: React.FC = () => {
  const [gamePhase, setGamePhase] = useState<GamePhase>(GamePhase.PLAYING);
  const [selectedCards, setSelectedCards] = useState<string[]>(['2']);
  
  const gameState = createMockGameState(gamePhase);
  const currentUserId = 'user1';

  const handleCardSelect = (cardId: string) => {
    setSelectedCards(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
    
    // Update the mock card selection state
    const player = gameState.players.find(p => p.userId === currentUserId);
    if (player) {
      player.cards.forEach(card => {
        card.isSelected = selectedCards.includes(card.id) || cardId === card.id;
      });
    }
  };

  const handleCardPlay = () => {
    alert('出牌功能演示 - 选中的牌: ' + selectedCards.join(', '));
  };

  const handlePass = () => {
    alert('不要 - 跳过本回合');
  };

  const handleBid = (amount: number) => {
    alert(`叫地主 ${amount === 0 ? '不叫' : amount + '分'}`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-lg p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              🎮 斗地主游戏界面演示
            </h1>
            <p className="text-gray-600">Phase 7: Game Layout Components Demo</p>
          </div>
          
          {/* Phase Controls */}
          <div className="flex space-x-2">
            <button
              onClick={() => setGamePhase(GamePhase.WAITING)}
              className={`px-3 py-1 rounded text-sm ${
                gamePhase === GamePhase.WAITING ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              等待
            </button>
            <button
              onClick={() => setGamePhase(GamePhase.BIDDING)}
              className={`px-3 py-1 rounded text-sm ${
                gamePhase === GamePhase.BIDDING ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              叫地主
            </button>
            <button
              onClick={() => setGamePhase(GamePhase.PLAYING)}
              className={`px-3 py-1 rounded text-sm ${
                gamePhase === GamePhase.PLAYING ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              游戏中
            </button>
            <button
              onClick={() => setGamePhase(GamePhase.FINISHED)}
              className={`px-3 py-1 rounded text-sm ${
                gamePhase === GamePhase.FINISHED ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              结束
            </button>
          </div>
        </div>
      </div>

      {/* Game Board Demo */}
      <GameBoard
        gameState={gameState}
        currentUserId={currentUserId}
        onCardSelect={handleCardSelect}
        onCardPlay={handleCardPlay}
        onPass={handlePass}
        onBid={handleBid}
      />

      {/* Demo Controls */}
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg p-4 shadow-lg">
        <h3 className="font-semibold mb-2">演示说明:</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• 点击上方按钮切换游戏阶段</li>
          <li>• 点击手牌选择/取消选择</li>
          <li>• 测试出牌和叫地主功能</li>
          <li>• 观察不同玩家状态显示</li>
        </ul>
        
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-gray-500">
            当前选中牌: {selectedCards.length} 张
          </p>
        </div>
      </div>

      {/* Individual Card Demo */}
      <div className="absolute bottom-4 right-4 bg-white bg-opacity-90 rounded-lg p-4 shadow-lg">
        <h3 className="font-semibold mb-2">卡牌样式演示:</h3>
        <div className="flex space-x-2">
          <Card
            card={{ id: 'demo1', suit: CardSuit.HEARTS, rank: CardRank.ACE, value: 14 }}
            size="small"
          />
          <Card
            card={{ id: 'demo2', rank: CardRank.RED_JOKER, value: 17 }}
            size="small"
          />
          <Card
            card={{ id: 'demo3', suit: CardSuit.SPADES, rank: CardRank.KING, value: 13 }}
            size="small"
            isSelected={true}
          />
        </div>
      </div>

      {/* Back Button */}
      <div className="absolute top-20 right-4">
        <button
          onClick={() => window.history.back()}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          ← 返回主页
        </button>
      </div>
    </div>
  );
};

export default GameLayoutDemo; 