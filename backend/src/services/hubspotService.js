const axios = require('axios');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { getClient } = require('../config/redis');

class HubSpotService {
  constructor() {
    this.appId = process.env.HUBSPOT_APP_ID;
    this.clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    this.scopes = process.env.HUBSPOT_SCOPES || 'contacts,calling';
    this.baseURL = 'https://api.hubapi.com';
  }

  /**
   * Generate OAuth URL for HubSpot authorization
   */
  generateOAuthUrl(redirectUri, state) {
    const params = new URLSearchParams({
      client_id: this.appId,
      scope: this.scopes,
      redirect_uri: redirectUri,
      state: state || 'random-state'
    });

    return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForTokens(code, redirectUri) {
    try {
      const response = await axios.post('https://api.hubapi.com/oauth/v1/token', {
        grant_type: 'authorization_code',
        client_id: this.appId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        code
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokens = response.data;
      logger.info('Successfully exchanged code for tokens');
      
      return tokens;
    } catch (error) {
      logger.error('Failed to exchange code for tokens:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code');
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios.post('https://api.hubapi.com/oauth/v1/token', {
        grant_type: 'refresh_token',
        client_id: this.appId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to refresh access token:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Get contact information from HubSpot
   */
  async getContact(contactId, accessToken) {
    try {
      const response = await axios.get(
        `${this.baseURL}/crm/v3/objects/contacts/${contactId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            properties: 'email,firstname,lastname,phone,mobilephone,whatsapp_number'
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get contact:', error.response?.data || error.message);
      throw new Error('Failed to fetch contact information');
    }
  }

  /**
   * Search for contacts by phone number
   */
  async searchContactByPhone(phoneNumber, accessToken) {
    try {
      const response = await axios.post(
        `${this.baseURL}/crm/v3/objects/contacts/search`,
        {
          filterGroups: [{
            filters: [
              {
                propertyName: 'phone',
                operator: 'EQ',
                value: phoneNumber
              },
              {
                propertyName: 'mobilephone',
                operator: 'EQ',
                value: phoneNumber
              }
            ]
          }],
          properties: ['email', 'firstname', 'lastname', 'phone', 'mobilephone', 'whatsapp_number']
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.results[0] || null;
    } catch (error) {
      logger.error('Failed to search contact by phone:', error.response?.data || error.message);
      throw new Error('Failed to search for contact');
    }
  }

  /**
   * Create a call engagement in HubSpot
   */
  async createCallEngagement(callData, accessToken) {
    try {
      const engagement = {
        properties: {
          hs_timestamp: Date.now(),
          hs_call_duration: callData.duration || 0,
          hs_call_status: callData.status || 'COMPLETED',
          hs_call_direction: callData.direction || 'OUTBOUND',
          hs_call_from_number: callData.fromNumber,
          hs_call_to_number: callData.toNumber,
          hs_call_recording_url: callData.recordingUrl || '',
          hs_call_notes: callData.notes || 'WhatsApp Business Call',
          hs_call_source: 'WHATSAPP_INTEGRATION'
        }
      };

      const response = await axios.post(
        `${this.baseURL}/crm/v3/objects/calls`,
        engagement,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Associate with contact if contactId is provided
      if (callData.contactId) {
        await this.associateCallWithContact(
          response.data.id,
          callData.contactId,
          accessToken
        );
      }

      logger.info(`Call engagement created: ${response.data.id}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to create call engagement:', error.response?.data || error.message);
      throw new Error('Failed to create call engagement');
    }
  }

  /**
   * Associate call with contact
   */
  async associateCallWithContact(callId, contactId, accessToken) {
    try {
      await axios.put(
        `${this.baseURL}/crm/v3/objects/calls/${callId}/associations/contacts/${contactId}/call_to_contact`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Call ${callId} associated with contact ${contactId}`);
    } catch (error) {
      logger.error('Failed to associate call with contact:', error.response?.data || error.message);
      throw new Error('Failed to associate call with contact');
    }
  }

  /**
   * Update call engagement status
   */
  async updateCallEngagement(callId, updates, accessToken) {
    try {
      const response = await axios.patch(
        `${this.baseURL}/crm/v3/objects/calls/${callId}`,
        {
          properties: updates
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to update call engagement:', error.response?.data || error.message);
      throw new Error('Failed to update call engagement');
    }
  }

  /**
   * Store user tokens in Redis
   */
  async storeUserTokens(userId, tokens) {
    try {
      const redis = getClient();
      const key = `hubspot:tokens:${userId}`;
      
      await redis.setEx(key, 3600, JSON.stringify(tokens)); // 1 hour expiry
      logger.info(`Stored tokens for user: ${userId}`);
    } catch (error) {
      logger.error('Failed to store user tokens:', error);
      throw error;
    }
  }

  /**
   * Get user tokens from Redis
   */
  async getUserTokens(userId) {
    try {
      const redis = getClient();
      const key = `hubspot:tokens:${userId}`;
      
      const tokens = await redis.get(key);
      return tokens ? JSON.parse(tokens) : null;
    } catch (error) {
      logger.error('Failed to get user tokens:', error);
      throw error;
    }
  }

  /**
   * Validate access token
   */
  async validateAccessToken(accessToken) {
    try {
      const response = await axios.get(
        `${this.baseURL}/oauth/v1/access-tokens/${accessToken}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Access token validation failed:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Generate JWT for secure communication with frontend
   */
  generateJWT(payload, expiresIn = '1h') {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  }

  /**
   * Verify JWT token
   */
  verifyJWT(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      logger.error('JWT verification failed:', error);
      return null;
    }
  }
}

module.exports = new HubSpotService();