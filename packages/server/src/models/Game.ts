import mongoose, { Document, Schema } from 'mongoose';

// Enums for game logic
export enum CardSuit {
  SPADES = 'spades',
  HEARTS = 'hearts', 
  DIAMONDS = 'diamonds',
  CLUBS = 'clubs'
}

export enum CardRank {
  THREE = '3', FOUR = '4', FIVE = '5', SIX = '6', SEVEN = '7', EIGHT = '8',
  NINE = '9', TEN = '10', JACK = 'J', QUEEN = 'Q', KING = 'K', ACE = 'A',
  TWO = '2', BLACK_JOKER = 'black_joker', RED_JOKER = 'red_joker'
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

// Interfaces
export interface Card {
  id: string;
  suit?: CardSuit;
  rank: CardRank;
  value: number; // Dou Dizhu value (3=3, 4=4, ..., A=14, 2=15, BlackJoker=16, RedJoker=17)
}

export interface GamePlayer {
  userId: mongoose.Types.ObjectId;
  username: string;
  position: number; // 0, 1, 2
  role?: PlayerRole;
  cards: Card[];
  cardCount: number;
  isReady: boolean;
  isConnected: boolean;
  bidAmount?: number;
  score: number;
}

export interface PlayedCards {
  playerId: mongoose.Types.ObjectId;
  cards: Card[];
  cardType: string;
  timestamp: Date;
}

// Game Document Interface
export interface IGame extends Document {
  roomId: mongoose.Types.ObjectId;
  gameId: string;
  phase: GamePhase;
  players: GamePlayer[];
  currentTurn: number;
  landlord?: mongoose.Types.ObjectId;
  landlordCards: Card[];
  playedCards: PlayedCards[];
  lastPlay?: PlayedCards;
  gameHistory: string[];
  startedAt?: Date;
  finishedAt?: Date;
  turnTimeLimit: number;
  turnStartedAt?: Date;
  winner?: mongoose.Types.ObjectId;
  winners: mongoose.Types.ObjectId[]; // Add winners array
  scores: { [key: string]: number };
  
  // Game Logic Methods
  startGame(): Promise<void>;
  dealCards(): void;
  processBid(userId: string, amount: number): Promise<boolean>;
  playCards(userId: string, cards: Card[]): Promise<boolean>;
  passTurn(userId: string): Promise<boolean>;
  checkGameEnd(): boolean;
  calculateScores(): void;
  toSafeObject(): any;
}

// Game Schema
const GameSchema = new Schema<IGame>({
  roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
  gameId: { type: String, required: true, unique: true },
  phase: { type: String, enum: Object.values(GamePhase), default: GamePhase.WAITING },
  players: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    position: { type: Number, required: true },
    role: { type: String, enum: Object.values(PlayerRole) },
    cards: [{
      id: String,
      suit: { type: String, enum: Object.values(CardSuit) },
      rank: { type: String, enum: Object.values(CardRank), required: true },
      value: { type: Number, required: true }
    }],
    cardCount: { type: Number, default: 0 },
    isReady: { type: Boolean, default: false },
    isConnected: { type: Boolean, default: true },
    bidAmount: { type: Number, min: 0, max: 3 },
    score: { type: Number, default: 0 }
  }],
  currentTurn: { type: Number, default: 0 },
  landlord: { type: Schema.Types.ObjectId, ref: 'User' },
  landlordCards: [{
    id: String,
    suit: { type: String, enum: Object.values(CardSuit) },
    rank: { type: String, enum: Object.values(CardRank), required: true },
    value: { type: Number, required: true }
  }],
  playedCards: [{
    playerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cards: [{
      id: String,
      suit: { type: String, enum: Object.values(CardSuit) },
      rank: { type: String, enum: Object.values(CardRank), required: true },
      value: { type: Number, required: true }
    }],
    cardType: String,
    timestamp: { type: Date, default: Date.now }
  }],
  lastPlay: {
    playerId: { type: Schema.Types.ObjectId, ref: 'User' },
    cards: [{
      id: String,
      suit: { type: String, enum: Object.values(CardSuit) },
      rank: { type: String, enum: Object.values(CardRank), required: true },
      value: { type: Number, required: true }
    }],
    cardType: String,
    timestamp: { type: Date, default: Date.now }
  },
  gameHistory: [{ type: String }],
  startedAt: { type: Date },
  finishedAt: { type: Date },
  turnTimeLimit: { type: Number, default: 30 }, // seconds
  turnStartedAt: { type: Date },
  winner: { type: Schema.Types.ObjectId, ref: 'User' },
  winners: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Add winners array
  scores: { type: Map, of: Number, default: {} }
}, {
  timestamps: true
});

// Game Logic Methods Implementation
GameSchema.methods.startGame = async function(): Promise<void> {
  if (this.players.length !== 3) {
    throw new Error('Need exactly 3 players to start game');
  }
  
  this.phase = GamePhase.BIDDING;
  this.startedAt = new Date();
  this.turnStartedAt = new Date();
  this.dealCards();
  this.gameHistory.push('游戏开始！');
  
  await this.save();
};

GameSchema.methods.dealCards = function(): void {
  const deck = createStandardDeck();
  const shuffledDeck = shuffleDeck(deck);
  
  // Distribute 17 cards to each player
  this.players.forEach((player: GamePlayer, index: number) => {
    const startIndex = index * 17;
    player.cards = shuffledDeck.slice(startIndex, startIndex + 17);
    player.cardCount = 17;
  });
  
  // Last 3 cards are landlord cards
  this.landlordCards = shuffledDeck.slice(51, 54);
};

GameSchema.methods.processBid = async function(userId: string, amount: number): Promise<boolean> {
  if (this.phase !== GamePhase.BIDDING) {
    return false;
  }
  
  const currentPlayer = this.players[this.currentTurn];
  if (currentPlayer.userId.toString() !== userId) {
    return false;
  }
  
  currentPlayer.bidAmount = amount;
  this.gameHistory.push(`${currentPlayer.username} ${amount === 0 ? '不叫' : '叫' + amount + '分'}`);
  
  // Check if bidding is complete
  const allBid = this.players.every((p: GamePlayer) => p.bidAmount !== undefined);
  if (allBid) {
    // Determine landlord
    const highestBidder = this.players.reduce((prev: GamePlayer, current: GamePlayer) => 
      (current.bidAmount || 0) > (prev.bidAmount || 0) ? current : prev
    );
    
    if (highestBidder.bidAmount && highestBidder.bidAmount > 0) {
      this.landlord = highestBidder.userId;
      highestBidder.role = PlayerRole.LANDLORD;
      highestBidder.cards.push(...this.landlordCards);
      highestBidder.cardCount = 20;
      
      // Other players are farmers
      this.players.forEach((p: GamePlayer) => {
        if (p.userId.toString() !== this.landlord!.toString()) {
          p.role = PlayerRole.FARMER;
        }
      });
      
      this.phase = GamePhase.PLAYING;
      this.currentTurn = highestBidder.position;
      this.gameHistory.push(`${highestBidder.username} 成为地主！`);
    } else {
      // No one bid, restart bidding or end game
      this.gameHistory.push('无人叫地主，重新开始！');
      this.players.forEach((p: GamePlayer) => p.bidAmount = undefined);
      this.currentTurn = 0;
    }
  } else {
    // Next player's turn
    this.currentTurn = (this.currentTurn + 1) % 3;
  }
  
  this.turnStartedAt = new Date();
  await this.save();
  return true;
};

GameSchema.methods.playCards = async function(userId: string, cards: Card[]): Promise<boolean> {
  if (this.phase !== GamePhase.PLAYING) {
    return false;
  }
  
  const currentPlayer = this.players[this.currentTurn];
  if (currentPlayer.userId.toString() !== userId) {
    return false;
  }
  
  // Validate card play (simplified validation for now)
  const cardType = determineCardType(cards);
  if (!cardType) {
    return false;
  }
  
  // Remove cards from player's hand
  currentPlayer.cards = currentPlayer.cards.filter(
    (card: Card) => !cards.find((playedCard: Card) => playedCard.id === card.id)
  );
  currentPlayer.cardCount = currentPlayer.cards.length;
  
  // Record the play
  const play: PlayedCards = {
    playerId: currentPlayer.userId,
    cards,
    cardType,
    timestamp: new Date()
  };
  
  this.playedCards.push(play);
  this.lastPlay = play;
  this.gameHistory.push(`${currentPlayer.username} 出了 ${cardType}`);
  
  // Check for game end
  if (currentPlayer.cardCount === 0) {
    this.phase = GamePhase.FINISHED;
    this.winner = currentPlayer.userId;
    this.finishedAt = new Date();
    
    // Set winners based on who won
    const landlord = this.players.find(p => p.role === PlayerRole.LANDLORD);
    const farmers = this.players.filter(p => p.role === PlayerRole.FARMER);
    
    if (landlord && currentPlayer.userId.toString() === landlord.userId.toString()) {
      // Landlord won
      this.winners = [landlord.userId];
    } else {
      // Farmers won
      this.winners = farmers.map(farmer => farmer.userId);
    }
    
    this.calculateScores();
    this.gameHistory.push(`${currentPlayer.username} 获胜！`);
  } else {
    // Next player's turn
    this.currentTurn = (this.currentTurn + 1) % 3;
  }
  
  this.turnStartedAt = new Date();
  await this.save();
  return true;
};

GameSchema.methods.passTurn = async function(userId: string): Promise<boolean> {
  if (this.phase !== GamePhase.PLAYING) {
    return false;
  }
  
  const currentPlayer = this.players[this.currentTurn];
  if (currentPlayer.userId.toString() !== userId) {
    return false;
  }
  
  this.gameHistory.push(`${currentPlayer.username} 不要`);
  this.currentTurn = (this.currentTurn + 1) % 3;
  this.turnStartedAt = new Date();
  
  await this.save();
  return true;
};

GameSchema.methods.checkGameEnd = function(): boolean {
  return this.players.some(player => player.cardCount === 0);
};

GameSchema.methods.calculateScores = function(): void {
  if (!this.winner) return;
  
  const landlord = this.players.find(p => p.role === PlayerRole.LANDLORD);
  const farmers = this.players.filter(p => p.role === PlayerRole.FARMER);
  
  if (!landlord) return;
  
  const landlordWins = this.winner.toString() === landlord.userId.toString();
  const baseScore = 100;
  
  if (landlordWins) {
    landlord.score += baseScore * 2; // Landlord gets double
    farmers.forEach(farmer => farmer.score -= baseScore);
    this.winners = [landlord.userId]; // Set landlord as winner
  } else {
    landlord.score -= baseScore * 2; // Landlord loses double
    farmers.forEach(farmer => farmer.score += baseScore);
    this.winners = farmers.map(farmer => farmer.userId); // Set farmers as winners
  }
  
  // Update scores map
  this.players.forEach((player: GamePlayer) => {
    this.scores.set(player.userId.toString(), player.score);
  });
};

GameSchema.methods.toSafeObject = function() {
  return {
    id: this.gameId,
    roomId: this.roomId,
    phase: this.phase,
    players: this.players.map(player => ({
      userId: player.userId.toString(),
      username: player.username,
      position: player.position,
      role: player.role,
      cardCount: player.cardCount,
      cards: player.cards, // Note: In real game, only show own cards to client
      isReady: player.isReady,
      isConnected: player.isConnected,
      bidAmount: player.bidAmount,
      score: player.score
    })),
    currentTurn: this.currentTurn,
    landlord: this.landlord?.toString(),
    landlordCards: this.landlordCards,
    lastPlay: this.lastPlay,
    gameHistory: this.gameHistory,
    startedAt: this.startedAt,
    finishedAt: this.finishedAt,
    turnTimeLimit: this.turnTimeLimit,
    turnStartedAt: this.turnStartedAt,
    winner: this.winner?.toString(),
    winners: this.winners?.map(winner => {
      const player = this.players.find(p => p.userId.toString() === winner.toString());
      return {
        userId: winner.toString(),
        username: player?.username || '',
        role: player?.role || PlayerRole.FARMER,
        isConnected: player?.isConnected || false
      };
    }),
    scores: Object.fromEntries(this.scores || new Map())
  };
};

// Helper functions for game logic
function createStandardDeck(): Card[] {
  const deck: Card[] = [];
  let cardId = 0;
  
  // Standard 52 cards
  for (const suit of Object.values(CardSuit)) {
    for (const rank of Object.values(CardRank)) {
      if (rank === CardRank.BLACK_JOKER || rank === CardRank.RED_JOKER) continue;
      
      deck.push({
        id: `card_${cardId++}`,
        suit,
        rank,
        value: getCardValue(rank)
      });
    }
  }
  
  // Add jokers
  deck.push({
    id: `card_${cardId++}`,
    rank: CardRank.BLACK_JOKER,
    value: 16
  });
  
  deck.push({
    id: `card_${cardId++}`,
    rank: CardRank.RED_JOKER,
    value: 17
  });
  
  return deck;
}

function getCardValue(rank: CardRank): number {
  const values: { [key in CardRank]: number } = {
    [CardRank.THREE]: 3, [CardRank.FOUR]: 4, [CardRank.FIVE]: 5,
    [CardRank.SIX]: 6, [CardRank.SEVEN]: 7, [CardRank.EIGHT]: 8,
    [CardRank.NINE]: 9, [CardRank.TEN]: 10, [CardRank.JACK]: 11,
    [CardRank.QUEEN]: 12, [CardRank.KING]: 13, [CardRank.ACE]: 14,
    [CardRank.TWO]: 15, [CardRank.BLACK_JOKER]: 16, [CardRank.RED_JOKER]: 17
  };
  return values[rank];
}

function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function determineCardType(cards: Card[]): string {
  if (cards.length === 0) return '';
  if (cards.length === 1) return 'single';
  if (cards.length === 2 && cards[0].rank === cards[1].rank) return 'pair';
  if (cards.length === 3 && cards.every(c => c.rank === cards[0].rank)) return 'triple';
  
  // More complex combinations can be added here
  return 'combination';
}

export default mongoose.model<IGame>('Game', GameSchema); 