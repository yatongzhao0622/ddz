// Utility to help detect local network configuration

/**
 * Get instructions for finding local IP address
 */
export function getLocalIPInstructions(): string {
  const platform = typeof navigator !== 'undefined' ? navigator.platform : 'unknown';
  
  if (platform.includes('Win')) {
    return 'Windows: Open Command Prompt and run "ipconfig". Look for "IPv4 Address" under your network adapter.';
  } else if (platform.includes('Mac')) {
    return 'Mac: Open Terminal and run "ifconfig | grep inet". Look for an address like 192.168.x.x or 10.x.x.x';
  } else if (platform.includes('Linux')) {
    return 'Linux: Open Terminal and run "ip addr show" or "ifconfig". Look for an address like 192.168.x.x or 10.x.x.x';
  }
  
  return 'Find your local IP address using your system\'s network settings or command line tools.';
}

/**
 * Check if current URL is using localhost
 */
export function isUsingLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

/**
 * Get suggested server URLs for local network access
 */
export function getNetworkAccessSuggestions(): {
  currentConfig: string;
  suggestions: string[];
  instructions: string;
} {
  const currentServerUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';
  const currentApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  
  return {
    currentConfig: `Server: ${currentServerUrl}\nAPI: ${currentApiUrl}`,
    suggestions: [
      'Find your local IP address (e.g., 192.168.1.100)',
      'Update .env.local with your IP:',
      'NEXT_PUBLIC_SERVER_URL=http://YOUR_IP:3001',
      'NEXT_PUBLIC_API_URL=http://YOUR_IP:3001/api',
      'Restart the development server',
      'Access from any device: http://YOUR_IP:3000'
    ],
    instructions: getLocalIPInstructions()
  };
}

/**
 * Log network access instructions to console in development
 */
export function logNetworkInstructions(): void {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const suggestions = getNetworkAccessSuggestions();
    
    console.group('🌐 Network Access Configuration');
    console.log('Current Config:', suggestions.currentConfig);
    console.log('For network access:');
    suggestions.suggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. ${suggestion}`);
    });
    console.log('IP Address Help:', suggestions.instructions);
    console.groupEnd();
  }
} 