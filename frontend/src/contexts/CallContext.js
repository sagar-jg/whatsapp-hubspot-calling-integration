import React, { createContext, useContext, useState, useCallback } from 'react';
import { useSocket } from './SocketContext';
import callService from '../services/callService';
import webrtcService from '../services/webrtcService';
import { toast } from 'react-toastify';

const CallContext = createContext();

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

export const CallProvider = ({ children }) => {
  const [activeCall, setActiveCall] = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  const [isInCall, setIsInCall] = useState(false);
  const [callStatus, setCallStatus] = useState('idle'); // idle, connecting, connected, ended
  const [webrtcSession, setWebrtcSession] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime, setCallStartTime] = useState(null);
  const { socket, emit, on, off } = useSocket();

  // Initialize WebRTC when socket is ready
  React.useEffect(() => {
    if (socket) {
      // Listen for call events
      on('call:initiated', handleCallInitiated);
      on('call:status-update', handleCallStatusUpdate);
      on('call:ended', handleCallEnded);
      on('webrtc:offer', handleWebRTCOffer);
      on('webrtc:answer', handleWebRTCAnswer);
      on('webrtc:ice-candidate', handleICECandidate);

      return () => {
        off('call:initiated', handleCallInitiated);
        off('call:status-update', handleCallStatusUpdate);
        off('call:ended', handleCallEnded);
        off('webrtc:offer', handleWebRTCOffer);
        off('webrtc:answer', handleWebRTCAnswer);
        off('webrtc:ice-candidate', handleICECandidate);
      };
    }
  }, [socket]);

  // Call duration timer
  React.useEffect(() => {
    let interval;
    if (isInCall && callStartTime) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isInCall, callStartTime]);

  const handleCallInitiated = useCallback((callData) => {
    console.log('Call initiated:', callData);
    setActiveCall(callData);
    setCallStatus('connecting');
    toast.success('Call initiated successfully');
  }, []);

  const handleCallStatusUpdate = useCallback((statusData) => {
    console.log('Call status update:', statusData);
    setCallStatus(statusData.callStatus);
    
    if (statusData.callStatus === 'answered') {
      setIsInCall(true);
      setCallStartTime(Date.now());
      toast.success('Call connected');
    }
  }, []);

  const handleCallEnded = useCallback((callData) => {
    console.log('Call ended:', callData);
    setIsInCall(false);
    setCallStatus('ended');
    
    // Clean up WebRTC resources
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    
    setRemoteStream(null);
    setWebrtcSession(null);
    
    // Add to call history
    if (activeCall) {
      setCallHistory(prev => [{
        ...activeCall,
        endedAt: callData.endedAt,
        duration: callData.duration || callDuration
      }, ...prev]);
    }
    
    setActiveCall(null);
    setCallDuration(0);
    setCallStartTime(null);
    
    toast.info('Call ended');
  }, [localStream, peerConnection, activeCall, callDuration]);

  const handleWebRTCOffer = useCallback(async (offerData) => {
    console.log('Received WebRTC offer:', offerData);
    
    try {
      if (!peerConnection) {
        await initializeWebRTC();
      }
      
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offerData.sdp));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      emit('webrtc:answer', {
        sessionId: offerData.sessionId,
        answer: {
          sdp: answer
        }
      });
    } catch (error) {
      console.error('Error handling WebRTC offer:', error);
      toast.error('Failed to handle incoming call');
    }
  }, [peerConnection, emit]);

  const handleWebRTCAnswer = useCallback(async (answerData) => {
    console.log('Received WebRTC answer:', answerData);
    
    try {
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answerData.sdp));
      }
    } catch (error) {
      console.error('Error handling WebRTC answer:', error);
      toast.error('Failed to establish call connection');
    }
  }, [peerConnection]);

  const handleICECandidate = useCallback(async (candidateData) => {
    console.log('Received ICE candidate:', candidateData);
    
    try {
      if (peerConnection && candidateData.candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidateData.candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }, [peerConnection]);

  const initializeWebRTC = useCallback(async () => {
    try {
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };
      
      const pc = new RTCPeerConnection(configuration);
      
      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && webrtcSession) {
          emit('webrtc:ice-candidate', {
            sessionId: webrtcSession.id,
            candidate: event.candidate
          });
        }
      };
      
      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('Received remote stream');
        setRemoteStream(event.streams[0]);
      };
      
      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          toast.success('Voice connection established');
        } else if (pc.connectionState === 'failed') {
          toast.error('Voice connection failed');
        }
      };
      
      setPeerConnection(pc);
      return pc;
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      toast.error('Failed to initialize voice connection');
      throw error;
    }
  }, [webrtcSession, emit]);

  const initiateCall = useCallback(async (phoneNumber, contactId, callType = 'voice') => {
    try {
      setCallStatus('connecting');
      
      // Create WebRTC session first
      const session = await callService.createWebRTCSession(callType);
      setWebrtcSession(session.session);
      
      // Initialize WebRTC
      const pc = await initializeWebRTC();
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      });
      
      setLocalStream(stream);
      
      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      // Join WebRTC session
      await callService.joinWebRTCSession(session.session.id, socket.id);
      
      // Create WebRTC offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      emit('webrtc:offer', {
        sessionId: session.session.id,
        offer: {
          sdp: offer
        }
      });
      
      // Initiate the actual call through backend
      const callResult = await callService.initiateCall({
        toNumber: phoneNumber,
        contactId,
        callType
      });
      
      setActiveCall(callResult.call);
      return callResult;
    } catch (error) {
      console.error('Failed to initiate call:', error);
      setCallStatus('idle');
      toast.error('Failed to initiate call: ' + error.message);
      throw error;
    }
  }, [socket, emit, initializeWebRTC]);

  const endCall = useCallback(async () => {
    try {
      if (activeCall) {
        await callService.endCall(activeCall.id, {
          duration: callDuration,
          notes: 'Call ended by user'
        });
      }
      
      // The actual cleanup will be handled by the 'call:ended' event
    } catch (error) {
      console.error('Failed to end call:', error);
      toast.error('Failed to end call properly');
      
      // Force cleanup on error
      handleCallEnded({ 
        callId: activeCall?.id, 
        endedAt: new Date().toISOString(), 
        duration: callDuration 
      });
    }
  }, [activeCall, callDuration, handleCallEnded]);

  const acceptIncomingCall = useCallback(async (callSid) => {
    try {
      emit('call:accept-inbound', { callSid });
      
      // Initialize WebRTC for incoming call
      await initializeWebRTC();
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      
      if (peerConnection) {
        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
        });
      }
      
      toast.success('Incoming call accepted');
    } catch (error) {
      console.error('Failed to accept incoming call:', error);
      toast.error('Failed to accept call: ' + error.message);
    }
  }, [emit, initializeWebRTC, peerConnection]);

  const rejectIncomingCall = useCallback((callSid) => {
    emit('call:reject-inbound', { callSid });
    toast.info('Incoming call rejected');
  }, [emit]);

  const loadCallHistory = useCallback(async () => {
    try {
      const history = await callService.getCallHistory();
      setCallHistory(history.calls);
    } catch (error) {
      console.error('Failed to load call history:', error);
      toast.error('Failed to load call history');
    }
  }, []);

  const formatDuration = useCallback((seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  const value = {
    // State
    activeCall,
    callHistory,
    isInCall,
    callStatus,
    webrtcSession,
    localStream,
    remoteStream,
    callDuration,
    
    // Actions
    initiateCall,
    endCall,
    acceptIncomingCall,
    rejectIncomingCall,
    loadCallHistory,
    
    // Utilities
    formatDuration
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
};