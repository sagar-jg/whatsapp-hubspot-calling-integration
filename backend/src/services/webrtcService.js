const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const { getClient } = require('../config/redis');

class WebRTCService {
  constructor() {
    this.stunServers = (
      process.env.STUN_SERVERS || 
      'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302'
    ).split(',');
    
    this.activeSessions = new Map();
  }

  /**
   * Generate ICE server configuration
   */
  getIceServers() {
    return {
      iceServers: this.stunServers.map(server => ({ urls: server }))
    };
  }

  /**
   * Create a new WebRTC session
   */
  async createSession(userId, type = 'voice') {
    try {
      const sessionId = uuidv4();
      const session = {
        id: sessionId,
        userId,
        type,
        status: 'created',
        createdAt: new Date().toISOString(),
        participants: [],
        iceConfiguration: this.getIceServers()
      };

      this.activeSessions.set(sessionId, session);
      
      // Store in Redis for persistence
      await this.storeSession(sessionId, session);
      
      logger.info(`WebRTC session created: ${sessionId}`);
      return session;
    } catch (error) {
      logger.error('Failed to create WebRTC session:', error);
      throw error;
    }
  }

  /**
   * Join a WebRTC session
   */
  async joinSession(sessionId, userId, socketId) {
    try {
      let session = this.activeSessions.get(sessionId);
      
      if (!session) {
        // Try to load from Redis
        session = await this.getSession(sessionId);
        if (!session) {
          throw new Error('Session not found');
        }
        this.activeSessions.set(sessionId, session);
      }

      const participant = {
        userId,
        socketId,
        joinedAt: new Date().toISOString(),
        status: 'connected'
      };

      session.participants.push(participant);
      session.status = 'active';
      
      await this.storeSession(sessionId, session);
      
      logger.info(`User ${userId} joined session ${sessionId}`);
      return session;
    } catch (error) {
      logger.error('Failed to join session:', error);
      throw error;
    }
  }

  /**
   * Leave a WebRTC session
   */
  async leaveSession(sessionId, userId) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      session.participants = session.participants.filter(
        participant => participant.userId !== userId
      );

      if (session.participants.length === 0) {
        session.status = 'ended';
        this.activeSessions.delete(sessionId);
        await this.deleteSession(sessionId);
        logger.info(`Session ${sessionId} ended - no participants`);
      } else {
        await this.storeSession(sessionId, session);
      }
      
      logger.info(`User ${userId} left session ${sessionId}`);
      return session;
    } catch (error) {
      logger.error('Failed to leave session:', error);
      throw error;
    }
  }

  /**
   * Handle WebRTC signaling
   */
  async handleSignaling(sessionId, userId, signalingData) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const participant = session.participants.find(p => p.userId === userId);
      if (!participant) {
        throw new Error('Participant not found in session');
      }

      logger.info(`Handling signaling for session ${sessionId}, user ${userId}`);
      
      return {
        sessionId,
        userId,
        type: signalingData.type,
        data: signalingData.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to handle signaling:', error);
      throw error;
    }
  }

  /**
   * Create offer for WebRTC connection
   */
  async createOffer(sessionId, userId, offerData) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const offer = {
        sessionId,
        userId,
        type: 'offer',
        sdp: offerData.sdp,
        timestamp: new Date().toISOString()
      };

      logger.info(`Offer created for session ${sessionId}`);
      return offer;
    } catch (error) {
      logger.error('Failed to create offer:', error);
      throw error;
    }
  }

  /**
   * Create answer for WebRTC connection
   */
  async createAnswer(sessionId, userId, answerData) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const answer = {
        sessionId,
        userId,
        type: 'answer',
        sdp: answerData.sdp,
        timestamp: new Date().toISOString()
      };

      logger.info(`Answer created for session ${sessionId}`);
      return answer;
    } catch (error) {
      logger.error('Failed to create answer:', error);
      throw error;
    }
  }

  /**
   * Handle ICE candidates
   */
  async handleIceCandidate(sessionId, userId, candidateData) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const iceCandidate = {
        sessionId,
        userId,
        type: 'ice-candidate',
        candidate: candidateData.candidate,
        sdpMLineIndex: candidateData.sdpMLineIndex,
        sdpMid: candidateData.sdpMid,
        timestamp: new Date().toISOString()
      };

      logger.info(`ICE candidate handled for session ${sessionId}`);
      return iceCandidate;
    } catch (error) {
      logger.error('Failed to handle ICE candidate:', error);
      throw error;
    }
  }

  /**
   * Get session information
   */
  getSessionInfo(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    return session;
  }

  /**
   * Get all active sessions
   */
  getAllActiveSessions() {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Store session in Redis
   */
  async storeSession(sessionId, session) {
    try {
      const redis = getClient();
      const key = `webrtc:session:${sessionId}`;
      await redis.setEx(key, 3600, JSON.stringify(session)); // 1 hour expiry
    } catch (error) {
      logger.error('Failed to store session in Redis:', error);
      throw error;
    }
  }

  /**
   * Get session from Redis
   */
  async getSession(sessionId) {
    try {
      const redis = getClient();
      const key = `webrtc:session:${sessionId}`;
      const session = await redis.get(key);
      return session ? JSON.parse(session) : null;
    } catch (error) {
      logger.error('Failed to get session from Redis:', error);
      return null;
    }
  }

  /**
   * Delete session from Redis
   */
  async deleteSession(sessionId) {
    try {
      const redis = getClient();
      const key = `webrtc:session:${sessionId}`;
      await redis.del(key);
    } catch (error) {
      logger.error('Failed to delete session from Redis:', error);
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      for (const [sessionId, session] of this.activeSessions.entries()) {
        const createdAt = new Date(session.createdAt);
        if (createdAt < oneHourAgo) {
          this.activeSessions.delete(sessionId);
          await this.deleteSession(sessionId);
          logger.info(`Cleaned up expired session: ${sessionId}`);
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
    }
  }
}

module.exports = new WebRTCService();