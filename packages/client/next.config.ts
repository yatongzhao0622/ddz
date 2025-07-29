import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Enable React 19 concurrent features
    reactCompiler: false,
  },
  // Improve hydration handling
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Better browser extension compatibility
  poweredByHeader: false,
  // Optimize for development
  devIndicators: {
    appIsrStatus: true,
  },
};

export default nextConfig;
