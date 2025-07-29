'use client';

import { useState, useCallback } from 'react';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (roomData: RoomCreationData) => Promise<void>;
  isCreating?: boolean;
}

export interface RoomCreationData {
  name: string;
  maxPlayers: number;
  isPrivate: boolean;
  password?: string;
}

export default function CreateRoomModal({ isOpen, onClose, onCreateRoom, isCreating }: CreateRoomModalProps) {
  const [formData, setFormData] = useState<RoomCreationData>({
    name: '',
    maxPlayers: 3,
    isPrivate: false,
    password: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate room name
    if (!formData.name.trim()) {
      newErrors.name = '房间名称不能为空';
    } else if (formData.name.length < 2) {
      newErrors.name = '房间名称至少需要2个字符';
    } else if (formData.name.length > 30) {
      newErrors.name = '房间名称不能超过30个字符';
    }

    // Validate max players
    if (formData.maxPlayers < 2 || formData.maxPlayers > 4) {
      newErrors.maxPlayers = '玩家数量必须在2-4之间';
    }

    // Validate password if private
    if (formData.isPrivate && formData.password && formData.password.length < 4) {
      newErrors.password = '密码至少需要4个字符';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onCreateRoom(formData);
      // Reset form on success
      setFormData({
        name: '',
        maxPlayers: 3,
        isPrivate: false,
        password: ''
      });
      setErrors({});
      onClose();
    } catch (error) {
      setErrors({ general: '创建房间失败，请重试' });
    }
  }, [formData, validateForm, onCreateRoom, onClose]);

  const handleInputChange = useCallback((field: keyof RoomCreationData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">🏠 创建新房间</h2>
          <button
            onClick={onClose}
            disabled={isCreating}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:cursor-not-allowed"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* General Error */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Room Name */}
          <div>
            <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-2">
              房间名称 *
            </label>
            <input
              id="roomName"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="输入房间名称..."
              disabled={isCreating}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
              } ${isCreating ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              maxLength={30}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isCreating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>创建中...</span>
              </div>
            ) : (
              '🏠 创建房间'
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 