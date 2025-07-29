import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  username: string;
  isOnline: boolean;
  currentRoom?: string;
  createdAt: string;
  lastLogin: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
};

// Async thunks for authentication
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: { username: string }, { rejectWithValue }) => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Login failed');
      }

      const response_data = await response.json();
      
      // Store token in localStorage (token is in response_data.data.token)
      localStorage.setItem('token', response_data.data.token);
      
      return response_data.data;
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (credentials: { username: string }, { rejectWithValue }) => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Registration failed');
      }

      const response_data = await response.json();
      
      // Store token in localStorage (token is in response_data.data.token)
      localStorage.setItem('token', response_data.data.token);
      
      return response_data.data;
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:3001/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Clear token regardless of response
      localStorage.removeItem('token');
      
      if (!response.ok) {
        console.warn('Logout API call failed, but token cleared locally');
      }

      return null;
    } catch (error) {
      // Clear token even if network fails
      localStorage.removeItem('token');
      return null;
    }
  }
);

export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return rejectWithValue('No token found');
      }

      // Simple token validation - just check if it exists and trim whitespace
      const cleanToken = token.trim();
      
      if (!cleanToken) {
        console.warn('Empty token detected, clearing localStorage');
        localStorage.removeItem('token');
        return rejectWithValue('Empty token');
      }

      console.log('🔍 checkAuthStatus - Validating token with server');
      const response = await fetch('http://localhost:3001/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
        },
      });

      if (!response.ok) {
        console.warn('🔍 checkAuthStatus - Server rejected token, status:', response.status);
        
        // Only clear token on 401 (unauthorized) - let other errors persist the token
        if (response.status === 401) {
          console.warn('🔍 checkAuthStatus - Token expired/invalid, clearing localStorage');
          localStorage.removeItem('token');
          return rejectWithValue('Token expired or invalid');
        }
        
        // For other errors (500, network issues), keep the token
        const errorData = await response.json().catch(() => ({ message: 'Authentication failed' }));
        return rejectWithValue(errorData.message || 'Authentication failed');
      }

      console.log('🔍 checkAuthStatus - Token validated successfully');
      const data = await response.json();
      return { user: data.user, token: cleanToken };
    } catch (error) {
      console.error('🔍 checkAuthStatus - Network error:', error);
      // Don't clear token on network errors - keep it for retry
      return rejectWithValue('Network error - token preserved');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('token');
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      });

    // Check auth status
    builder
      .addCase(checkAuthStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  },
});

export const { clearError, clearAuth } = authSlice.actions;
export default authSlice.reducer; 