import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useRef } from 'react';
import { RootState, AppDispatch } from '../store';
import { loginUser, registerUser, logoutUser, checkAuthStatus, clearError } from '../store/slices/authSlice';

// Global singleton to prevent duplicate auth checks across ALL hook instances
let globalAuthInitialized = false;
let globalAuthInProgress = false;

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const authState = useSelector((state: RootState) => state.auth);
  const mountedRef = useRef(false);

  // Initialize auth status ONLY ONCE GLOBALLY
  useEffect(() => {
    mountedRef.current = true;

    // GLOBAL check - prevent ANY duplicate auth initialization
    if (globalAuthInitialized) {
      console.log('🔍 useAuth - Global auth already initialized, skipping');
      return;
    }

    // GLOBAL check - prevent concurrent auth checks
    if (globalAuthInProgress) {
      console.log('🔍 useAuth - Global auth check in progress, skipping');
      return;
    }

    // Don't run auth check if we're already authenticated with a user
    if (authState.isAuthenticated && authState.user) {
      console.log('🔍 useAuth - Already authenticated with user, skipping auth check');
      globalAuthInitialized = true;
      return;
    }

    // Only check auth if we have a token and we're on the client
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        console.log('🔍 useAuth - Starting GLOBAL auth check (ONCE)');
        globalAuthInProgress = true;
        globalAuthInitialized = true;
        
        dispatch(checkAuthStatus()).finally(() => {
          console.log('🔍 useAuth - Global auth check completed');
          globalAuthInProgress = false;
        });
      } else {
        console.log('🔍 useAuth - No token found, marking as initialized');
        globalAuthInitialized = true;
      }
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, []); // Empty dependency array - run only once per hook instance

  const login = async (username: string) => {
    const result = await dispatch(loginUser({ username }));
    if (loginUser.fulfilled.match(result)) {
      // Reset global flags after successful login
      globalAuthInProgress = false;
    }
    return result;
  };

  const register = async (username: string) => {
    const result = await dispatch(registerUser({ username }));
    if (registerUser.fulfilled.match(result)) {
      // Reset global flags after successful register
      globalAuthInProgress = false;
    }
    return result;
  };

  const logout = () => {
    console.log('🔍 useAuth - Logging out, resetting global flags');
    globalAuthInitialized = false;
    globalAuthInProgress = false;
    dispatch(logoutUser());
  };

  const clearAuthError = () => {
    dispatch(clearError());
  };

  return {
    ...authState,
    login,
    register,
    logout,
    clearError: clearAuthError,
  };
}; 