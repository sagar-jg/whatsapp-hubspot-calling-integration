import apiClient from './apiClient';

class AuthService {
  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setAuthToken(token) {
    this.token = token;
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
    }
  }

  async generateOAuthUrl(redirectUri, state) {
    try {
      const response = await apiClient.post('/auth/hubspot/oauth-url', {
        redirectUri,
        state
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.details || 'Failed to generate OAuth URL');
    }
  }

  async handleOAuthCallback(callbackData) {
    try {
      const response = await apiClient.post('/auth/hubspot/callback', callbackData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.details || 'OAuth callback failed');
    }
  }

  async validateToken(token) {
    try {
      const response = await apiClient.post('/auth/validate-token', { token });
      return response.data;
    } catch (error) {
      return { valid: false };
    }
  }

  async getUserInfo() {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.details || 'Failed to get user info');
    }
  }

  async refreshToken() {
    try {
      const response = await apiClient.post('/auth/refresh');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.details || 'Token refresh failed');
    }
  }

  async disconnect() {
    try {
      const response = await apiClient.post('/auth/disconnect');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.details || 'Disconnect failed');
    }
  }

  // Initialize auth token if it exists
  init() {
    if (this.token) {
      this.setAuthToken(this.token);
    }
  }
}

const authService = new AuthService();
authService.init();

export default authService;