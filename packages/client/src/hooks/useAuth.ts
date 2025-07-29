import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useRef } from 'react';
import { RootState, AppDispatch } from '../store';
import { loginUser, registerUser, logoutUser, checkAuthStatus, clearError } from '../store/slices/authSlice';

// Global flag to prevent excessive concurrent auth checks
let globalAuthInProgress = false;

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const authState = useSelector((state: RootState) => state.auth);
  const mountedRef = useRef(false);
  const authCheckStartedRef = useRef(false);

  // Initialize auth status on mount - allow re-checking on page refresh
  useEffect(() => {
    mountedRef.current = true;

    // Prevent duplicate auth checks within this specific hook instance
    if (authCheckStartedRef.current) {
      console.log('🔍 useAuth - Auth check already started in this hook instance');
      return;
    }

    // Prevent excessive concurrent global auth checks
    if (globalAuthInProgress) {
      console.log('🔍 useAuth - Global auth check in progress, skipping');
      return;
    }

    // Don't run auth check if we're already authenticated with a user
    if (authState.isAuthenticated && authState.user) {
      console.log('🔍 useAuth - Already authenticated with user:', authState.user.username);
      return;
    }

    // Only check auth if we have a token and we're on the client
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && !authState.isLoading) {
        console.log('🔍 useAuth - Starting auth check on page load/refresh');
        authCheckStartedRef.current = true;
        globalAuthInProgress = true;
        
        // Dispatch auth check and handle completion
        dispatch(checkAuthStatus()).unwrap().then(() => {
          console.log('🔍 useAuth - Auth check completed successfully');
          globalAuthInProgress = false;
        }).catch((error: any) => {
          console.error('🔍 useAuth - Auth check failed:', error);
          globalAuthInProgress = false;
        });
      } else if (!token) {
        console.log('🔍 useAuth - No token found, user not authenticated');
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