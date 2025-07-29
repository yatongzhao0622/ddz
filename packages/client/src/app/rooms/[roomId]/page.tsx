'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { useSocket } from '../../../hooks/useSocket';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import { Player } from '../../../services/socketService';
import { leaveRoom, toggleReady, startGame, joinRoom } from '../../../store/slices/roomsSlice';
import { bidForLandlord, clearSelectedCards, playCards, passTurn } from '../../../store/slices/gameSlice';
import RoomInterior from '../../../components/rooms/RoomInterior';
import GameBoard from '../../../components/game/GameBoard';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

export default function RoomPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const params = useParams();
  const roomId = params?.roomId as string;
  const { isAuthenticated, isLoading, user } = useAuth();
  const socket = useSocket();
  const roomsState = useSelector((state: RootState) => state.rooms);
  const gameState = useSelector((state: RootState) => state.game);
  const [isClient, setIsClient] = useState(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check if game is active and show game interface
  const isGameActive = gameState.isGameActive && gameState.currentGame;
  const currentRoom = roomsState.currentRoom;

  // Debug logging for game state
  console.log('🎮 Debug - Game state:', {
    isGameActive: gameState.isGameActive,
    hasCurrentGame: !!gameState.currentGame,
    gameStateKeys: Object.keys(gameState),
    roomStatus: currentRoom?.status,
    conditionalCheck: isGameActive && gameState.currentGame,
    fullGameState: gameState
  });

  // Force render GameBoard for testing
  const shouldShowGameBoard = currentRoom?.status === 'playing' || (isGameActive && gameState.currentGame);
  console.log('🎮 Debug - Current room status:', currentRoom?.status);
  console.log('🎮 Debug - IsGameActive:', gameState.isGameActive);
  console.log('🎮 Debug - CurrentGame:', !!gameState.currentGame);
  console.log('🎮 Debug - CurrentGame keys:', gameState.currentGame ? Object.keys(gameState.currentGame) : 'null');
  console.log('🎮 Debug - CurrentGame value:', gameState.currentGame);
  console.log('🎮 Debug - Should show GameBoard:', shouldShowGameBoard);
  console.log('🎮 Debug - Loading condition:', shouldShowGameBoard && !gameState.currentGame);
  console.log('🎮 Debug - Full gameState:', gameState);

  // Redirect if not authenticated
  useEffect(() => {
    if (isClient && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, isClient, router]);

  // Join room when component mounts if not already in room
  useEffect(() => {
    // Don't try to join if we're in the process of leaving
    if (isLeavingRoom) {
      console.log('🏠 Skipping join - currently leaving room');
      return;
    }

    if (socket.isAuthenticated && roomId && user?.id) {
      
      // If not in any room or in a different room, join this room
      if (!currentRoom || currentRoom.id !== roomId) {
        const isUserInRoom = currentRoom?.players.some((player: Player) => player.userId === user.id);
        if (!isUserInRoom) {
          console.log('🏠 Joining room:', roomId);
          (dispatch as any)(joinRoom(roomId));
        }
      }
    }
  }, [socket.isAuthenticated, roomId, user?.id, currentRoom, dispatch, isLeavingRoom]);

  // Redirect to rooms list if user leaves room or room becomes null
  useEffect(() => {
    if (user?.id) {
      // Case 1: No current room (user left or room was cleared)
      if (!currentRoom) {
        console.log('🏠 No current room, redirecting to rooms list');
        router.push('/rooms');
        return;
      }
      
      // Case 2: Current room exists but user is not in it
      const isUserInRoom = currentRoom.players.some(
        (player: Player) => player.userId === user.id
      );
      
      if (!isUserInRoom && !isLeavingRoom) {
        console.log('🏠 User not in room, redirecting to rooms list');
        router.push('/rooms');
      }
    }
  }, [currentRoom, user?.id, router, isLeavingRoom]);

  const handleLeaveRoom = useCallback(() => {
    if (roomId && socket.isAuthenticated) {
      try {
        console.log('🏠 Leaving room via Socket.IO:', roomId);
        setIsLeavingRoom(true); // Set leaving flag to prevent auto-rejoin
        
        // Use Socket.IO directly to bypass Redux typing issues
        socket.leaveRoom(roomId);
        
        // Force immediate redirect with a small delay
        setTimeout(() => {
          router.push('/rooms');
          // Reset leaving flag after redirect (though component will be unmounted)
          setIsLeavingRoom(false);
        }, 100);
      } catch (error) {
        console.error('🏠 Failed to leave room:', error);
        // Force redirect even on error
        router.push('/rooms');
        setIsLeavingRoom(false);
      }
    }
  }, [roomId, socket, router]);

  const handleToggleReady = useCallback(() => {
    if (roomId) {
      dispatch(toggleReady(roomId) as any);
    }
  }, [roomId, dispatch]);

  const handleStartGame = useCallback(() => {
    console.log('🎮 handleStartGame - Button clicked!', { roomId });
    if (roomId) {
      console.log('🎮 handleStartGame - Dispatching startGame action');
      dispatch(startGame(roomId) as any);
    } else {
      console.error('🎮 handleStartGame - No roomId available');
    }
  }, [roomId, dispatch]);

  // Handle bidding
  const handleBid = useCallback(async (amount: number) => {
    console.log(`🎮 handleBid - Called with amount: ${amount}`);
    console.log(`🎮 handleBid - Current room:`, roomsState.currentRoom?.id);
    console.log(`🎮 handleBid - Socket connected:`, socket.isConnected);
    console.log(`🎮 handleBid - gameState.isGameActive:`, gameState.isGameActive);
    console.log(`🎮 handleBid - currentGame phase:`, gameState.currentGame?.phase);
    
    if (!roomsState.currentRoom?.id) {
      console.error('🎮 handleBid - Cannot bid: no room available');
      return;
    }

    try {
      console.log(`🎮 handleBid - Starting bid process: ${amount} in room ${roomsState.currentRoom.id}`);
      
      // Use Redux action for bidding  
      console.log(`🎮 handleBid - About to dispatch bidForLandlord action...`);
      const action = bidForLandlord({
        roomId: roomsState.currentRoom.id,
        amount: amount
      });
      console.log(`🎮 handleBid - Action created:`, action);
      
      console.log(`🎮 handleBid - Dispatching action...`);
      (dispatch as any)(action);
      console.log(`🎮 handleBid - Action dispatched successfully`);
      
      console.log(`🎮 handleBid - Bid submitted: ${amount === 0 ? '不叫' : amount + '分'}`);
    } catch (error) {
      console.error('🎮 handleBid - Error during bidding:', error);
    }
  }, [roomsState.currentRoom?.id, dispatch, socket.isConnected, gameState]);

  // Handle card selection
  const handleCardSelect = useCallback((cardId: string) => {
    console.log(`🎮 handleCardSelect - Card selected: ${cardId}`);
    console.log(`🎮 handleCardSelect - Current game phase:`, gameState.currentGame?.phase);
    console.log(`🎮 handleCardSelect - Is my turn:`, gameState.currentGame?.currentTurn === gameState.currentGame?.players.findIndex(p => p.userId === user?.id));
    
    if (!gameState.currentGame || gameState.currentGame.phase !== 'playing') {
      console.log('🎮 handleCardSelect - Not in playing phase, ignoring selection');
      return;
    }

    const currentPlayerIndex = gameState.currentGame.players.findIndex(p => p.userId === user?.id);
    const isMyTurn = gameState.currentGame.currentTurn === currentPlayerIndex;
    
    if (!isMyTurn) {
      console.log('🎮 handleCardSelect - Not my turn, ignoring selection');
      return;
    }

    // Toggle card selection in Redux state
    const isSelected = gameState.selectedCards.includes(cardId);
    console.log(`🎮 handleCardSelect - Card ${cardId} ${isSelected ? 'deselecting' : 'selecting'}`);
    
    dispatch({
      type: 'game/toggleCardSelection',
      payload: { cardId }
    });
  }, [gameState.currentGame, gameState.selectedCards, user?.id, dispatch]);

  // Handle card play
  const handleCardPlay = useCallback(async () => {
    console.log(`🎮 handleCardPlay - Called`);
    console.log(`🎮 handleCardPlay - Current room:`, roomsState.currentRoom?.id);
    console.log(`🎮 handleCardPlay - Socket connected:`, socket.isConnected);
    console.log(`🎮 handleCardPlay - Selected cards:`, gameState.selectedCards);

    if (!roomsState.currentRoom?.id) {
      console.error('🎮 handleCardPlay - Cannot play cards: no room available');
      return;
    }

    if (gameState.selectedCards.length === 0) {
      console.error('🎮 handleCardPlay - No cards selected');
      return;
    }

    try {
      console.log(`🎮 handleCardPlay - Dispatching playCards action...`);
      
      // Use Redux action for playing cards
      const resultAction = await dispatch(playCards({
        roomId: roomsState.currentRoom.id,
        cardIds: gameState.selectedCards
      }));

      console.log(`🎮 handleCardPlay - Dispatch completed. Result action:`, resultAction);
      console.log(`🎮 handleCardPlay - Action type:`, resultAction.type);

      if (playCards.fulfilled.match(resultAction)) {
        console.log(`✅ Cards played successfully:`, resultAction.payload);
        // Selected cards are cleared automatically in the Redux slice
      } else if (playCards.rejected.match(resultAction)) {
        console.error('🎮 handleCardPlay - Play cards rejected:');
        console.error('🎮 handleCardPlay - Rejection reason:', resultAction.error);
        console.error('🎮 handleCardPlay - Error message:', resultAction.error?.message);
        console.error('🎮 handleCardPlay - Payload:', resultAction.payload);
        
        // Show user-friendly error message
        const errorMessage = resultAction.error?.message || 
                           (typeof resultAction.payload === 'string' ? resultAction.payload : 'Failed to play cards');
        console.error('🎮 handleCardPlay - Final error message:', errorMessage);
      } else {
        console.error('🎮 handleCardPlay - Unknown result type:', resultAction);
      }
      
    } catch (error) {
      console.error('🎮 handleCardPlay - Exception during card play:', error);
    }
  }, [roomsState.currentRoom?.id, gameState.selectedCards, dispatch]);

  // Handle pass turn
  const handlePass = useCallback(async () => {
    console.log(`🎮 handlePass - Called`);
    console.log(`🎮 handlePass - Current room:`, roomsState.currentRoom?.id);
    console.log(`🎮 handlePass - Socket connected:`, socket.isConnected);
    console.log(`🎮 handlePass - Current game:`, gameState.currentGame?.gameId);

    if (!roomsState.currentRoom?.id) {
      console.error('🎮 handlePass - Cannot pass: no room available');
      return;
    }

    if (!gameState.currentGame) {
      console.error('🎮 handlePass - Cannot pass: no game active');
      return;
    }

    try {
      console.log(`🎮 handlePass - Dispatching passTurn action...`);
      
      const resultAction = await dispatch(passTurn({
        roomId: roomsState.currentRoom.id
      }));

      console.log(`🎮 handlePass - Dispatch completed. Result action:`, resultAction);
      console.log(`🎮 handlePass - Action type:`, resultAction.type);

      if (passTurn.fulfilled.match(resultAction)) {
        console.log(`✅ Pass turn successful:`, resultAction.payload);
        // Selected cards are cleared automatically in the Redux slice
      } else if (passTurn.rejected.match(resultAction)) {
        console.error('🎮 handlePass - Pass turn rejected:');
        console.error('🎮 handlePass - Rejection reason:', resultAction.error);
        console.error('🎮 handlePass - Error message:', resultAction.error?.message);
        console.error('🎮 handlePass - Payload:', resultAction.payload);
        
        // Show user-friendly error message
        const errorMessage = resultAction.error?.message || 
                           (typeof resultAction.payload === 'string' ? resultAction.payload : 'Failed to pass turn');
        console.error('🎮 handlePass - Final error message:', errorMessage);
      } else {
        console.error('🎮 handlePass - Unknown result type:', resultAction);
      }
      
    } catch (error) {
      console.error('🎮 handlePass - Exception during pass turn:', error);
    }
  }, [roomsState.currentRoom?.id, gameState.currentGame, dispatch]);

  // Handle play again
  const handlePlayAgain = useCallback(async () => {
    console.log(`🎮 handlePlayAgain - Called`);
    
    if (!roomsState.currentRoom?.id) {
      console.error('🎮 handlePlayAgain - Cannot start new game: no room available');
      return;
    }

    try {
      console.log(`🎮 handlePlayAgain - Dispatching startGame action...`);
      
      const resultAction = await dispatch(startGame(roomsState.currentRoom.id));

      if (startGame.fulfilled.match(resultAction)) {
        console.log(`✅ New game started successfully:`, resultAction.payload);
      } else if (startGame.rejected.match(resultAction)) {
        console.error('🎮 handlePlayAgain - Start game rejected:', resultAction.error);
      }
    } catch (error) {
      console.error('🎮 handlePlayAgain - Exception during start game:', error);
    }
  }, [roomsState.currentRoom?.id, dispatch]);

  // Handle leave game
  const handleLeaveGame = useCallback(async () => {
    console.log(`🎮 handleLeaveGame - Called`);
    
    if (!roomsState.currentRoom?.id) {
      console.error('🎮 handleLeaveGame - Cannot leave game: no room available');
      return;
    }

    try {
      console.log(`🎮 handleLeaveGame - Leaving room ${roomsState.currentRoom.id}`);
      await handleLeaveRoom();
      router.push('/rooms');
    } catch (error) {
      console.error('🎮 handleLeaveGame - Error leaving game:', error);
    }
  }, [roomsState.currentRoom?.id, handleLeaveRoom, router]);

  if (isLoading || !isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <LoadingSpinner message="Loading room..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <LoadingSpinner message="Loading room..." />
      </div>
    );
  }

  const currentPlayerData = currentRoom.players.find(
    (player: Player) => player.userId === user?.id
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto py-8 px-4">
        {shouldShowGameBoard ? (
          // Show Game Interface
          gameState.currentGame ? (
            <GameBoard
              gameState={gameState.currentGame}
              currentUserId={user?.id || ''}
              selectedCards={gameState.selectedCards}
              onCardSelect={handleCardSelect}
              onCardPlay={handleCardPlay}
              onPass={handlePass}
              onBid={handleBid}
              onLeaveGame={handleLeaveGame}
            />
          ) : (
            <div className="text-center py-8">
              <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg">
                🎮 Loading game data...
              </div>
            </div>
          )
        ) : (
          // Show Room Interface
          <RoomInterior
            room={roomsState.currentRoom}
            currentUserId={user?.id || ''}
            onLeaveRoom={handleLeaveRoom}
            onToggleReady={handleToggleReady}
            onStartGame={handleStartGame}
            isLeavingRoom={roomsState.isLeavingRoom}
            isTogglingReady={roomsState.isTogglingReady}
            isStartingGame={roomsState.isStartingGame}
          />
        )}
      </div>

        {/* Action Status Messages */}
        {roomsState.roomActionError && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
            ❌ {roomsState.roomActionError}
          </div>
        )}

        {roomsState.gameStartError && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
            ❌ {roomsState.gameStartError}
          </div>
        )}
      </div>
    );
  }