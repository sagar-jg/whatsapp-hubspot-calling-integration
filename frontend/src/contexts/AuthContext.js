import React, { createContext, useContext, useState, useCallback } from 'react';
import authService from '../services/authService';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));

  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('auth_token');
    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const isValid = await authService.validateToken(storedToken);
      if (isValid.valid) {
        const userInfo = await authService.getUserInfo();
        setUser(userInfo);
        setToken(storedToken);
        authService.setAuthToken(storedToken);
      } else {
        localStorage.removeItem('auth_token');
        setToken(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (authData) => {
    try {
      setLoading(true);
      const response = await authService.handleOAuthCallback(authData);
      
      if (response.token) {
        localStorage.setItem('auth_token', response.token);
        setToken(response.token);
        authService.setAuthToken(response.token);
        
        const userInfo = await authService.getUserInfo();
        setUser(userInfo);
        
        toast.success('Successfully connected to HubSpot!');
        return response;
      }
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Login failed: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try {
      await authService.disconnect();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
      authService.setAuthToken(null);
      toast.info('Logged out successfully');
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const response = await authService.refreshToken();
      if (response.token) {
        localStorage.setItem('auth_token', response.token);
        setToken(response.token);
        authService.setAuthToken(response.token);
        return response.token;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
      throw error;
    }
  }, [logout]);

  const updateUser = useCallback((updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  }, []);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    checkAuth,
    refreshToken,
    updateUser,
    isAuthenticated: !!user,
    isHubSpotConnected: !!user?.hubspotConnected
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};