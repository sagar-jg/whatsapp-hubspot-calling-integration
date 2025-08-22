const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Create different rate limiters for different endpoints
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests',
      details: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}, endpoint: ${req.path}`);
      res.status(429).json({
        error: 'Too many requests',
        details: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    }
  });
};

// General rate limiter
const generalLimiter = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per window
  'Too many requests from this IP, please try again later'
);

// Strict rate limiter for call initiation
const callLimiter = createRateLimiter(
  5 * 60 * 1000, // 5 minutes
  10, // 10 calls per 5 minutes
  'Too many call attempts, please wait before trying again'
);

// Auth rate limiter
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 auth attempts per 15 minutes
  'Too many authentication attempts, please try again later'
);

// Webhook rate limiter (more lenient for Twilio)
const webhookLimiter = createRateLimiter(
  1 * 60 * 1000, // 1 minute
  100, // 100 webhook calls per minute
  'Too many webhook requests'
);

module.exports = {
  general: generalLimiter,
  call: callLimiter,
  auth: authLimiter,
  webhook: webhookLimiter
};