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
    console.log(`🎮 Redux bidForLandlord - Action called with roomId: ${roomId}, amount: ${amount}`);
    
    try {
      if (typeof window !== 'undefined') {
        const { socketService } = await import('../../services/socketServiceInstance');
        
        if (!socketService.isConnected) {
          console.error('🎮 Redux bidForLandlord - Socket not connected!');
          throw new Error('Socket not connected');
        }

        console.log(`🎮 Redux bidForLandlord - Socket connected, emitting 'bid' event...`);
        console.log(`🎮 Redux bidForLandlord - Event data:`, { roomId, amount });
        
        return new Promise((resolve, reject) => {
          // Emit the bid event
          socketService.emit('bid', { roomId, amount });
          console.log(`🎮 Redux bidForLandlord - 'bid' event emitted successfully`);

          const handleBidProcessed = (data: any) => {
            console.log(`🎮 Redux bidForLandlord - Received 'bidProcessed' event:`, data);
            socketService.off('bidProcessed', handleBidProcessed);
            socketService.off('error', handleError);
            resolve(data);
          };

          const handleError = (error: any) => {
            console.error(`🎮 Redux bidForLandlord - Received error:`, error);
            socketService.off('bidProcessed', handleBidProcessed);
            socketService.off('error', handleError);
            reject(error);
          };

          socketService.on('bidProcessed', handleBidProcessed);
          socketService.on('error', handleError);

          // Timeout after 10 seconds
          setTimeout(() => {
            socketService.off('bidProcessed', handleBidProcessed);
            socketService.off('error', handleError);
            console.error('🎮 Redux bidForLandlord - Bid timeout after 10 seconds');
            reject(new Error('Bid timeout'));
          }, 10000);
        });
      } else {
        throw new Error('Not in browser environment');
      }
    } catch (error) {
      console.error('🎮 Redux bidForLandlord - Error in action:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to bid');
    }
  }
);

export const playCards = createAsyncThunk(
  'game/playCards',
  async ({ roomId, cardIds }: { roomId: string; cardIds: string[] }, { rejectWithValue }) => {
    console.log(`🎮 Redux playCards - Action called with roomId: ${roomId}, cardIds:`, cardIds);
    
    try {
      if (typeof window !== 'undefined') {
        const { socketService } = await import('../../services/socketServiceInstance');
        
        if (!socketService.isConnected) {
          console.error('🎮 Redux playCards - Socket not connected!');
          throw new Error('Socket not connected');
        }

        console.log(`🎮 Redux playCards - Socket connected, emitting 'playCards' event...`);
        console.log(`🎮 Redux playCards - Event data:`, { roomId, cardIds });
        
        return new Promise((resolve, reject) => {
          // Emit the play cards event
          socketService.emit('playCards', { roomId, cardIds });
          console.log(`🎮 Redux playCards - 'playCards' event emitted successfully`);

          const handleResult = (data: any) => {
            console.log(`🎮 Redux playCards - Received 'cardsPlayResult' event:`, data);
            socketService.off('cardsPlayResult', handleResult);
            socketService.off('error', handleError);
            
            if (data.success) {
              resolve(data);
            } else {
              reject(new Error(data.message || 'Failed to play cards'));
            }
          };
          
          const handleError = (error: any) => {
            console.error(`🎮 Redux playCards - Received error:`, error);
            socketService.off('cardsPlayResult', handleResult);
            socketService.off('error', handleError);
            reject(error);
          };
          
          socketService.on('cardsPlayResult', handleResult);
          socketService.on('error', handleError);
          
          // Timeout after 10 seconds
          setTimeout(() => {
            socketService.off('cardsPlayResult', handleResult);
            socketService.off('error', handleError);
            console.error('🎮 Redux playCards - Play cards timeout after 10 seconds');
            reject(new Error('Play cards timeout'));
          }, 10000);
        });
      } else {
        throw new Error('Not in browser environment');
      }
    } catch (error) {
      console.error('🎮 Redux playCards - Error in action:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to play cards');
    }
  }
);

export const passTurn = createAsyncThunk(
  'game/passTurn',
  async ({ roomId }: { roomId: string }, { rejectWithValue }) => {
    console.log(`🎮 Redux passTurn - Action called with roomId: ${roomId}`);
    
    try {
      if (typeof window !== 'undefined') {
        const { socketService } = await import('../../services/socketServiceInstance');
        
        if (!socketService.isConnected) {
          console.error('🎮 Redux passTurn - Socket not connected!');
          throw new Error('Socket not connected');
        }

        console.log(`🎮 Redux passTurn - Socket connected, emitting 'pass' event...`);
        console.log(`🎮 Redux passTurn - Event data:`, { roomId });
        
        return new Promise((resolve, reject) => {
          // Emit the pass event
          socketService.emit('pass', { roomId });
          console.log(`🎮 Redux passTurn - 'pass' event emitted successfully`);

          const handleResult = (data: any) => {
            console.log(`🎮 Redux passTurn - Received 'passResult' event:`, data);
            socketService.off('passResult', handleResult);
            socketService.off('error', handleError);
            
            if (data.success) {
              resolve(data);
            } else {
              reject(new Error(data.message || 'Failed to pass turn'));
            }
          };
          
          const handleError = (error: any) => {
            console.error(`🎮 Redux passTurn - Received error:`, error);
            socketService.off('passResult', handleResult);
            socketService.off('error', handleError);
            reject(error);
          };
          
          socketService.on('passResult', handleResult);
          socketService.on('error', handleError);
          
          // Timeout after 10 seconds
          setTimeout(() => {
            socketService.off('passResult', handleResult);
            socketService.off('error', handleError);
            console.error('🎮 Redux passTurn - Pass turn timeout after 10 seconds');
            reject(new Error('Pass turn timeout'));
          }, 10000);
        });
      } else {
        throw new Error('Not in browser environment');
      }
    } catch (error) {
      console.error('🎮 Redux passTurn - Error in action:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to pass turn');
    }
  }
);

// Game state interface
interface GameSliceState {
  currentGame: GameState | null;
  isGameActive: boolean;
  isStartingGame: boolean;
  isBidding: boolean;
  isPlayingCards: boolean;
  isPassing: boolean;
  selectedCards: string[]; // Changed to string[] for card IDs
  gameError: string | null;
  lastAction: string | null;
  gameHistory: string[];
}

const initialState: GameSliceState = {
  currentGame: null,
  isGameActive: false,
  isStartingGame: false,
  isBidding: false,
  isPlayingCards: false,
  isPassing: false,
  selectedCards: [], // Empty array of card IDs
  gameError: null,
  lastAction: null,
  gameHistory: [],
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
    
    gameStarted: (state, action: PayloadAction<any>) => {
      console.log('🎮 Redux gameStarted - Raw action payload:', action.payload);
      console.log('🎮 Redux gameStarted - Action payload keys:', Object.keys(action.payload || {}));
      console.log('🎮 Redux gameStarted - Action payload.game:', action.payload?.game);
      console.log('🎮 Redux gameStarted - Action payload.game keys:', action.payload?.game ? Object.keys(action.payload.game) : 'no game');
      
      const gameData = action.payload.game;
      console.log('🎮 Redux gameStarted - Extracted gameData:', gameData);
      
      state.currentGame = gameData;
      state.isGameActive = true;
      state.gameError = null;
      state.selectedCards = [];
      state.gameHistory = gameData?.gameHistory || [];
      state.lastAction = 'Game started';
      console.log('🎮 Redux gameStarted - Final state.currentGame:', state.currentGame);
      console.log('🎮 Redux gameStarted - Final state.isGameActive:', state.isGameActive);
    },
    
    clearGameState: (state) => {
      state.currentGame = null;
      state.isGameActive = false;
      state.selectedCards = [];
      state.gameError = null;
      state.lastAction = null;
      state.gameHistory = [];
      console.log('🎮 Redux: Game state cleared');
    },
    
    // Card selection for UI
    toggleCardSelection: (state, action: PayloadAction<{ cardId: string }>) => {
      const { cardId } = action.payload;
      const index = state.selectedCards.indexOf(cardId);
      
      if (index > -1) {
        // Card is selected, remove it
        state.selectedCards.splice(index, 1);
        console.log(`🎮 Redux: Card ${cardId} deselected. Selected cards:`, state.selectedCards);
      } else {
        // Card is not selected, add it
        state.selectedCards.push(cardId);
        console.log(`🎮 Redux: Card ${cardId} selected. Selected cards:`, state.selectedCards);
      }
      
      state.lastAction = `Card ${cardId} ${index > -1 ? 'deselected' : 'selected'}`;
    },
    
    clearSelectedCards: (state) => {
      state.selectedCards = [];
      console.log('🎮 Redux: Selected cards cleared');
    },
    
    // Game events from Socket.IO
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
    },
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
      state.selectedCards = []; // Clear selected cards on successful play
      state.lastAction = 'Cards played successfully';
    });
    builder.addCase(playCards.rejected, (state, action) => {
      state.isPlayingCards = false;
      state.gameError = action.payload as string;
    });
    
    // Pass turn
    builder.addCase(passTurn.pending, (state) => {
      state.isPassing = true;
      state.gameError = null;
    });
    builder.addCase(passTurn.fulfilled, (state) => {
      state.isPassing = false;
      state.selectedCards = []; // Clear selected cards on successful pass
      state.lastAction = 'Turn passed successfully';
    });
    builder.addCase(passTurn.rejected, (state, action) => {
      state.isPassing = false;
      state.gameError = action.payload as string;
    });
  }
});

export const {
  updateGameState,
  clearGameState,
  toggleCardSelection,
  clearSelectedCards,
  gameStarted,
  biddingComplete,
  cardsPlayed,
  turnPassed,
  gameFinished,
  setGameError,
} = gameSlice.actions;

export default gameSlice.reducer; 