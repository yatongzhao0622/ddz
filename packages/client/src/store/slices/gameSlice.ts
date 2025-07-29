import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { GameState, GamePhase, Card, PlayedCards } from '../../types/game';

// Game service for API calls (to be created)
import { gameService } from '../../services/gameService';

// Async thunks for game actions
export const startGame = createAsyncThunk(
  'game/startGame',
  async (roomId: string, { rejectWithValue }) => {
    try {
      if (typeof window !== 'undefined') {
        const { socketService } = await import('../../services/socketServiceInstance');
        
        return new Promise((resolve, reject) => {
          socketService.emit('startGame', { roomId });
          
          const handleGameStarted = (data: any) => {
            socketService.off('gameStarted', handleGameStarted);
            socketService.off('error', handleError);
            resolve(data);
          };
          
          const handleError = (error: any) => {
            socketService.off('gameStarted', handleGameStarted);
            socketService.off('error', handleError);
            reject(error);
          };
          
          socketService.on('gameStarted', handleGameStarted);
          socketService.on('error', handleError);
          
          // Timeout after 10 seconds
          setTimeout(() => {
            socketService.off('gameStarted', handleGameStarted);
            socketService.off('error', handleError);
            reject(new Error('Game start timeout'));
          }, 10000);
        });
      } else {
        throw new Error('Not in browser environment');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to start game');
    }
  }
);

export const bidForLandlord = createAsyncThunk(
  'game/bidForLandlord',
  async ({ roomId, amount }: { roomId: string; amount: number }, { rejectWithValue }) => {
    try {
      if (typeof window !== 'undefined') {
        const { socketService } = await import('../../services/socketServiceInstance');
        
        return new Promise((resolve, reject) => {
          socketService.emit('bid', { roomId, amount });
          
          const handleBidProcessed = (data: any) => {
            socketService.off('bidProcessed', handleBidProcessed);
            socketService.off('error', handleError);
            resolve(data);
          };
          
          const handleError = (error: any) => {
            socketService.off('bidProcessed', handleBidProcessed);
            socketService.off('error', handleError);
            reject(error);
          };
          
          socketService.on('bidProcessed', handleBidProcessed);
          socketService.on('error', handleError);
          
          setTimeout(() => {
            socketService.off('bidProcessed', handleBidProcessed);
            socketService.off('error', handleError);
            reject(new Error('Bid timeout'));
          }, 5000);
        });
      } else {
        throw new Error('Not in browser environment');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to bid');
    }
  }
);

export const playCards = createAsyncThunk(
  'game/playCards',
  async ({ roomId, cardIds }: { roomId: string; cardIds: string[] }, { rejectWithValue }) => {
    try {
      if (typeof window !== 'undefined') {
        const { socketService } = await import('../../services/socketServiceInstance');
        
        return new Promise((resolve, reject) => {
          socketService.emit('playCards', { roomId, cardIds });
          
          const handleResult = (data: any) => {
            socketService.off('cardsPlayResult', handleResult);
            socketService.off('error', handleError);
            resolve(data);
          };
          
          const handleError = (error: any) => {
            socketService.off('cardsPlayResult', handleResult);
            socketService.off('error', handleError);
            reject(error);
          };
          
          socketService.on('cardsPlayResult', handleResult);
          socketService.on('error', handleError);
          
          setTimeout(() => {
            socketService.off('cardsPlayResult', handleResult);
            socketService.off('error', handleError);
            reject(new Error('Play cards timeout'));
          }, 5000);
        });
      } else {
        throw new Error('Not in browser environment');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to play cards');
    }
  }
);

export const passTurn = createAsyncThunk(
  'game/passTurn',
  async (roomId: string, { rejectWithValue }) => {
    try {
      if (typeof window !== 'undefined') {
        const { socketService } = await import('../../services/socketServiceInstance');
        
        return new Promise((resolve, reject) => {
          socketService.emit('pass', { roomId });
          
          const handleResult = (data: any) => {
            socketService.off('passResult', handleResult);
            socketService.off('error', handleError);
            resolve(data);
          };
          
          const handleError = (error: any) => {
            socketService.off('passResult', handleResult);
            socketService.off('error', handleError);
            reject(error);
          };
          
          socketService.on('passResult', handleResult);
          socketService.on('error', handleError);
          
          setTimeout(() => {
            socketService.off('passResult', handleResult);
            socketService.off('error', handleError);
            reject(new Error('Pass turn timeout'));
          }, 5000);
        });
      } else {
        throw new Error('Not in browser environment');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to pass turn');
    }
  }
);

// Game state interface
interface GameSliceState {
  currentGame: GameState | null;
  isStartingGame: boolean;
  isBidding: boolean;
  isPlayingCards: boolean;
  isPassingTurn: boolean;
  selectedCards: Card[];
  gameError: string | null;
  lastAction: string | null;
  gameHistory: string[];
}

const initialState: GameSliceState = {
  currentGame: null,
  isStartingGame: false,
  isBidding: false,
  isPlayingCards: false,
  isPassingTurn: false,
  selectedCards: [],
  gameError: null,
  lastAction: null,
  gameHistory: []
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    // Game state updates from Socket.IO
    updateGameState: (state, action: PayloadAction<GameState>) => {
      state.currentGame = action.payload;
      state.gameError = null;
      console.log('🎮 Redux: Game state updated', action.payload.phase);
    },
    
    clearGameState: (state) => {
      state.currentGame = null;
      state.selectedCards = [];
      state.gameError = null;
      state.lastAction = null;
      console.log('🎮 Redux: Game state cleared');
    },
    
    // Card selection for UI
    selectCard: (state, action: PayloadAction<Card>) => {
      const card = action.payload;
      const existingIndex = state.selectedCards.findIndex(c => c.id === card.id);
      
      if (existingIndex >= 0) {
        // Deselect card
        state.selectedCards.splice(existingIndex, 1);
      } else {
        // Select card
        state.selectedCards.push(card);
      }
      
      console.log('🎮 Redux: Cards selected', state.selectedCards.length);
    },
    
    clearSelectedCards: (state) => {
      state.selectedCards = [];
      console.log('🎮 Redux: Selected cards cleared');
    },
    
    // Game events from Socket.IO
    gameStarted: (state, action: PayloadAction<any>) => {
      state.currentGame = action.payload.game;
      state.gameHistory.push('游戏开始！');
      state.lastAction = 'Game started';
      console.log('🎮 Redux: Game started');
    },
    
    biddingComplete: (state, action: PayloadAction<any>) => {
      if (state.currentGame) {
        state.currentGame = action.payload.game;
        state.gameHistory.push(`${action.payload.landlord} 成为地主！`);
        state.lastAction = 'Bidding complete';
      }
      console.log('🎮 Redux: Bidding complete');
    },
    
    cardsPlayed: (state, action: PayloadAction<any>) => {
      if (state.currentGame) {
        state.currentGame = action.payload.game;
        state.gameHistory.push(`${action.payload.player} 出了 ${action.payload.cardType}`);
        state.lastAction = 'Cards played';
        state.selectedCards = []; // Clear selection after playing
      }
      console.log('🎮 Redux: Cards played');
    },
    
    turnPassed: (state, action: PayloadAction<any>) => {
      if (state.currentGame) {
        state.currentGame = action.payload.game;
        state.gameHistory.push(`${action.payload.player} 不要`);
        state.lastAction = 'Turn passed';
      }
      console.log('🎮 Redux: Turn passed');
    },
    
    gameFinished: (state, action: PayloadAction<any>) => {
      if (state.currentGame) {
        state.currentGame = action.payload.game;
        state.gameHistory.push(`${action.payload.winner} 获胜！`);
        state.lastAction = 'Game finished';
        state.selectedCards = [];
      }
      console.log('🎮 Redux: Game finished');
    },
    
    setGameError: (state, action: PayloadAction<string>) => {
      state.gameError = action.payload;
      console.log('🎮 Redux: Game error', action.payload);
    }
  },
  
  extraReducers: (builder) => {
    // Start game
    builder.addCase(startGame.pending, (state) => {
      state.isStartingGame = true;
      state.gameError = null;
    });
    builder.addCase(startGame.fulfilled, (state) => {
      state.isStartingGame = false;
    });
    builder.addCase(startGame.rejected, (state, action) => {
      state.isStartingGame = false;
      state.gameError = action.payload as string;
    });
    
    // Bid for landlord
    builder.addCase(bidForLandlord.pending, (state) => {
      state.isBidding = true;
      state.gameError = null;
    });
    builder.addCase(bidForLandlord.fulfilled, (state) => {
      state.isBidding = false;
    });
    builder.addCase(bidForLandlord.rejected, (state, action) => {
      state.isBidding = false;
      state.gameError = action.payload as string;
    });
    
    // Play cards
    builder.addCase(playCards.pending, (state) => {
      state.isPlayingCards = true;
      state.gameError = null;
    });
    builder.addCase(playCards.fulfilled, (state) => {
      state.isPlayingCards = false;
    });
    builder.addCase(playCards.rejected, (state, action) => {
      state.isPlayingCards = false;
      state.gameError = action.payload as string;
    });
    
    // Pass turn
    builder.addCase(passTurn.pending, (state) => {
      state.isPassingTurn = true;
      state.gameError = null;
    });
    builder.addCase(passTurn.fulfilled, (state) => {
      state.isPassingTurn = false;
    });
    builder.addCase(passTurn.rejected, (state, action) => {
      state.isPassingTurn = false;
      state.gameError = action.payload as string;
    });
  }
});

export const {
  updateGameState,
  clearGameState,
  selectCard,
  clearSelectedCards,
  gameStarted,
  biddingComplete,
  cardsPlayed,
  turnPassed,
  gameFinished,
  setGameError
} = gameSlice.actions;

export default gameSlice.reducer; 