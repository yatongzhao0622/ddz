'use client';

import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';

interface UserProfileProps {
  showLogout?: boolean;
  compact?: boolean;
}

export default function UserProfile({ showLogout = true, compact = false }: UserProfileProps) {
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner size="sm" message="Loading profile..." />;
  }

  if (!user) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleLogout = () => {
    logout();
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-gray-700">{user.username}</span>
          <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
        </div>
        {showLogout && (
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
            title="Logout"
          >
            🚪
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">User Profile</h2>
        <div className={`w-3 h-3 rounded-full ${user.isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{user.username}</h3>
            <p className="text-sm text-gray-500">
              Status: {user.isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Member since:</span>
            <p className="text-gray-800">{formatDate(user.createdAt)}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Last login:</span>
            <p className="text-gray-800">{formatDate(user.lastLogin)}</p>
          </div>
        </div>

        {user.currentRoom && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <span className="font-medium text-blue-800">Current Room:</span>
            <p className="text-blue-700">{user.currentRoom}</p>
          </div>
        )}

        {showLogout && (
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              🚪 Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 