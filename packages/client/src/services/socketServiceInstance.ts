import { SocketService } from './socketService';

// Create singleton instance of SocketService
export const socketService = new SocketService({
  serverUrl: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001',
  autoConnect: false, // Completely disable auto-connect for manual Redux control
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  randomizationFactor: 0.5,
  timeout: 20000
});

// Ensure the socket is completely disconnected on initialization
if (typeof window !== 'undefined') {
  socketService.disconnect();
}

// Export the instance as default for easy importing
export default socketService; 