// Centralized configuration for API URLs and server settings

export const config = {
  // API Configuration
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  serverUrl: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001',
  
  // Development helpers
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Helper function to get API endpoint
  getApiEndpoint: (path: string): string => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
  },
  
  // Helper function to get Socket.IO server URL
  getSocketUrl: (): string => {
    return process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';
  },
  
  // Environment info for debugging
  getEnvironmentInfo: () => ({
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
    serverUrl: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001',
    nodeEnv: process.env.NODE_ENV || 'development',
    isClient: typeof window !== 'undefined',
  })
};

// Development helper - log configuration in dev mode
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('🔧 Client Configuration:', config.getEnvironmentInfo());
  
  // Import and show network instructions
  import('./getLocalIP').then(({ logNetworkInstructions }) => {
    logNetworkInstructions();
  });
} 