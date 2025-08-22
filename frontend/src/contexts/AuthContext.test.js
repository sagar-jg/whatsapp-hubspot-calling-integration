import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import authService from '../services/authService';

// Mock authService
jest.mock('../services/authService');

// Mock toast
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));

// Test component that uses the auth context
const TestComponent = () => {
  const { user, isAuthenticated, login, logout, loading } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="user">{user ? user.userId : 'no-user'}</div>
      <button onClick={() => login({ code: 'test-code' })}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should provide initial state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
  });

  it('should handle successful login', async () => {
    const mockLoginResponse = {
      token: 'jwt-token',
      userId: 'user123'
    };
    
    const mockUserInfo = {
      userId: 'user123',
      hubspotConnected: true
    };
    
    authService.handleOAuthCallback.mockResolvedValue(mockLoginResponse);
    authService.getUserInfo.mockResolvedValue(mockUserInfo);
    authService.setAuthToken = jest.fn();
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    const loginButton = screen.getByText('Login');
    
    await act(async () => {
      loginButton.click();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('user')).toHaveTextContent('user123');
    });
    
    expect(localStorage.getItem('auth_token')).toBe('jwt-token');
    expect(authService.setAuthToken).toHaveBeenCalledWith('jwt-token');
  });

  it('should handle login failure', async () => {
    authService.handleOAuthCallback.mockRejectedValue(new Error('Login failed'));
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    const loginButton = screen.getByText('Login');
    
    await act(async () => {
      loginButton.click();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    });
  });

  it('should handle logout', async () => {
    // Set up initial authenticated state
    localStorage.setItem('auth_token', 'jwt-token');
    
    const mockUserInfo = {
      userId: 'user123',
      hubspotConnected: true
    };
    
    authService.validateToken.mockResolvedValue({ valid: true });
    authService.getUserInfo.mockResolvedValue(mockUserInfo);
    authService.disconnect.mockResolvedValue();
    authService.setAuthToken = jest.fn();
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Wait for initial auth check
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    });
    
    const logoutButton = screen.getByText('Logout');
    
    await act(async () => {
      logoutButton.click();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    });
    
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(authService.setAuthToken).toHaveBeenCalledWith(null);
  });

  it('should check authentication on mount', async () => {
    localStorage.setItem('auth_token', 'jwt-token');
    
    const mockUserInfo = {
      userId: 'user123',
      hubspotConnected: true
    };
    
    authService.validateToken.mockResolvedValue({ valid: true });
    authService.getUserInfo.mockResolvedValue(mockUserInfo);
    authService.setAuthToken = jest.fn();
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    });
  });

  it('should handle invalid stored token', async () => {
    localStorage.setItem('auth_token', 'invalid-token');
    
    authService.validateToken.mockResolvedValue({ valid: false });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    });
    
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});