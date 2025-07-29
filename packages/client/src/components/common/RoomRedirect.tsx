'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

export default function RoomRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const currentRoom = useSelector((state: RootState) => state.auth.user?.currentRoom);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const isLeavingRoom = useSelector((state: RootState) => state.rooms.isLeavingRoom);

  useEffect(() => {
    // Skip redirection if:
    // 1. Not authenticated
    // 2. No current room
    // 3. Currently leaving a room
    // 4. Already on the room detail page
    // 5. On the rooms list page
    // 6. On the login page
    if (!isAuthenticated || !currentRoom || isLeavingRoom) {
      console.log('🔄 RoomRedirect - Skipping (auth/room state):', {
        isAuthenticated,
        hasRoom: !!currentRoom,
        isLeavingRoom
      });
      return;
    }

    const isRoomPage = pathname?.startsWith(`/rooms/${currentRoom}`);
    const isRoomsList = pathname === '/rooms';
    const isLoginPage = pathname === '/login';

    if (!isRoomPage) {
      console.log('🔄 RoomRedirect - Redirecting:', {
        from: pathname,
        to: `/rooms/${currentRoom}`,
        roomId: currentRoom
      });
      router.push(`/rooms/${currentRoom}`);
    } else {
      console.log('🔄 RoomRedirect - No redirect needed:', {
        pathname,
        isRoomPage,
        isRoomsList,
        isLoginPage
      });
    }
  }, [currentRoom, isAuthenticated, isLeavingRoom, pathname, router]);

  return null;
} 