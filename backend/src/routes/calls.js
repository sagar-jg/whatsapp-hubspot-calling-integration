const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('../middleware/rateLimiter');
const { verifyToken, verifyHubSpotToken } = require('../middleware/auth');
const twilioService = require('../services/twilioService');
const hubspotService = require('../services/hubspotService');
const webrtcService = require('../services/webrtcService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/**
 * @route POST /api/calls/outbound
 * @desc Initiate an outbound WhatsApp call
 * @access Private
 */
router.post('/outbound',
  rateLimit.call,
  verifyToken,
  verifyHubSpotToken,
  [
    body('toNumber').notEmpty().withMessage('Phone number is required'),
    body('contactId').optional().isString(),
    body('callType').optional().isIn(['voice', 'video']).withMessage('Invalid call type')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { toNumber, contactId, callType = 'voice' } = req.body;
      const { userId } = req.user;
      const { access_token } = req.hubspotTokens;

      logger.info(`Initiating outbound call from user ${userId} to ${toNumber}`);

      // Validate WhatsApp number
      const validation = await twilioService.validateWhatsAppNumber(toNumber);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid phone number',
          details: validation.error
        });
      }

      // Get contact information if contactId provided
      let contact = null;
      if (contactId) {
        try {
          contact = await hubspotService.getContact(contactId, access_token);
        } catch (error) {
          logger.warn(`Failed to fetch contact ${contactId}:`, error.message);
        }
      } else {
        // Try to find contact by phone number
        try {
          contact = await hubspotService.searchContactByPhone(toNumber, access_token);
        } catch (error) {
          logger.warn(`Failed to search contact by phone ${toNumber}:`, error.message);
        }
      }

      // Create WebRTC session for the call
      const webrtcSession = await webrtcService.createSession(userId, callType);

      // Initiate the WhatsApp call through Twilio
      const callResult = await twilioService.initiateWhatsAppCall(validation.number, null, {
        record: true,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
      });

      // Create call engagement in HubSpot
      const callData = {
        direction: 'OUTBOUND',
        fromNumber: twilioService.whatsappNumber,
        toNumber: validation.number,
        contactId: contact?.id,
        status: 'INITIATED',
        duration: 0,
        notes: `WhatsApp call initiated via integration at ${new Date().toISOString()}`
      };

      let hubspotEngagement = null;
      try {
        hubspotEngagement = await hubspotService.createCallEngagement(callData, access_token);
      } catch (error) {
        logger.error('Failed to create HubSpot engagement:', error);
      }

      // Store call information for tracking
      const callInfo = {
        id: callResult.callId,
        twilioCallSid: callResult.twilioCallSid,
        webrtcSessionId: webrtcSession.id,
        hubspotEngagementId: hubspotEngagement?.id,
        userId,
        contactId: contact?.id,
        toNumber: validation.number,
        fromNumber: twilioService.whatsappNumber,
        status: 'initiated',
        type: callType,
        createdAt: new Date().toISOString()
      };

      // Emit call initiated event to connected clients
      req.io.to(`user:${userId}`).emit('call:initiated', callInfo);

      res.status(201).json({
        success: true,
        call: callInfo,
        contact: contact ? {
          id: contact.id,
          name: `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim(),
          email: contact.properties.email,
          phone: contact.properties.phone
        } : null,
        webrtc: {
          sessionId: webrtcSession.id,
          iceConfiguration: webrtcSession.iceConfiguration
        }
      });

    } catch (error) {
      logger.error('Failed to initiate outbound call:', error);
      res.status(500).json({
        error: 'Call initiation failed',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/calls/:callId/status
 * @desc Get call status
 * @access Private
 */
router.get('/:callId/status',
  verifyToken,
  async (req, res) => {
    try {
      const { callId } = req.params;
      const { userId } = req.user;

      // In a real implementation, you'd retrieve this from your database
      // For now, we'll get it from Twilio directly
      logger.info(`Getting status for call ${callId}`);

      res.json({
        callId,
        status: 'in-progress', // This would come from your database
        duration: 0,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get call status:', error);
      res.status(500).json({
        error: 'Failed to get call status',
        details: error.message
      });
    }
  }
);

/**
 * @route POST /api/calls/:callId/end
 * @desc End a call
 * @access Private
 */
router.post('/:callId/end',
  verifyToken,
  async (req, res) => {
    try {
      const { callId } = req.params;
      const { userId } = req.user;
      const { duration, notes } = req.body;

      logger.info(`Ending call ${callId} for user ${userId}`);

      // In a real implementation, you'd:
      // 1. Get call details from database
      // 2. End the Twilio call
      // 3. Update HubSpot engagement
      // 4. Clean up WebRTC session

      // Emit call ended event
      req.io.to(`user:${userId}`).emit('call:ended', {
        callId,
        duration: duration || 0,
        endedAt: new Date().toISOString()
      });

      res.json({
        success: true,
        callId,
        status: 'ended',
        endedAt: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to end call:', error);
      res.status(500).json({
        error: 'Failed to end call',
        details: error.message
      });
    }
  }
);

/**
 * @route POST /api/calls/webrtc/session
 * @desc Create WebRTC session
 * @access Private
 */
router.post('/webrtc/session',
  verifyToken,
  [
    body('type').optional().isIn(['voice', 'video']).withMessage('Invalid session type')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { type = 'voice' } = req.body;
      const { userId } = req.user;

      const session = await webrtcService.createSession(userId, type);
      
      res.status(201).json({
        success: true,
        session
      });

    } catch (error) {
      logger.error('Failed to create WebRTC session:', error);
      res.status(500).json({
        error: 'Failed to create WebRTC session',
        details: error.message
      });
    }
  }
);

/**
 * @route POST /api/calls/webrtc/session/:sessionId/join
 * @desc Join WebRTC session
 * @access Private
 */
router.post('/webrtc/session/:sessionId/join',
  verifyToken,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { userId } = req.user;
      const { socketId } = req.body;

      const session = await webrtcService.joinSession(sessionId, userId, socketId);
      
      // Notify other participants
      req.io.to(`session:${sessionId}`).emit('participant:joined', {
        sessionId,
        userId,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        session
      });

    } catch (error) {
      logger.error('Failed to join WebRTC session:', error);
      res.status(500).json({
        error: 'Failed to join WebRTC session',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/calls/history
 * @desc Get call history for user
 * @access Private
 */
router.get('/history',
  verifyToken,
  async (req, res) => {
    try {
      const { userId } = req.user;
      const { page = 1, limit = 20 } = req.query;

      // In a real implementation, you'd fetch from your database
      // For now, return mock data
      const mockHistory = {
        calls: [],
        total: 0,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: 0
      };

      res.json(mockHistory);

    } catch (error) {
      logger.error('Failed to get call history:', error);
      res.status(500).json({
        error: 'Failed to get call history',
        details: error.message
      });
    }
  }
);

module.exports = router;