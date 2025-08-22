import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);
  const { token, user } = useAuth();

  useEffect(() => {
    if (token && user) {
      const newSocket = io(process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:3000', {
        transports: ['websocket'],
        timeout: 20000,
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setConnected(true);
        setSocketId(newSocket.id);
        
        // Authenticate with the server
        newSocket.emit('authenticate', { token });
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setConnected(false);
        setSocketId(null);
        
        if (reason === 'io server disconnect') {
          // Server disconnected the socket, reconnect manually
          newSocket.connect();
        }
      });

      newSocket.on('auth:success', (data) => {
        console.log('Socket authenticated successfully:', data);
        toast.success('Real-time connection established');
      });

      newSocket.on('auth:error', (error) => {
        console.error('Socket authentication failed:', error);
        toast.error('Real-time connection failed: ' + error.error);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        toast.error('Connection error: ' + error.message);
      });

      // Handle incoming call notifications
      newSocket.on('inbound:whatsapp-call', (callData) => {
        console.log('Incoming WhatsApp call:', callData);
        toast.info(`Incoming WhatsApp call from ${callData.from}`, {
          autoClose: false,
          onClick: () => {
            // Handle call acceptance
            newSocket.emit('call:accept-inbound', { callSid: callData.callSid });
          }
        });
      });

      // Handle call status updates
      newSocket.on('call:status-update', (statusData) => {
        console.log('Call status update:', statusData);
        // This would be handled by the CallContext
      });

      // Handle call quality updates
      newSocket.on('call:quality-update', (qualityData) => {
        console.log('Call quality update:', qualityData);
      });

      // Handle conference events
      newSocket.on('conference:event', (conferenceData) => {
        console.log('Conference event:', conferenceData);
      });

      // Handle participant events
      newSocket.on('participant:joined', (data) => {
        console.log('Participant joined:', data);
        toast.info(`${data.userId} joined the call`);
      });

      newSocket.on('participant:left', (data) => {
        console.log('Participant left:', data);
        toast.info(`${data.userId} left the call`);
      });

      // WebRTC signaling events
      newSocket.on('webrtc:offer', (data) => {
        console.log('Received WebRTC offer:', data);
      });

      newSocket.on('webrtc:answer', (data) => {
        console.log('Received WebRTC answer:', data);
      });

      newSocket.on('webrtc:ice-candidate', (data) => {
        console.log('Received ICE candidate:', data);
      });

      newSocket.on('webrtc:error', (error) => {
        console.error('WebRTC error:', error);
        toast.error('Call error: ' + error.error);
      });

      // Ping/pong for connection health
      const pingInterval = setInterval(() => {
        if (newSocket.connected) {
          newSocket.emit('ping');
        }
      }, 30000);

      newSocket.on('pong', (data) => {
        console.log('Received pong:', data.timestamp);
      });

      setSocket(newSocket);

      return () => {
        clearInterval(pingInterval);
        newSocket.close();
      };
    }
  }, [token, user]);

  const emit = (event, data) => {
    if (socket && connected) {
      socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit:', event);
    }
  };

  const on = (event, handler) => {
    if (socket) {
      socket.on(event, handler);
    }
  };

  const off = (event, handler) => {
    if (socket) {
      socket.off(event, handler);
    }
  };

  const joinRoom = (room) => {
    if (socket && connected) {
      socket.emit('join-room', room);
    }
  };

  const leaveRoom = (room) => {
    if (socket && connected) {
      socket.emit('leave-room', room);
    }
  };

  const value = {
    socket,
    connected,
    socketId,
    emit,
    on,
    off,
    joinRoom,
    leaveRoom
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};