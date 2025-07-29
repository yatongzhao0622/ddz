import { ApiResponse } from './roomService';
import { config } from '../utils/config';

class GameService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.apiUrl;
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  // Get current game state
  async getGameState(roomId: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/rooms/${roomId}/game`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get game state');
      }

      return data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get game state');
    }
  }

  // Get game history
  async getGameHistory(roomId: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/games/${roomId}/history`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get game history');
      }

      return data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get game history');
    }
  }

  // Get player statistics
  async getPlayerStats(userId: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/games/stats/${userId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get player stats');
      }

      return data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get player stats');
    }
  }

  // Start a new game (validation endpoint)
  async startGame(roomId: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/games/${roomId}/start`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start game');
      }

      return data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to start game');
    }
  }
}

export const gameService = new GameService(); 