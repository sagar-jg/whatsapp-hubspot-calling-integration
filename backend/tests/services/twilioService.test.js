const twilioService = require('../../src/services/twilioService');
const twilio = require('twilio');

// Mock Twilio
jest.mock('twilio');

describe('TwilioService', () => {
  let mockTwilioClient;

  beforeEach(() => {
    mockTwilioClient = {
      calls: {
        create: jest.fn(),
        list: jest.fn()
      },
      messages: {
        create: jest.fn()
      },
      conferences: {
        create: jest.fn()
      }
    };
    
    twilio.mockReturnValue(mockTwilioClient);
    
    // Reset environment variables
    process.env.TWILIO_ACCOUNT_SID = 'test_account_sid';
    process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
    process.env.TWILIO_WHATSAPP_NUMBER = 'whatsapp:+1234567890';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateWhatsAppCall', () => {
    it('should initiate a WhatsApp call successfully', async () => {
      const mockCallResponse = {
        sid: 'CA123456789',
        status: 'queued',
        to: 'whatsapp:+1987654321',
        from: 'whatsapp:+1234567890'
      };

      mockTwilioClient.calls.create.mockResolvedValue(mockCallResponse);

      const result = await twilioService.initiateWhatsAppCall('+1987654321');

      expect(mockTwilioClient.calls.create).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'whatsapp:+1987654321',
          from: 'whatsapp:+1234567890'
        })
      );

      expect(result).toEqual(
        expect.objectContaining({
          twilioCallSid: 'CA123456789',
          status: 'queued',
          to: 'whatsapp:+1987654321'
        })
      );
    });

    it('should format phone number correctly', async () => {
      const mockCallResponse = {
        sid: 'CA123456789',
        status: 'queued'
      };

      mockTwilioClient.calls.create.mockResolvedValue(mockCallResponse);

      await twilioService.initiateWhatsAppCall('1987654321');

      expect(mockTwilioClient.calls.create).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'whatsapp:1987654321'
        })
      );
    });

    it('should handle Twilio API errors', async () => {
      const error = new Error('Twilio API Error');
      mockTwilioClient.calls.create.mockRejectedValue(error);

      await expect(
        twilioService.initiateWhatsAppCall('+1987654321')
      ).rejects.toThrow('WhatsApp call initiation failed: Twilio API Error');
    });
  });

  describe('createConferenceCall', () => {
    it('should create a conference call successfully', async () => {
      const mockConferenceResponse = {
        sid: 'CF123456789',
        friendlyName: 'whatsapp-call-test'
      };

      const mockCallResponse = {
        sid: 'CA123456789'
      };

      mockTwilioClient.conferences.create.mockResolvedValue(mockConferenceResponse);
      mockTwilioClient.calls.create.mockResolvedValue(mockCallResponse);

      const participants = [
        { number: 'whatsapp:+1987654321', isWhatsApp: true },
        { number: '+1234567890', isWhatsApp: false }
      ];

      const result = await twilioService.createConferenceCall('test-call-id', participants);

      expect(mockTwilioClient.conferences.create).toHaveBeenCalled();
      expect(mockTwilioClient.calls.create).toHaveBeenCalledTimes(2);
      expect(result.conferenceSid).toBe('CF123456789');
    });
  });

  describe('generateConferenceTwiML', () => {
    it('should generate valid conference TwiML', () => {
      const twiml = twilioService.generateConferenceTwiML('test-conference', {
        startOnEnter: true,
        endOnExit: false
      });

      expect(twiml).toContain('<Conference');
      expect(twiml).toContain('test-conference');
      expect(twiml).toContain('startConferenceOnEnter="true"');
    });
  });

  describe('validateWhatsAppNumber', () => {
    it('should validate WhatsApp number format', async () => {
      const result = await twilioService.validateWhatsAppNumber('+1987654321');

      expect(result.valid).toBe(true);
      expect(result.number).toBe('whatsapp:+1987654321');
      expect(result.formatted).toBe('+1987654321');
    });

    it('should handle already formatted WhatsApp numbers', async () => {
      const result = await twilioService.validateWhatsAppNumber('whatsapp:+1987654321');

      expect(result.valid).toBe(true);
      expect(result.number).toBe('whatsapp:+1987654321');
      expect(result.formatted).toBe('+1987654321');
    });
  });

  describe('sendWhatsAppMessage', () => {
    it('should send WhatsApp message successfully', async () => {
      const mockMessageResponse = {
        sid: 'SM123456789',
        status: 'sent'
      };

      mockTwilioClient.messages.create.mockResolvedValue(mockMessageResponse);

      const result = await twilioService.sendWhatsAppMessage(
        '+1987654321',
        'Test message'
      );

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        to: 'whatsapp:+1987654321',
        from: 'whatsapp:+1234567890',
        body: 'Test message'
      });

      expect(result.sid).toBe('SM123456789');
    });
  });
});