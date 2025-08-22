const request = require('supertest');
const { app } = require('../../src/index');
const twilioService = require('../../src/services/twilioService');
const hubspotService = require('../../src/services/hubspotService');
const webrtcService = require('../../src/services/webrtcService');

// Mock services
jest.mock('../../src/services/twilioService');
jest.mock('../../src/services/hubspotService');
jest.mock('../../src/services/webrtcService');

describe('Calls API', () => {
  let authToken;
  let mockUser;

  beforeEach(() => {
    mockUser = {
      userId: 'test-user-123',
      hubspotConnected: true
    };

    authToken = 'mock-jwt-token';

    // Mock authentication
    hubspotService.verifyJWT.mockReturnValue(mockUser);
    hubspotService.getUserTokens.mockResolvedValue({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token'
    });
    hubspotService.validateAccessToken.mockResolvedValue({ valid: true });

    jest.clearAllMocks();
  });

  describe('POST /api/calls/outbound', () => {
    it('should initiate outbound call successfully', async () => {
      const mockCallResult = {
        callId: 'call-123',
        twilioCallSid: 'CA123456789',
        status: 'initiated',
        toNumber: 'whatsapp:+1987654321',
        fromNumber: 'whatsapp:+1234567890'
      };

      const mockWebRTCSession = {
        id: 'session-123',
        iceConfiguration: { iceServers: [] }
      };

      const mockHubSpotEngagement = {
        id: 'engagement-123'
      };

      twilioService.validateWhatsAppNumber.mockResolvedValue({
        valid: true,
        number: 'whatsapp:+1987654321'
      });

      webrtcService.createSession.mockResolvedValue(mockWebRTCSession);
      twilioService.initiateWhatsAppCall.mockResolvedValue(mockCallResult);
      hubspotService.createCallEngagement.mockResolvedValue(mockHubSpotEngagement);

      const response = await request(app)
        .post('/api/calls/outbound')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          toNumber: '+1987654321',
          callType: 'voice'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.call).toEqual(
        expect.objectContaining({
          twilioCallSid: 'CA123456789',
          status: 'initiated'
        })
      );
    });

    it('should return 400 for invalid phone number', async () => {
      const response = await request(app)
        .post('/api/calls/outbound')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          toNumber: '',
          callType: 'voice'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/calls/outbound')
        .send({
          toNumber: '+1987654321',
          callType: 'voice'
        });

      expect(response.status).toBe(401);
    });

    it('should handle WhatsApp number validation failure', async () => {
      twilioService.validateWhatsAppNumber.mockResolvedValue({
        valid: false,
        error: 'Invalid number format'
      });

      const response = await request(app)
        .post('/api/calls/outbound')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          toNumber: 'invalid-number',
          callType: 'voice'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid phone number');
    });
  });

  describe('GET /api/calls/:callId/status', () => {
    it('should return call status', async () => {
      const response = await request(app)
        .get('/api/calls/test-call-123/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.callId).toBe('test-call-123');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/calls/test-call-123/status');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/calls/:callId/end', () => {
    it('should end call successfully', async () => {
      const response = await request(app)
        .post('/api/calls/test-call-123/end')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          duration: 120,
          notes: 'Call completed successfully'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('ended');
    });
  });

  describe('POST /api/calls/webrtc/session', () => {
    it('should create WebRTC session', async () => {
      const mockSession = {
        id: 'session-123',
        type: 'voice',
        status: 'created'
      };

      webrtcService.createSession.mockResolvedValue(mockSession);

      const response = await request(app)
        .post('/api/calls/webrtc/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'voice'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.session).toEqual(mockSession);
    });

    it('should validate session type', async () => {
      const response = await request(app)
        .post('/api/calls/webrtc/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/calls/history', () => {
    it('should return call history', async () => {
      const response = await request(app)
        .get('/api/calls/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('calls');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/calls/history?page=2&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(10);
    });
  });
});