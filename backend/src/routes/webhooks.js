const express = require('express');
const rateLimit = require('../middleware/rateLimiter');
const { verifyTwilioSignature } = require('../middleware/auth');
const twilioService = require('../services/twilioService');
const hubspotService = require('../services/hubspotService');
const logger = require('../utils/logger');
const twilio = require('twilio');

const router = express.Router();

// Middleware to capture raw body for Twilio signature verification
router.use('/twilio/*', express.raw({ type: 'application/x-www-form-urlencoded' }));

/**
 * @route POST /api/webhooks/twilio/voice
 * @desc Handle incoming Twilio voice webhook
 * @access Public (verified by Twilio signature)
 */
router.post('/twilio/voice',
  rateLimit.webhook,
  // verifyTwilioSignature, // Uncomment in production
  async (req, res) => {
    try {
      logger.info('Received Twilio voice webhook');
      
      const VoiceResponse = twilio.twiml.VoiceResponse;
      const response = new VoiceResponse();
      
      // Parse the webhook data
      const callData = {
        callSid: req.body.CallSid,
        from: req.body.From,
        to: req.body.To,
        callStatus: req.body.CallStatus,
        direction: req.body.Direction
      };
      
      logger.info('Voice webhook data:', callData);
      
      // Handle incoming WhatsApp call
      if (callData.direction === 'inbound' && callData.from.startsWith('whatsapp:')) {
        // This is an incoming WhatsApp call
        response.say('Please hold while we connect you to an agent.');
        
        // Create a conference for the call
        const dial = response.dial();
        dial.conference(`whatsapp-call-${callData.callSid}`, {
          startConferenceOnEnter: false,
          endConferenceOnExit: true,
          waitUrl: '/api/webhooks/twilio/wait-music'
        });
        
        // Emit event to notify available agents
        if (req.io) {
          req.io.emit('inbound:whatsapp-call', {
            callSid: callData.callSid,
            from: callData.from,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        // Handle outbound call connection
        const conferenceName = req.query.conference;
        if (conferenceName) {
          const dial = response.dial();
          dial.conference(conferenceName, {
            startConferenceOnEnter: true,
            endConferenceOnExit: false
          });
        } else {
          response.say('Call connected.');
        }
      }
      
      res.type('text/xml');
      res.send(response.toString());

    } catch (error) {
      logger.error('Twilio voice webhook error:', error);
      
      const VoiceResponse = twilio.twiml.VoiceResponse;
      const errorResponse = new VoiceResponse();
      errorResponse.say('Sorry, there was an error processing your call. Please try again later.');
      
      res.type('text/xml');
      res.send(errorResponse.toString());
    }
  }
);

/**
 * @route POST /api/webhooks/twilio/status
 * @desc Handle Twilio call status updates
 * @access Public (verified by Twilio signature)
 */
router.post('/twilio/status',
  rateLimit.webhook,
  // verifyTwilioSignature, // Uncomment in production
  async (req, res) => {
    try {
      logger.info('Received Twilio status webhook');
      
      const statusData = {
        callSid: req.body.CallSid,
        callStatus: req.body.CallStatus,
        from: req.body.From,
        to: req.body.To,
        duration: req.body.CallDuration,
        timestamp: req.body.Timestamp
      };
      
      logger.info('Call status update:', statusData);
      
      // Emit status update to connected clients
      if (req.io) {
        req.io.emit('call:status-update', statusData);
      }
      
      // Update HubSpot engagement if call is completed
      if (statusData.callStatus === 'completed') {
        // In a real implementation, you'd:
        // 1. Look up the call in your database
        // 2. Get the associated HubSpot engagement ID
        // 3. Update the engagement with final call details
        
        logger.info(`Call completed: ${statusData.callSid}, duration: ${statusData.duration}s`);
      }
      
      res.sendStatus(200);

    } catch (error) {
      logger.error('Twilio status webhook error:', error);
      res.sendStatus(500);
    }
  }
);

/**
 * @route POST /api/webhooks/twilio/conference
 * @desc Handle Twilio conference events
 * @access Public (verified by Twilio signature)
 */
router.post('/twilio/conference',
  rateLimit.webhook,
  // verifyTwilioSignature, // Uncomment in production
  async (req, res) => {
    try {
      logger.info('Received Twilio conference webhook');
      
      const conferenceData = {
        conferenceSid: req.body.ConferenceSid,
        friendlyName: req.body.FriendlyName,
        status: req.body.StatusCallbackEvent,
        timestamp: req.body.Timestamp
      };
      
      logger.info('Conference event:', conferenceData);
      
      // Emit conference event to connected clients
      if (req.io) {
        req.io.emit('conference:event', conferenceData);
      }
      
      res.sendStatus(200);

    } catch (error) {
      logger.error('Twilio conference webhook error:', error);
      res.sendStatus(500);
    }
  }
);

/**
 * @route POST /api/webhooks/twilio/conference/:conferenceSid/join
 * @desc TwiML to join a specific conference
 * @access Public
 */
router.post('/twilio/conference/:conferenceSid/join',
  async (req, res) => {
    try {
      const { conferenceSid } = req.params;
      
      const twiml = twilioService.generateConferenceTwiML(conferenceSid, {
        startConferenceOnEnter: true,
        endConferenceOnExit: false,
        record: 'record-from-start'
      });
      
      res.type('text/xml');
      res.send(twiml);

    } catch (error) {
      logger.error('Conference join error:', error);
      
      const VoiceResponse = twilio.twiml.VoiceResponse;
      const errorResponse = new VoiceResponse();
      errorResponse.say('Sorry, there was an error joining the conference.');
      
      res.type('text/xml');
      res.send(errorResponse.toString());
    }
  }
);

/**
 * @route POST /api/webhooks/twilio/wait-music
 * @desc Provide hold music for waiting callers
 * @access Public
 */
router.post('/twilio/wait-music',
  async (req, res) => {
    try {
      const VoiceResponse = twilio.twiml.VoiceResponse;
      const response = new VoiceResponse();
      
      response.play('http://com.twilio.music.classical.s3.amazonaws.com/BusyStrings.wav');
      
      res.type('text/xml');
      res.send(response.toString());

    } catch (error) {
      logger.error('Wait music error:', error);
      res.sendStatus(500);
    }
  }
);

/**
 * @route POST /api/webhooks/twilio/recording
 * @desc Handle call recording webhooks
 * @access Public (verified by Twilio signature)
 */
router.post('/twilio/recording',
  rateLimit.webhook,
  // verifyTwilioSignature, // Uncomment in production
  async (req, res) => {
    try {
      logger.info('Received Twilio recording webhook');
      
      const recordingData = {
        recordingSid: req.body.RecordingSid,
        recordingUrl: req.body.RecordingUrl,
        callSid: req.body.CallSid,
        duration: req.body.RecordingDuration,
        status: req.body.RecordingStatus
      };
      
      logger.info('Recording data:', recordingData);
      
      // In a real implementation, you'd:
      // 1. Store the recording URL in your database
      // 2. Update the associated HubSpot engagement
      // 3. Potentially upload the recording to HubSpot or your own storage
      
      res.sendStatus(200);

    } catch (error) {
      logger.error('Twilio recording webhook error:', error);
      res.sendStatus(500);
    }
  }
);

/**
 * @route POST /api/webhooks/hubspot/calling
 * @desc Handle HubSpot calling events (if needed)
 * @access Public
 */
router.post('/hubspot/calling',
  rateLimit.webhook,
  async (req, res) => {
    try {
      logger.info('Received HubSpot calling webhook');
      logger.info('HubSpot webhook data:', req.body);
      
      // Handle HubSpot calling events if needed
      // This could be used for additional integration points
      
      res.sendStatus(200);

    } catch (error) {
      logger.error('HubSpot calling webhook error:', error);
      res.sendStatus(500);
    }
  }
);

module.exports = router;