const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('../middleware/rateLimiter');
const { verifyToken } = require('../middleware/auth');
const hubspotService = require('../services/hubspotService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/**
 * @route POST /api/auth/hubspot/oauth-url
 * @desc Generate HubSpot OAuth authorization URL
 * @access Public
 */
router.post('/hubspot/oauth-url',
  rateLimit.auth,
  [
    body('redirectUri').isURL().withMessage('Valid redirect URI is required'),
    body('state').optional().isString()
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

      const { redirectUri, state } = req.body;
      const authState = state || uuidv4();
      
      const oauthUrl = hubspotService.generateOAuthUrl(redirectUri, authState);
      
      logger.info('Generated HubSpot OAuth URL');
      
      res.json({
        success: true,
        authUrl: oauthUrl,
        state: authState
      });

    } catch (error) {
      logger.error('Failed to generate OAuth URL:', error);
      res.status(500).json({
        error: 'Failed to generate OAuth URL',
        details: error.message
      });
    }
  }
);

/**
 * @route POST /api/auth/hubspot/callback
 * @desc Handle HubSpot OAuth callback
 * @access Public
 */
router.post('/hubspot/callback',
  rateLimit.auth,
  [
    body('code').notEmpty().withMessage('Authorization code is required'),
    body('redirectUri').isURL().withMessage('Valid redirect URI is required'),
    body('state').optional().isString()
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

      const { code, redirectUri, state } = req.body;
      
      logger.info('Processing HubSpot OAuth callback');
      
      // Exchange code for tokens
      const tokens = await hubspotService.exchangeCodeForTokens(code, redirectUri);
      
      // Generate user ID (in production, this might come from HubSpot user info)
      const userId = uuidv4();
      
      // Store tokens
      await hubspotService.storeUserTokens(userId, tokens);
      
      // Generate JWT for the user
      const jwtToken = hubspotService.generateJWT({
        userId,
        hubspotConnected: true,
        tokenExpiry: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null
      });
      
      logger.info(`HubSpot OAuth completed for user: ${userId}`);
      
      res.json({
        success: true,
        token: jwtToken,
        userId,
        expiresIn: tokens.expires_in,
        scopes: tokens.scope?.split(' ') || []
      });

    } catch (error) {
      logger.error('OAuth callback failed:', error);
      res.status(400).json({
        error: 'OAuth callback failed',
        details: error.message
      });
    }
  }
);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh user tokens
 * @access Private
 */
router.post('/refresh',
  verifyToken,
  async (req, res) => {
    try {
      const { userId } = req.user;
      
      // Get stored tokens
      const storedTokens = await hubspotService.getUserTokens(userId);
      if (!storedTokens || !storedTokens.refresh_token) {
        return res.status(401).json({
          error: 'No refresh token available',
          details: 'Please reconnect your HubSpot account'
        });
      }
      
      // Refresh tokens
      const newTokens = await hubspotService.refreshAccessToken(storedTokens.refresh_token);
      
      // Store new tokens
      await hubspotService.storeUserTokens(userId, {
        ...storedTokens,
        ...newTokens
      });
      
      // Generate new JWT
      const jwtToken = hubspotService.generateJWT({
        userId,
        hubspotConnected: true,
        tokenExpiry: newTokens.expires_in ? Date.now() + (newTokens.expires_in * 1000) : null
      });
      
      logger.info(`Tokens refreshed for user: ${userId}`);
      
      res.json({
        success: true,
        token: jwtToken,
        expiresIn: newTokens.expires_in
      });

    } catch (error) {
      logger.error('Token refresh failed:', error);
      res.status(401).json({
        error: 'Token refresh failed',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/auth/me
 * @desc Get current user information
 * @access Private
 */
router.get('/me',
  verifyToken,
  async (req, res) => {
    try {
      const { userId } = req.user;
      
      // Get user tokens to check HubSpot connection status
      const tokens = await hubspotService.getUserTokens(userId);
      const hubspotConnected = !!tokens;
      
      let hubspotInfo = null;
      if (hubspotConnected) {
        try {
          // Validate token and get user info
          const tokenInfo = await hubspotService.validateAccessToken(tokens.access_token);
          if (tokenInfo) {
            hubspotInfo = {
              connectedAt: tokenInfo.created_at,
              scopes: tokenInfo.scopes || [],
              hubId: tokenInfo.hub_id
            };
          }
        } catch (error) {
          logger.warn('Failed to get HubSpot info:', error.message);
        }
      }
      
      res.json({
        userId,
        hubspotConnected,
        hubspotInfo,
        connectedAt: req.user.iat ? new Date(req.user.iat * 1000).toISOString() : null
      });

    } catch (error) {
      logger.error('Failed to get user info:', error);
      res.status(500).json({
        error: 'Failed to get user information',
        details: error.message
      });
    }
  }
);

/**
 * @route POST /api/auth/disconnect
 * @desc Disconnect HubSpot account
 * @access Private
 */
router.post('/disconnect',
  verifyToken,
  async (req, res) => {
    try {
      const { userId } = req.user;
      
      // Remove stored tokens
      // In a real implementation, you'd also revoke the tokens with HubSpot
      const redis = require('../config/redis').getClient();
      await redis.del(`hubspot:tokens:${userId}`);
      
      logger.info(`HubSpot disconnected for user: ${userId}`);
      
      res.json({
        success: true,
        message: 'HubSpot account disconnected'
      });

    } catch (error) {
      logger.error('Failed to disconnect HubSpot:', error);
      res.status(500).json({
        error: 'Failed to disconnect HubSpot account',
        details: error.message
      });
    }
  }
);

/**
 * @route POST /api/auth/validate-token
 * @desc Validate JWT token
 * @access Public
 */
router.post('/validate-token',
  [
    body('token').notEmpty().withMessage('Token is required')
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

      const { token } = req.body;
      
      const decoded = hubspotService.verifyJWT(token);
      if (!decoded) {
        return res.status(401).json({
          valid: false,
          error: 'Invalid token'
        });
      }
      
      res.json({
        valid: true,
        userId: decoded.userId,
        expiresAt: new Date(decoded.exp * 1000).toISOString()
      });

    } catch (error) {
      logger.error('Token validation failed:', error);
      res.status(401).json({
        valid: false,
        error: 'Token validation failed'
      });
    }
  }
);

module.exports = router;