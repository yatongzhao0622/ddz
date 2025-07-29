// Dou Dizhu Game Types and Interfaces

export enum CardSuit {
  SPADES = 'spades',
  HEARTS = 'hearts',
  DIAMONDS = 'diamonds',
  CLUBS = 'clubs'
}

export enum CardRank {
  THREE = '3',
  FOUR = '4',
  FIVE = '5',
  SIX = '6',
  SEVEN = '7',
  EIGHT = '8',
  NINE = '9',
  TEN = '10',
  JACK = 'J',
  QUEEN = 'Q',
  KING = 'K',
  ACE = 'A',
  TWO = '2',
  BLACK_JOKER = 'black_joker',
  RED_JOKER = 'red_joker'
}

export interface Card {
  id: string;
  suit?: CardSuit; // undefined for jokers
  rank: CardRank;
  value: number; // Dou Dizhu value (3=3, 4=4, ..., A=14, 2=15, BlackJoker=16, RedJoker=17)
  isSelected?: boolean;
}

export enum GamePhase {
  WAITING = 'waiting',
  BIDDING = 'bidding', 
  PLAYING = 'playing',
  FINISHED = 'finished'
}

export enum PlayerRole {
  FARMER = 'farmer',
  LANDLORD = 'landlord'
}

export interface GamePlayer {
  userId: string;
  username: string;
  position: number; // 0, 1, 2 (position around table)
  role?: PlayerRole;
  cards: Card[];
  cardCount: number;
  isReady: boolean;
  isConnected: boolean;
  isTurn: boolean;
  bidAmount?: number;
}

export interface PlayedCards {
  playerId: string;
  cards: Card[];
  cardType: string; // 'single', 'pair', 'triple', 'straight', etc.
  timestamp: Date;
}

export interface GameState {
  id: string;
  phase: GamePhase;
  players: GamePlayer[];
  currentTurn: number; // player position
  landlord?: string; // userId
  landlordCards: Card[]; // 3 additional cards for landlord
  playedCards: PlayedCards[];
  lastPlay?: PlayedCards;
  gameHistory: string[];
  startedAt?: Date;
  turnTimeLimit: number; // seconds
  turnStartedAt?: Date;
}

export interface BidAction {
  playerId: string;
  amount: number; // 0 = pass, 1-3 = bid amount
}

export interface PlayAction {
  playerId: string;
  cards: Card[];
  pass: boolean;
}

export interface GameAction {
  type: 'bid' | 'play' | 'pass';
  playerId: string;
  data: BidAction | PlayAction;
  timestamp: Date;
}

// UI State interfaces
export interface GameUIState {
  selectedCards: Card[];
  availableActions: string[];
  showCardTypes: boolean;
  animationsEnabled: boolean;
  soundEnabled: boolean;
}

export interface TimerState {
  timeLeft: number;
  isActive: boolean;
  warningThreshold: number; // seconds before warning
} 