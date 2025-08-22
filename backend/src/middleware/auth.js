const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const hubspotService = require('../services/hubspotService');

/**
 * Middleware to verify JWT tokens
 */
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Access denied', 
      details: 'No token provided' 
    });
  }

  try {
    const decoded = hubspotService.verifyJWT(token);
    if (!decoded) {
      return res.status(401).json({ 
        error: 'Invalid token', 
        details: 'Token verification failed' 
      });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    res.status(401).json({ 
      error: 'Invalid token', 
      details: 'Token verification failed' 
    });
  }
};

/**
 * Middleware to verify HubSpot access token
 */
const verifyHubSpotToken = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const tokens = await hubspotService.getUserTokens(userId);
    
    if (!tokens) {
      return res.status(401).json({ 
        error: 'HubSpot not connected', 
        details: 'Please connect your HubSpot account' 
      });
    }

    // Validate the access token
    const tokenInfo = await hubspotService.validateAccessToken(tokens.access_token);
    
    if (!tokenInfo) {
      // Try to refresh the token
      try {
        const newTokens = await hubspotService.refreshAccessToken(tokens.refresh_token);
        await hubspotService.storeUserTokens(userId, newTokens);
        req.hubspotTokens = newTokens;
      } catch (refreshError) {
        logger.error('Token refresh failed:', refreshError);
        return res.status(401).json({ 
          error: 'HubSpot token expired', 
          details: 'Please reconnect your HubSpot account' 
        });
      }
    } else {
      req.hubspotTokens = tokens;
    }
    
    next();
  } catch (error) {
    logger.error('HubSpot token verification failed:', error);
    res.status(401).json({ 
      error: 'HubSpot authentication failed', 
      details: 'Please reconnect your HubSpot account' 
    });
  }
};

/**
 * Middleware for optional authentication
 */
const optionalAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (token) {
    try {
      const decoded = hubspotService.verifyJWT(token);
      if (decoded) {
        req.user = decoded;
      }
    } catch (error) {
      // Ignore token errors for optional auth
      logger.warn('Optional auth token verification failed:', error.message);
    }
  }
  
  next();
};

/**
 * Middleware to validate Twilio webhook signatures
 */
const verifyTwilioSignature = (req, res, next) => {
  const twilio = require('twilio');
  
  const signature = req.header('X-Twilio-Signature');
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const body = req.rawBody || req.body;
  
  try {
    const isValid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      signature,
      url,
      body
    );
    
    if (!isValid) {
      logger.warn('Invalid Twilio signature');
      return res.status(403).json({ 
        error: 'Forbidden', 
        details: 'Invalid signature' 
      });
    }
    
    next();
  } catch (error) {
    logger.error('Twilio signature verification failed:', error);
    res.status(403).json({ 
      error: 'Forbidden', 
      details: 'Signature verification failed' 
    });
  }
};

module.exports = {
  verifyToken,
  verifyHubSpotToken,
  optionalAuth,
  verifyTwilioSignature
};