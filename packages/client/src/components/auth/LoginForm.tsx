'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [validationError, setValidationError] = useState('');
  
  const { login, register, isLoading, error, isAuthenticated, clearError } = useAuth();

  // Clear errors when switching modes or typing
  useEffect(() => {
    if (error) {
      clearError();
    }
    setValidationError('');
  }, [isRegisterMode, username, clearError, error]);

  // Redirect on successful authentication
  useEffect(() => {
    if (isAuthenticated && onSuccess) {
      onSuccess();
    }
  }, [isAuthenticated, onSuccess]);

  const validateUsername = (value: string): string => {
    if (!value.trim()) {
      return 'Username is required';
    }
    if (value.length < 2) {
      return 'Username must be at least 2 characters';
    }
    if (value.length > 20) {
      return 'Username must be less than 20 characters';
    }
    if (!/^[a-zA-Z0-9_\u4e00-\u9fff]+$/.test(value)) {
      return 'Username can only contain letters, numbers, underscores, and Chinese characters';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErr = validateUsername(username);
    if (validationErr) {
      setValidationError(validationErr);
      return;
    }

    try {
      if (isRegisterMode) {
        await register(username.trim());
      } else {
        await login(username.trim());
      }
    } catch (err) {
      // Error handling is managed by Redux slice
    }
  };

  const currentError = validationError || error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              🃏 斗地主 Online
            </h1>
            <p className="text-gray-600">
              {isRegisterMode ? 'Create your account' : 'Welcome back!'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={isLoading}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  currentError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                autoComplete="username"
                maxLength={20}
              />
              {currentError && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠️</span>
                  {currentError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !username.trim()}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                isLoading || !username.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {isRegisterMode ? 'Creating Account...' : 'Signing In...'}
                </div>
              ) : (
                isRegisterMode ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsRegisterMode(!isRegisterMode)}
              disabled={isLoading}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:text-gray-400"
            >
              {isRegisterMode 
                ? 'Already have an account? Sign In'
                : "Don't have an account? Create One"
              }
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>🎮 Demo System - No password required</p>
              <p>Chinese characters supported: 你好世界</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 