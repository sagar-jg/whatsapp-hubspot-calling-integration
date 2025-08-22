import apiClient from './apiClient';

class CallService {
  async initiateCall(callData) {
    try {
      const response = await apiClient.post('/calls/outbound', callData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.details || 'Failed to initiate call');
    }
  }

  async getCallStatus(callId) {
    try {
      const response = await apiClient.get(`/calls/${callId}/status`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.details || 'Failed to get call status');
    }
  }

  async endCall(callId, callData) {
    try {
      const response = await apiClient.post(`/calls/${callId}/end`, callData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.details || 'Failed to end call');
    }
  }

  async createWebRTCSession(type = 'voice') {
    try {
      const response = await apiClient.post('/calls/webrtc/session', { type });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.details || 'Failed to create WebRTC session');
    }
  }

  async joinWebRTCSession(sessionId, socketId) {
    try {
      const response = await apiClient.post(`/calls/webrtc/session/${sessionId}/join`, {
        socketId
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.details || 'Failed to join WebRTC session');
    }
  }

  async getCallHistory(params = {}) {
    try {
      const { page = 1, limit = 20 } = params;
      const response = await apiClient.get('/calls/history', {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.details || 'Failed to get call history');
    }
  }

  // Utility functions for call management
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Add country code if not present
    if (!digits.startsWith('1') && digits.length === 10) {
      return `+1${digits}`;
    }
    
    if (!digits.startsWith('+')) {
      return `+${digits}`;
    }
    
    return digits;
  }

  validatePhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid US/Canada number
    if (cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith('1'))) {
      return true;
    }
    
    // Check if it's an international number
    if (cleaned.length >= 10 && cleaned.length <= 15) {
      return true;
    }
    
    return false;
  }

  getCallStatusColor(status) {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
      case 'busy':
      case 'no-answer':
        return 'error';
      case 'in-progress':
      case 'ringing':
        return 'warning';
      default:
        return 'default';
    }
  }

  getCallStatusText(status) {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'busy':
        return 'Busy';
      case 'no-answer':
        return 'No Answer';
      case 'in-progress':
        return 'In Progress';
      case 'ringing':
        return 'Ringing';
      case 'initiated':
        return 'Initiated';
      default:
        return 'Unknown';
    }
  }
}

export default new CallService();