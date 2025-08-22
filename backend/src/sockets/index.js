const logger = require('../utils/logger');
const webrtcService = require('../services/webrtcService');
const hubspotService = require('../services/hubspotService');

class SocketHandler {
  constructor() {
    this.connectedClients = new Map();
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket, io) {
    logger.info(`New socket connection: ${socket.id}`);

    // Handle authentication
    socket.on('authenticate', async (data) => {
      try {
        const { token } = data;
        
        if (!token) {
          socket.emit('auth:error', { error: 'No token provided' });
          return;
        }

        const decoded = hubspotService.verifyJWT(token);
        if (!decoded) {
          socket.emit('auth:error', { error: 'Invalid token' });
          return;
        }

        // Store user info in socket
        socket.userId = decoded.userId;
        socket.hubspotConnected = decoded.hubspotConnected;
        
        // Join user-specific room
        socket.join(`user:${decoded.userId}`);
        
        // Store client info
        this.connectedClients.set(socket.id, {
          userId: decoded.userId,
          socketId: socket.id,
          connectedAt: new Date().toISOString(),
          hubspotConnected: decoded.hubspotConnected
        });

        socket.emit('auth:success', {
          userId: decoded.userId,
          socketId: socket.id
        });

        logger.info(`User authenticated: ${decoded.userId} (${socket.id})`);
      } catch (error) {
        logger.error('Socket authentication error:', error);
        socket.emit('auth:error', { error: 'Authentication failed' });
      }
    });

    // Handle WebRTC signaling
    socket.on('webrtc:offer', async (data) => {
      try {
        const { sessionId, offer } = data;
        
        if (!socket.userId) {
          socket.emit('error', { error: 'Not authenticated' });
          return;
        }

        const offerData = await webrtcService.createOffer(sessionId, socket.userId, offer);
        
        // Send offer to other participants in the session
        socket.to(`session:${sessionId}`).emit('webrtc:offer', offerData);
        
        logger.info(`WebRTC offer sent for session ${sessionId}`);
      } catch (error) {
        logger.error('WebRTC offer error:', error);
        socket.emit('webrtc:error', { error: 'Failed to send offer' });
      }
    });

    socket.on('webrtc:answer', async (data) => {
      try {
        const { sessionId, answer } = data;
        
        if (!socket.userId) {
          socket.emit('error', { error: 'Not authenticated' });
          return;
        }

        const answerData = await webrtcService.createAnswer(sessionId, socket.userId, answer);
        
        // Send answer to other participants in the session
        socket.to(`session:${sessionId}`).emit('webrtc:answer', answerData);
        
        logger.info(`WebRTC answer sent for session ${sessionId}`);
      } catch (error) {
        logger.error('WebRTC answer error:', error);
        socket.emit('webrtc:error', { error: 'Failed to send answer' });
      }
    });

    socket.on('webrtc:ice-candidate', async (data) => {
      try {
        const { sessionId, candidate } = data;
        
        if (!socket.userId) {
          socket.emit('error', { error: 'Not authenticated' });
          return;
        }

        const iceData = await webrtcService.handleIceCandidate(sessionId, socket.userId, candidate);
        
        // Send ICE candidate to other participants in the session
        socket.to(`session:${sessionId}`).emit('webrtc:ice-candidate', iceData);
        
        logger.info(`ICE candidate sent for session ${sessionId}`);
      } catch (error) {
        logger.error('ICE candidate error:', error);
        socket.emit('webrtc:error', { error: 'Failed to send ICE candidate' });
      }
    });

    // Handle session joining
    socket.on('session:join', async (data) => {
      try {
        const { sessionId } = data;
        
        if (!socket.userId) {
          socket.emit('error', { error: 'Not authenticated' });
          return;
        }

        // Join the session room
        socket.join(`session:${sessionId}`);
        
        // Update session with new participant
        const session = await webrtcService.joinSession(sessionId, socket.userId, socket.id);
        
        // Notify other participants
        socket.to(`session:${sessionId}`).emit('participant:joined', {
          userId: socket.userId,
          sessionId,
          timestamp: new Date().toISOString()
        });

        socket.emit('session:joined', { session });
        
        logger.info(`User ${socket.userId} joined session ${sessionId}`);
      } catch (error) {
        logger.error('Session join error:', error);
        socket.emit('session:error', { error: 'Failed to join session' });
      }
    });

    // Handle session leaving
    socket.on('session:leave', async (data) => {
      try {
        const { sessionId } = data;
        
        if (!socket.userId) {
          return;
        }

        // Leave the session room
        socket.leave(`session:${sessionId}`);
        
        // Update session
        await webrtcService.leaveSession(sessionId, socket.userId);
        
        // Notify other participants
        socket.to(`session:${sessionId}`).emit('participant:left', {
          userId: socket.userId,
          sessionId,
          timestamp: new Date().toISOString()
        });
        
        logger.info(`User ${socket.userId} left session ${sessionId}`);
      } catch (error) {
        logger.error('Session leave error:', error);
      }
    });

    // Handle incoming call acceptance (for agents)
    socket.on('call:accept-inbound', async (data) => {
      try {
        const { callSid } = data;
        
        if (!socket.userId) {
          socket.emit('error', { error: 'Not authenticated' });
          return;
        }

        logger.info(`Agent ${socket.userId} accepting inbound call ${callSid}`);
        
        // In a real implementation, you'd:
        // 1. Connect the agent to the conference
        // 2. Update call status
        // 3. Start recording if needed
        
        // Emit to other agents that call was accepted
        socket.broadcast.emit('call:accepted', {
          callSid,
          agentId: socket.userId,
          timestamp: new Date().toISOString()
        });
        
        socket.emit('call:connected', { callSid });
        
      } catch (error) {
        logger.error('Call accept error:', error);
        socket.emit('call:error', { error: 'Failed to accept call' });
      }
    });

    // Handle call quality reporting
    socket.on('call:quality-report', (data) => {
      try {
        const { sessionId, quality } = data;
        
        logger.info(`Call quality report for session ${sessionId}:`, quality);
        
        // Store quality metrics for analysis
        // This could be useful for troubleshooting and improving call quality
        
      } catch (error) {
        logger.error('Call quality report error:', error);
      }
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      try {
        logger.info(`Socket disconnected: ${socket.id}, reason: ${reason}`);
        
        const client = this.connectedClients.get(socket.id);
        if (client) {
          // Clean up any active sessions
          const activeSessions = webrtcService.getAllActiveSessions()
            .filter(session => 
              session.participants.some(p => p.socketId === socket.id)
            );
          
          for (const session of activeSessions) {
            await webrtcService.leaveSession(session.id, client.userId);
            
            // Notify other participants
            socket.to(`session:${session.id}`).emit('participant:left', {
              userId: client.userId,
              sessionId: session.id,
              timestamp: new Date().toISOString(),
              reason: 'disconnect'
            });
          }
          
          this.connectedClients.delete(socket.id);
        }
      } catch (error) {
        logger.error('Disconnect cleanup error:', error);
      }
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  }

  /**
   * Get connected clients info
   */
  getConnectedClients() {
    return Array.from(this.connectedClients.values());
  }

  /**
   * Get clients by user ID
   */
  getClientsByUserId(userId) {
    return Array.from(this.connectedClients.values())
      .filter(client => client.userId === userId);
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event, data) {
    for (const client of this.connectedClients.values()) {
      // Implementation would depend on having access to io instance
      logger.info(`Broadcasting ${event} to ${client.socketId}`);
    }
  }
}

const socketHandler = new SocketHandler();

module.exports = {
  handleConnection: socketHandler.handleConnection.bind(socketHandler),
  getConnectedClients: socketHandler.getConnectedClients.bind(socketHandler),
  getClientsByUserId: socketHandler.getClientsByUserId.bind(socketHandler),
  broadcast: socketHandler.broadcast.bind(socketHandler)
};