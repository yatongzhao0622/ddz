'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { useSocket } from '../../../hooks/useSocket';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import { Player } from '../../../services/socketService';
import { leaveRoom, toggleReady, startGame, joinRoom } from '../../../store/slices/roomsSlice';
import RoomInterior from '../../../components/rooms/RoomInterior';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

export default function RoomPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const params = useParams();
  const roomId = params?.roomId as string;
  const { isAuthenticated, isLoading, user } = useAuth();
  const socket = useSocket();
  const roomsState = useSelector((state: RootState) => state.rooms);
  const [isClient, setIsClient] = useState(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
      const currentRoom = roomsState.currentRoom;
      
      // If not in any room or in a different room, join this room
      if (!currentRoom || currentRoom.id !== roomId) {
        const isUserInRoom = currentRoom?.players.some((player: Player) => player.userId === user.id);
        if (!isUserInRoom) {
          console.log('🏠 Joining room:', roomId);
          (dispatch as any)(joinRoom(roomId));
        }
      }
    }
  }, [socket.isAuthenticated, roomId, user?.id, roomsState.currentRoom, dispatch, isLeavingRoom]);

  // Redirect to rooms list if user leaves room or room becomes null
  useEffect(() => {
    if (user?.id) {
      // Case 1: No current room (user left or room was cleared)
      if (!roomsState.currentRoom) {
        console.log('🏠 No current room, redirecting to rooms list');
        router.push('/rooms');
        return;
      }
      
      // Case 2: Current room exists but user is not in it
      const isUserInRoom = roomsState.currentRoom.players.some(
        (player: Player) => player.userId === user.id
      );
      
      if (!isUserInRoom && !isLeavingRoom) {
        console.log('🏠 User not in room, redirecting to rooms list');
        router.push('/rooms');
      }
    }
  }, [roomsState.currentRoom, user?.id, router, isLeavingRoom]);

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
      (dispatch as any)(toggleReady(roomId));
    }
  }, [roomId, dispatch]);

  const handleStartGame = useCallback(() => {
    if (roomId) {
      (dispatch as any)(startGame(roomId));
    }
  }, [roomId, dispatch]);

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

  if (!roomsState.currentRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <LoadingSpinner message="Loading room..." />
      </div>
    );
  }

  const currentPlayerData = roomsState.currentRoom.players.find(
    (player: Player) => player.userId === user?.id
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto py-8 px-4">
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