'use client';

import React, { useState, useEffect } from 'react';
import { config } from '../../utils/config';
import { getNetworkAccessSuggestions, isUsingLocalhost } from '../../utils/getLocalIP';

const NetworkStatus: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<{
    isLocalhost: boolean;
    currentUrl: string;
    serverUrl: string;
    apiUrl: string;
    suggestions: any;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const info = {
        isLocalhost: isUsingLocalhost(),
        currentUrl: window.location.href,
        serverUrl: config.serverUrl,
        apiUrl: config.apiUrl,
        suggestions: getNetworkAccessSuggestions()
      };
      setNetworkInfo(info);
    }
  }, []);

  if (!networkInfo || config.isProduction) {
    return null; // Only show in development
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          networkInfo.isLocalhost
            ? 'bg-yellow-500 text-white hover:bg-yellow-600'
            : 'bg-green-500 text-white hover:bg-green-600'
        }`}
        title="Network Configuration Status"
      >
        🌐 {networkInfo.isLocalhost ? 'Localhost Only' : 'Network Ready'}
      </button>

      {showDetails && (
        <div className="absolute bottom-12 left-0 bg-white rounded-lg shadow-xl border p-4 w-80 max-w-sm">
          <div className="mb-3">
            <h3 className="font-semibold text-gray-800 mb-2">Network Configuration</h3>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-600">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  networkInfo.isLocalhost 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {networkInfo.isLocalhost ? 'Local Only' : 'Network Accessible'}
                </span>
              </div>
              
              <div>
                <span className="font-medium text-gray-600">Client:</span>
                <span className="ml-2 text-gray-800 font-mono text-xs break-all">
                  {networkInfo.currentUrl}
                </span>
              </div>
              
              <div>
                <span className="font-medium text-gray-600">Server:</span>
                <span className="ml-2 text-gray-800 font-mono text-xs">
                  {networkInfo.serverUrl}
                </span>
              </div>
            </div>
          </div>

          {networkInfo.isLocalhost && (
            <div className="border-t pt-3">
              <h4 className="font-medium text-gray-700 mb-2">🔧 For Network Access:</h4>
              <ol className="text-xs text-gray-600 space-y-1">
                {networkInfo.suggestions.suggestions.map((suggestion: string, index: number) => (
                  <li key={index} className="flex">
                    <span className="font-medium mr-1">{index + 1}.</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ol>
              
              <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                <strong>IP Help:</strong> {networkInfo.suggestions.instructions}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowDetails(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default NetworkStatus; 