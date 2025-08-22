import authService from './authService';
import apiClient from './apiClient';

// Mock apiClient
jest.mock('./apiClient');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('setAuthToken', () => {
    it('should set authorization header when token provided', () => {
      const token = 'test-token';
      authService.setAuthToken(token);
      
      expect(apiClient.defaults.headers.common['Authorization']).toBe(`Bearer ${token}`);
    });

    it('should remove authorization header when token is null', () => {
      authService.setAuthToken(null);
      
      expect(apiClient.defaults.headers.common['Authorization']).toBeUndefined();
    });
  });

  describe('generateOAuthUrl', () => {
    it('should generate OAuth URL successfully', async () => {
      const mockResponse = {
        data: {
          authUrl: 'https://app.hubspot.com/oauth/authorize',
          state: 'test-state'
        }
      };
      
      apiClient.post.mockResolvedValue(mockResponse);
      
      const result = await authService.generateOAuthUrl(
        'http://localhost:3000/callback',
        'test-state'
      );
      
      expect(apiClient.post).toHaveBeenCalledWith('/auth/hubspot/oauth-url', {
        redirectUri: 'http://localhost:3000/callback',
        state: 'test-state'
      });
      
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle API errors', async () => {
      const error = {
        response: {
          data: {
            details: 'Invalid redirect URI'
          }
        }
      };
      
      apiClient.post.mockRejectedValue(error);
      
      await expect(
        authService.generateOAuthUrl('invalid-uri', 'test-state')
      ).rejects.toThrow('Invalid redirect URI');
    });
  });

  describe('handleOAuthCallback', () => {
    it('should handle OAuth callback successfully', async () => {
      const mockResponse = {
        data: {
          token: 'jwt-token',
          userId: 'user123'
        }
      };
      
      const callbackData = {
        code: 'auth-code',
        redirectUri: 'http://localhost:3000/callback',
        state: 'test-state'
      };
      
      apiClient.post.mockResolvedValue(mockResponse);
      
      const result = await authService.handleOAuthCallback(callbackData);
      
      expect(apiClient.post).toHaveBeenCalledWith('/auth/hubspot/callback', callbackData);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('validateToken', () => {
    it('should validate token successfully', async () => {
      const mockResponse = {
        data: {
          valid: true,
          userId: 'user123'
        }
      };
      
      apiClient.post.mockResolvedValue(mockResponse);
      
      const result = await authService.validateToken('valid-token');
      
      expect(apiClient.post).toHaveBeenCalledWith('/auth/validate-token', {
        token: 'valid-token'
      });
      
      expect(result).toEqual(mockResponse.data);
    });

    it('should return invalid for API errors', async () => {
      apiClient.post.mockRejectedValue(new Error('API Error'));
      
      const result = await authService.validateToken('invalid-token');
      
      expect(result).toEqual({ valid: false });
    });
  });

  describe('getUserInfo', () => {
    it('should get user info successfully', async () => {
      const mockResponse = {
        data: {
          userId: 'user123',
          hubspotConnected: true
        }
      };
      
      apiClient.get.mockResolvedValue(mockResponse);
      
      const result = await authService.getUserInfo();
      
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockResponse = {
        data: {
          token: 'new-jwt-token',
          expiresIn: 3600
        }
      };
      
      apiClient.post.mockResolvedValue(mockResponse);
      
      const result = await authService.refreshToken();
      
      expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'HubSpot account disconnected'
        }
      };
      
      apiClient.post.mockResolvedValue(mockResponse);
      
      const result = await authService.disconnect();
      
      expect(apiClient.post).toHaveBeenCalledWith('/auth/disconnect');
      expect(result).toEqual(mockResponse.data);
    });
  });
});