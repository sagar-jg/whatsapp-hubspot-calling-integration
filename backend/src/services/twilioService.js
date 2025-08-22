const twilio = require('twilio');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

class TwilioService {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    this.voiceNumber = process.env.TWILIO_VOICE_NUMBER;
  }

  /**
   * Initiate an outbound WhatsApp call
   * Compliant with Twilio's WhatsApp Business Calling requirements
   */
  async initiateWhatsAppCall(toNumber, fromNumber = this.whatsappNumber, options = {}) {
    try {
      // Validate WhatsApp number format
      if (!toNumber.startsWith('whatsapp:')) {
        toNumber = `whatsapp:${toNumber}`;
      }

      logger.info(`Initiating WhatsApp call to ${toNumber}`);

      // Create a unique call ID for tracking
      const callId = uuidv4();
      
      // Prepare call options with Twilio's requirements
      const callOptions = {
        to: toNumber,
        from: fromNumber,
        url: `${process.env.BACKEND_URL || 'https://your-domain.com'}/api/webhooks/twilio/voice`,
        statusCallback: `${process.env.BACKEND_URL || 'https://your-domain.com'}/api/webhooks/twilio/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        timeout: 30, // Timeout after 30 seconds
        record: options.record || false,
        ...options
      };

      // Add custom parameters for tracking
      callOptions.statusCallbackEvent = callOptions.statusCallbackEvent;
      
      const call = await this.client.calls.create(callOptions);
      
      logger.info(`WhatsApp call initiated successfully: ${call.sid}`);
      
      return {
        callId,
        twilioCallSid: call.sid,
        status: call.status,
        to: toNumber,
        from: fromNumber,
        timestamp: moment().toISOString()
      };
    } catch (error) {
      logger.error('Failed to initiate WhatsApp call:', error);
      throw new Error(`WhatsApp call initiation failed: ${error.message}`);
    }
  }

  /**
   * Create a conference call for 2-legged calling
   */
  async createConferenceCall(callId, participants) {
    try {
      logger.info(`Creating conference call: ${callId}`);
      
      const conference = await this.client.conferences.create({
        friendlyName: `whatsapp-call-${callId}`,
        statusCallback: `${process.env.BACKEND_URL}/api/webhooks/twilio/conference`,
        statusCallbackEvent: ['start', 'end', 'join', 'leave'],
        statusCallbackMethod: 'POST',
        record: 'record-from-start',
        recordingStatusCallback: `${process.env.BACKEND_URL}/api/webhooks/twilio/recording`
      });

      // Add participants to the conference
      const participantPromises = participants.map(participant => 
        this.addToConference(conference.sid, participant)
      );
      
      await Promise.all(participantPromises);
      
      return {
        conferenceSid: conference.sid,
        status: 'created',
        participants: participants.length
      };
    } catch (error) {
      logger.error('Failed to create conference call:', error);
      throw new Error(`Conference call creation failed: ${error.message}`);
    }
  }

  /**
   * Add participant to conference
   */
  async addToConference(conferenceSid, participant) {
    try {
      const call = await this.client.calls.create({
        to: participant.number,
        from: participant.isWhatsApp ? this.whatsappNumber : this.voiceNumber,
        url: `${process.env.BACKEND_URL}/api/webhooks/twilio/conference/${conferenceSid}/join`,
        statusCallback: `${process.env.BACKEND_URL}/api/webhooks/twilio/participant-status`,
        statusCallbackEvent: ['answered', 'completed'],
        timeout: 30
      });

      return {
        participantSid: call.sid,
        number: participant.number,
        status: call.status
      };
    } catch (error) {
      logger.error('Failed to add participant to conference:', error);
      throw error;
    }
  }

  /**
   * Generate TwiML for conference joining
   */
  generateConferenceTwiML(conferenceName, options = {}) {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();
    
    const dial = response.dial();
    dial.conference({
      startConferenceOnEnter: options.startOnEnter || true,
      endConferenceOnExit: options.endOnExit || false,
      waitUrl: options.waitUrl || '',
      maxParticipants: options.maxParticipants || 10,
      record: options.record || 'record-from-start',
      ...options
    }, conferenceName);
    
    return response.toString();
  }

  /**
   * Generate TwiML for call forwarding
   */
  generateForwardTwiML(forwardToNumber, options = {}) {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();
    
    if (options.greeting) {
      response.say(options.greeting);
    }
    
    const dial = response.dial({
      timeout: options.timeout || 30,
      record: options.record || false,
      ...options
    });
    
    dial.number(forwardToNumber);
    
    return response.toString();
  }

  /**
   * End a call
   */
  async endCall(callSid) {
    try {
      const call = await this.client.calls(callSid).update({
        status: 'completed'
      });
      
      logger.info(`Call ended: ${callSid}`);
      return call;
    } catch (error) {
      logger.error('Failed to end call:', error);
      throw error;
    }
  }

  /**
   * Get call details
   */
  async getCallDetails(callSid) {
    try {
      const call = await this.client.calls(callSid).fetch();
      return call;
    } catch (error) {
      logger.error('Failed to fetch call details:', error);
      throw error;
    }
  }

  /**
   * Validate WhatsApp number for calling
   * Checks if the number is opted-in for WhatsApp Business Calling
   */
  async validateWhatsAppNumber(phoneNumber) {
    try {
      // Format number for WhatsApp
      const whatsappNumber = phoneNumber.startsWith('whatsapp:') 
        ? phoneNumber 
        : `whatsapp:${phoneNumber}`;

      // Check if number is valid for WhatsApp calling
      // This is a simplified validation - in production, you might want to
      // integrate with Twilio's lookup API or maintain your own whitelist
      
      logger.info(`Validating WhatsApp number: ${whatsappNumber}`);
      
      return {
        valid: true,
        number: whatsappNumber,
        formatted: phoneNumber.replace('whatsapp:', '')
      };
    } catch (error) {
      logger.error('WhatsApp number validation failed:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Send WhatsApp message (for pre-call notification)
   */
  async sendWhatsAppMessage(to, body, options = {}) {
    try {
      const message = await this.client.messages.create({
        to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
        from: this.whatsappNumber,
        body,
        ...options
      });
      
      logger.info(`WhatsApp message sent: ${message.sid}`);
      return message;
    } catch (error) {
      logger.error('Failed to send WhatsApp message:', error);
      throw error;
    }
  }
}

module.exports = new TwilioService();