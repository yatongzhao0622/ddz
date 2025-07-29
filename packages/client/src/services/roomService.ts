'use client';

import { RoomCreationData } from '../components/rooms/CreateRoomModal';
import { config } from '../utils/config';

const API_BASE = config.serverUrl;

export interface ApiRoom {
  id: string;
  name: string;
  maxPlayers: number;
  currentPlayerCount: number;
  status: 'waiting' | 'playing' | 'finished';
  createdBy: string;
  players: {
    userId: string;
    username: string;
    isReady: boolean;
    isConnected: boolean;
    joinedAt: string;
  }[];
  isPrivate: boolean;
  createdAt: string;
  settings: {
    isPrivate: boolean;
    autoStart: boolean;
    minPlayers: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

class RoomService {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  async getAvailableRooms(): Promise<ApiRoom[]> {
    try {
      console.log('🔍 RoomService - Fetching available rooms');
      
      const response = await fetch(`${API_BASE}/api/rooms/available`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const result: ApiResponse<{ rooms: ApiRoom[]; count: number }> = await response.json();
      
      console.log('🔍 RoomService - API Response:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch rooms');
      }

      const rooms = result.data?.rooms || [];
      console.log('🔍 RoomService - Parsed rooms:', rooms.map(r => ({ id: r.id, name: r.name })));
      
      return rooms;
    } catch (error) {
      console.error('Failed to fetch available rooms:', error);
      throw error;
    }
  }

  async createRoom(roomData: RoomCreationData): Promise<ApiRoom> {
    try {
      const response = await fetch(`${API_BASE}/api/rooms/create`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          roomName: roomData.name,
          maxPlayers: roomData.maxPlayers,
          settings: {
            isPrivate: roomData.isPrivate,
            autoStart: false,
            minPlayers: Math.min(roomData.maxPlayers, 3)
          }
        }),
      });

      const result: ApiResponse<{ room: ApiRoom }> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create room');
      }

      if (!result.data?.room) {
        throw new Error('Invalid response data');
      }

      return result.data.room;
    } catch (error) {
      console.error('Failed to create room:', error);
      throw error;
    }
  }

  async joinRoom(roomId: string): Promise<ApiRoom> {
    try {
      const response = await fetch(`${API_BASE}/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      const result: ApiResponse<{ room: ApiRoom }> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to join room');
      }

      if (!result.data?.room) {
        throw new Error('Invalid response data');
      }

      return result.data.room;
    } catch (error) {
      console.error('Failed to join room:', error);
      throw error;
    }
  }

  async leaveRoom(roomId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      const result: ApiResponse<object> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to leave room');
      }
    } catch (error) {
      console.error('Failed to leave room:', error);
      throw error;
    }
  }

  async toggleReady(roomId: string): Promise<ApiRoom> {
    try {
      const response = await fetch(`${API_BASE}/api/rooms/${roomId}/ready`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      const result: ApiResponse<{ room: ApiRoom }> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to toggle ready status');
      }

      if (!result.data?.room) {
        throw new Error('Invalid response data');
      }

      return result.data.room;
    } catch (error) {
      console.error('Failed to toggle ready status:', error);
      throw error;
    }
  }

  async startGame(roomId: string): Promise<ApiRoom> {
    try {
      const response = await fetch(`${API_BASE}/api/rooms/${roomId}/start`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      const result: ApiResponse<{ room: ApiRoom }> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to start game');
      }

      if (!result.data?.room) {
        throw new Error('Invalid response data');
      }

      return result.data.room;
    } catch (error) {
      console.error('Failed to start game:', error);
      throw error;
    }
  }
}

export const roomService = new RoomService(); 