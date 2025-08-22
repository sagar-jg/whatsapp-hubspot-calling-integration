const hubspotService = require('../../src/services/hubspotService');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Mock axios and jwt
jest.mock('axios');
jest.mock('jsonwebtoken');

// Mock Redis
const mockRedisClient = {
  setEx: jest.fn(),
  get: jest.fn(),
  del: jest.fn()
};

jest.mock('../../src/config/redis', () => ({
  getClient: () => mockRedisClient
}));

describe('HubSpotService', () => {
  beforeEach(() => {
    process.env.HUBSPOT_APP_ID = 'test_app_id';
    process.env.HUBSPOT_CLIENT_SECRET = 'test_client_secret';
    process.env.HUBSPOT_SCOPES = 'contacts,calling';
    
    jest.clearAllMocks();
  });

  describe('generateOAuthUrl', () => {
    it('should generate correct OAuth URL', () => {
      const redirectUri = 'http://localhost:3000/callback';
      const state = 'test-state';
      
      const url = hubspotService.generateOAuthUrl(redirectUri, state);
      
      expect(url).toContain('https://app.hubspot.com/oauth/authorize');
      expect(url).toContain(`client_id=${process.env.HUBSPOT_APP_ID}`);
      expect(url).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
      expect(url).toContain(`state=${state}`);
      expect(url).toContain('scope=contacts%2Ccalling');
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange authorization code for tokens', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'test_access_token',
          refresh_token: 'test_refresh_token',
          expires_in: 3600
        }
      };

      axios.post.mockResolvedValue(mockTokenResponse);

      const result = await hubspotService.exchangeCodeForTokens(
        'test_code',
        'http://localhost:3000/callback'
      );

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.hubapi.com/oauth/v1/token',
        expect.objectContaining({
          grant_type: 'authorization_code',
          client_id: 'test_app_id',
          client_secret: 'test_client_secret',
          code: 'test_code'
        }),
        expect.any(Object)
      );

      expect(result).toEqual(mockTokenResponse.data);
    });

    it('should handle API errors', async () => {
      const error = {
        response: {
          data: { message: 'Invalid authorization code' }
        }
      };

      axios.post.mockRejectedValue(error);

      await expect(
        hubspotService.exchangeCodeForTokens('invalid_code', 'http://localhost:3000/callback')
      ).rejects.toThrow('Failed to exchange authorization code');
    });
  });

  describe('getContact', () => {
    it('should fetch contact information', async () => {
      const mockContactResponse = {
        data: {
          id: '123',
          properties: {
            email: 'test@example.com',
            firstname: 'John',
            lastname: 'Doe',
            phone: '+1234567890'
          }
        }
      };

      axios.get.mockResolvedValue(mockContactResponse);

      const result = await hubspotService.getContact('123', 'test_access_token');

      expect(axios.get).toHaveBeenCalledWith(
        'https://api.hubapi.com/crm/v3/objects/contacts/123',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test_access_token',
            'Content-Type': 'application/json'
          }
        })
      );

      expect(result).toEqual(mockContactResponse.data);
    });
  });

  describe('createCallEngagement', () => {
    it('should create call engagement successfully', async () => {
      const mockEngagementResponse = {
        data: {
          id: 'engagement_123',
          properties: {
            hs_timestamp: Date.now()
          }
        }
      };

      axios.post.mockResolvedValue(mockEngagementResponse);

      const callData = {
        duration: 120,
        status: 'COMPLETED',
        direction: 'OUTBOUND',
        fromNumber: 'whatsapp:+1234567890',
        toNumber: 'whatsapp:+1987654321',
        contactId: '123'
      };

      const result = await hubspotService.createCallEngagement(
        callData,
        'test_access_token'
      );

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.hubapi.com/crm/v3/objects/calls',
        expect.objectContaining({
          properties: expect.objectContaining({
            hs_call_duration: 120,
            hs_call_status: 'COMPLETED',
            hs_call_direction: 'OUTBOUND'
          })
        }),
        expect.any(Object)
      );

      expect(result).toEqual(mockEngagementResponse.data);
    });
  });

  describe('storeUserTokens', () => {
    it('should store tokens in Redis', async () => {
      const tokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token'
      };

      await hubspotService.storeUserTokens('user123', tokens);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'hubspot:tokens:user123',
        3600,
        JSON.stringify(tokens)
      );
    });
  });

  describe('getUserTokens', () => {
    it('should retrieve tokens from Redis', async () => {
      const tokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token'
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(tokens));

      const result = await hubspotService.getUserTokens('user123');

      expect(mockRedisClient.get).toHaveBeenCalledWith('hubspot:tokens:user123');
      expect(result).toEqual(tokens);
    });

    it('should return null if no tokens found', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await hubspotService.getUserTokens('user123');

      expect(result).toBeNull();
    });
  });

  describe('generateJWT', () => {
    it('should generate JWT token', () => {
      const payload = { userId: 'user123', hubspotConnected: true };
      const mockToken = 'mock_jwt_token';

      jwt.sign.mockReturnValue(mockToken);

      const result = hubspotService.generateJWT(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      expect(result).toBe(mockToken);
    });
  });

  describe('verifyJWT', () => {
    it('should verify JWT token successfully', () => {
      const mockDecoded = { userId: 'user123', hubspotConnected: true };
      jwt.verify.mockReturnValue(mockDecoded);

      const result = hubspotService.verifyJWT('valid_token');

      expect(jwt.verify).toHaveBeenCalledWith('valid_token', process.env.JWT_SECRET);
      expect(result).toEqual(mockDecoded);
    });

    it('should return null for invalid token', () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = hubspotService.verifyJWT('invalid_token');

      expect(result).toBeNull();
    });
  });
});