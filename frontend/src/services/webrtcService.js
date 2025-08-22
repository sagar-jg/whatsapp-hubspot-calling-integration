class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' }
      ]
    };
  }

  async initializePeerConnection() {
    try {
      this.peerConnection = new RTCPeerConnection(this.configuration);
      
      // Set up event handlers
      this.peerConnection.onicecandidate = this.handleICECandidate.bind(this);
      this.peerConnection.ontrack = this.handleRemoteTrack.bind(this);
      this.peerConnection.onconnectionstatechange = this.handleConnectionStateChange.bind(this);
      this.peerConnection.oniceconnectionstatechange = this.handleICEConnectionStateChange.bind(this);
      
      return this.peerConnection;
    } catch (error) {
      console.error('Failed to initialize peer connection:', error);
      throw error;
    }
  }

  async getUserMedia(constraints = { audio: true, video: false }) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (error) {
      console.error('Failed to get user media:', error);
      throw new Error('Failed to access microphone/camera. Please check permissions.');
    }
  }

  addLocalStreamToPeer() {
    if (this.localStream && this.peerConnection) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }
  }

  async createOffer() {
    try {
      if (!this.peerConnection) {
        throw new Error('Peer connection not initialized');
      }
      
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      
      await this.peerConnection.setLocalDescription(offer);
      return offer;
    } catch (error) {
      console.error('Failed to create offer:', error);
      throw error;
    }
  }

  async createAnswer() {
    try {
      if (!this.peerConnection) {
        throw new Error('Peer connection not initialized');
      }
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      return answer;
    } catch (error) {
      console.error('Failed to create answer:', error);
      throw error;
    }
  }

  async setRemoteDescription(description) {
    try {
      if (!this.peerConnection) {
        throw new Error('Peer connection not initialized');
      }
      
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(description));
    } catch (error) {
      console.error('Failed to set remote description:', error);
      throw error;
    }
  }

  async addICECandidate(candidate) {
    try {
      if (!this.peerConnection) {
        throw new Error('Peer connection not initialized');
      }
      
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
      throw error;
    }
  }

  handleICECandidate(event) {
    if (event.candidate && this.onICECandidate) {
      this.onICECandidate(event.candidate);
    }
  }

  handleRemoteTrack(event) {
    console.log('Received remote track:', event);
    this.remoteStream = event.streams[0];
    if (this.onRemoteStream) {
      this.onRemoteStream(this.remoteStream);
    }
  }

  handleConnectionStateChange() {
    console.log('Connection state changed:', this.peerConnection.connectionState);
    if (this.onConnectionStateChange) {
      this.onConnectionStateChange(this.peerConnection.connectionState);
    }
  }

  handleICEConnectionStateChange() {
    console.log('ICE connection state changed:', this.peerConnection.iceConnectionState);
    if (this.onICEConnectionStateChange) {
      this.onICEConnectionStateChange(this.peerConnection.iceConnectionState);
    }
  }

  // Event handlers (to be set by the caller)
  onICECandidate = null;
  onRemoteStream = null;
  onConnectionStateChange = null;
  onICEConnectionStateChange = null;

  // Audio controls
  muteAudio(muted = true) {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  // Video controls (for future video calling)
  muteVideo(muted = true) {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  // Get audio level (for UI indicators)
  getAudioLevel() {
    if (!this.localStream) return 0;
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(this.localStream);
    const analyser = audioContext.createAnalyser();
    
    source.connect(analyser);
    analyser.fftSize = 256;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    analyser.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    return average / 255; // Normalize to 0-1
  }

  // Connection quality monitoring
  async getConnectionStats() {
    if (!this.peerConnection) return null;
    
    try {
      const stats = await this.peerConnection.getStats();
      const report = {};
      
      stats.forEach(stat => {
        if (stat.type === 'inbound-rtp' && stat.kind === 'audio') {
          report.inbound = {
            packetsReceived: stat.packetsReceived,
            packetsLost: stat.packetsLost,
            jitter: stat.jitter,
            bytesReceived: stat.bytesReceived
          };
        }
        
        if (stat.type === 'outbound-rtp' && stat.kind === 'audio') {
          report.outbound = {
            packetsSent: stat.packetsSent,
            bytesSent: stat.bytesSent
          };
        }
        
        if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
          report.connection = {
            currentRoundTripTime: stat.currentRoundTripTime,
            availableOutgoingBitrate: stat.availableOutgoingBitrate
          };
        }
      });
      
      return report;
    } catch (error) {
      console.error('Failed to get connection stats:', error);
      return null;
    }
  }

  // Cleanup
  cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    this.remoteStream = null;
    
    // Reset event handlers
    this.onICECandidate = null;
    this.onRemoteStream = null;
    this.onConnectionStateChange = null;
    this.onICEConnectionStateChange = null;
  }

  // Check browser compatibility
  static isSupported() {
    return !!(navigator.mediaDevices && 
             navigator.mediaDevices.getUserMedia && 
             window.RTCPeerConnection);
  }

  // Get browser-specific constraints
  static getBrowserConstraints() {
    const isChrome = navigator.userAgent.indexOf('Chrome') !== -1;
    const isFirefox = navigator.userAgent.indexOf('Firefox') !== -1;
    const isSafari = navigator.userAgent.indexOf('Safari') !== -1 && 
                     navigator.userAgent.indexOf('Chrome') === -1;
    
    if (isChrome) {
      return {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
    }
    
    if (isFirefox) {
      return {
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      };
    }
    
    if (isSafari) {
      return {
        audio: {
          echoCancellation: true
        }
      };
    }
    
    return { audio: true };
  }
}

export default new WebRTCService();