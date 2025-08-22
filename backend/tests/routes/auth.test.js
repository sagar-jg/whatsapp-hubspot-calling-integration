const request = require('supertest');
const { app } = require('../../src/index');
const hubspotService = require('../../src/services/hubspotService');

// Mock services
jest.mock('../../src/services/hubspotService');

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/hubspot/oauth-url', () => {
    it('should generate OAuth URL successfully', async () => {
      const mockOAuthUrl = 'https://app.hubspot.com/oauth/authorize?client_id=test';
      hubspotService.generateOAuthUrl.mockReturnValue(mockOAuthUrl);

      const response = await request(app)
        .post('/api/auth/hubspot/oauth-url')
        .send({
          redirectUri: 'http://localhost:3000/callback',
          state: 'test-state'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.authUrl).toBe(mockOAuthUrl);
      expect(response.body.state).toBe('test-state');
    });

    it('should validate redirect URI', async () => {
      const response = await request(app)
        .post('/api/auth/hubspot/oauth-url')
        .send({
          redirectUri: 'invalid-url',
          state: 'test-state'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should require redirect URI', async () => {
      const response = await request(app)
        .post('/api/auth/hubspot/oauth-url')
        .send({
          state: 'test-state'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/hubspot/callback', () => {
    it('should handle OAuth callback successfully', async () => {
      const mockTokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_in: 3600,
        scope: 'contacts calling'
      };

      const mockJwtToken = 'mock_jwt_token';

      hubspotService.exchangeCodeForTokens.mockResolvedValue(mockTokens);
      hubspotService.storeUserTokens.mockResolvedValue();
      hubspotService.generateJWT.mockReturnValue(mockJwtToken);

      const response = await request(app)
        .post('/api/auth/hubspot/callback')
        .send({
          code: 'test_authorization_code',
          redirectUri: 'http://localhost:3000/callback',
          state: 'test-state'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBe(mockJwtToken);
      expect(response.body.expiresIn).toBe(3600);
      expect(response.body.scopes).toEqual(['contacts', 'calling']);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/hubspot/callback')
        .send({
          redirectUri: 'http://localhost:3000/callback'
          // Missing code
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should handle token exchange errors', async () => {
      hubspotService.exchangeCodeForTokens.mockRejectedValue(
        new Error('Invalid authorization code')
      );

      const response = await request(app)
        .post('/api/auth/hubspot/callback')
        .send({
          code: 'invalid_code',
          redirectUri: 'http://localhost:3000/callback',
          state: 'test-state'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('OAuth callback failed');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let authToken;
    let mockUser;

    beforeEach(() => {
      mockUser = {
        userId: 'test-user-123'
      };
      authToken = 'mock-jwt-token';
      hubspotService.verifyJWT.mockReturnValue(mockUser);
    });

    it('should refresh tokens successfully', async () => {
      const mockStoredTokens = {
        access_token: 'old_access_token',
        refresh_token: 'test_refresh_token'
      };

      const mockNewTokens = {
        access_token: 'new_access_token',
        expires_in: 3600
      };

      const mockNewJwtToken = 'new_jwt_token';

      hubspotService.getUserTokens.mockResolvedValue(mockStoredTokens);
      hubspotService.refreshAccessToken.mockResolvedValue(mockNewTokens);
      hubspotService.storeUserTokens.mockResolvedValue();
      hubspotService.generateJWT.mockReturnValue(mockNewJwtToken);

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBe(mockNewJwtToken);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/refresh');

      expect(response.status).toBe(401);
    });

    it('should handle missing refresh token', async () => {
      hubspotService.getUserTokens.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No refresh token available');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;
    let mockUser;

    beforeEach(() => {
      mockUser = {
        userId: 'test-user-123',
        hubspotConnected: true
      };
      authToken = 'mock-jwt-token';
      hubspotService.verifyJWT.mockReturnValue(mockUser);
    });

    it('should return user information', async () => {
      const mockTokens = {
        access_token: 'test_access_token'
      };

      const mockTokenInfo = {
        created_at: '2023-01-01T00:00:00Z',
        scopes: ['contacts', 'calling'],
        hub_id: '12345'
      };

      hubspotService.getUserTokens.mockResolvedValue(mockTokens);
      hubspotService.validateAccessToken.mockResolvedValue(mockTokenInfo);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe('test-user-123');
      expect(response.body.hubspotConnected).toBe(true);
      expect(response.body.hubspotInfo).toEqual(
        expect.objectContaining({
          scopes: ['contacts', 'calling'],
          hubId: '12345'
        })
      );
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/validate-token', () => {
    it('should validate token successfully', async () => {
      const mockDecoded = {
        userId: 'test-user-123',
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };

      hubspotService.verifyJWT.mockReturnValue(mockDecoded);

      const response = await request(app)
        .post('/api/auth/validate-token')
        .send({
          token: 'valid_token'
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.userId).toBe('test-user-123');
    });

    it('should return invalid for bad token', async () => {
      hubspotService.verifyJWT.mockReturnValue(null);

      const response = await request(app)
        .post('/api/auth/validate-token')
        .send({
          token: 'invalid_token'
        });

      expect(response.status).toBe(401);
      expect(response.body.valid).toBe(false);
    });

    it('should require token parameter', async () => {
      const response = await request(app)
        .post('/api/auth/validate-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });
});