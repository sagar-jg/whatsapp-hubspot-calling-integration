import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

// Import the HubSpot Calling Extensions SDK
// Note: In a real implementation, you might need to load this dynamically
// or include it as a script tag in your HTML
let CallingExtensions;

try {
  CallingExtensions = require('@hubspot/calling-extensions-sdk');
} catch (error) {
  console.warn('HubSpot Calling Extensions SDK not available:', error);
}

export const useHubSpotSDK = () => {
  const [isSDKReady, setIsSDKReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentContact, setCurrentContact] = useState(null);
  const [callingExtension, setCallingExtension] = useState(null);
  const [errors, setErrors] = useState([]);
  const { user } = useAuth();

  const initializeSDK = useCallback(async () => {
    if (!CallingExtensions) {
      console.warn('HubSpot Calling Extensions SDK not available');
      setErrors(prev => [...prev, 'HubSpot SDK not available']);
      return;
    }

    if (!user?.hubspotConnected) {
      console.warn('HubSpot not connected');
      return;
    }

    if (isInitialized) {
      return;
    }

    try {
      console.log('Initializing HubSpot Calling Extensions SDK...');
      
      const options = {
        // These would come from your HubSpot app configuration
        debugMode: process.env.NODE_ENV === 'development',
        eventHandlers: {
          onReady: () => {
            console.log('HubSpot SDK is ready');
            setIsSDKReady(true);
          },
          onDialNumber: (data) => {
            console.log('Dial number requested:', data);
            handleDialNumber(data);
          },
          onEngagementCreated: (data) => {
            console.log('Engagement created:', data);
            handleEngagementCreated(data);
          },
          onEndCall: (data) => {
            console.log('End call requested:', data);
            handleEndCall(data);
          },
          onInitiateCallRequested: (data) => {
            console.log('Initiate call requested:', data);
            handleInitiateCall(data);
          },
          onVisibilityChanged: (data) => {
            console.log('Visibility changed:', data);
            handleVisibilityChanged(data);
          }
        }
      };

      const extension = new CallingExtensions(options);
      setCallingExtension(extension);
      setIsInitialized(true);
      
      console.log('HubSpot SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize HubSpot SDK:', error);
      setErrors(prev => [...prev, `SDK initialization failed: ${error.message}`]);
      toast.error('Failed to initialize HubSpot integration');
    }
  }, [user, isInitialized]);

  const handleDialNumber = useCallback(async (data) => {
    try {
      const { phoneNumber, calleeInfo } = data;
      console.log('Dialing number from HubSpot:', phoneNumber, calleeInfo);
      
      setCurrentContact(calleeInfo);
      
      // You would trigger your calling logic here
      // This integrates with your CallContext
      const event = new CustomEvent('hubspot:dial-number', {
        detail: { phoneNumber, contact: calleeInfo }
      });
      window.dispatchEvent(event);
      
    } catch (error) {
      console.error('Failed to handle dial number:', error);
      toast.error('Failed to initiate call from HubSpot');
    }
  }, []);

  const handleEngagementCreated = useCallback((data) => {
    console.log('HubSpot engagement created:', data);
    // Handle engagement creation if needed
  }, []);

  const handleEndCall = useCallback((data) => {
    console.log('HubSpot requested call end:', data);
    
    // Trigger end call event
    const event = new CustomEvent('hubspot:end-call', {
      detail: data
    });
    window.dispatchEvent(event);
  }, []);

  const handleInitiateCall = useCallback((data) => {
    console.log('HubSpot requested call initiation:', data);
    
    // Trigger initiate call event
    const event = new CustomEvent('hubspot:initiate-call', {
      detail: data
    });
    window.dispatchEvent(event);
  }, []);

  const handleVisibilityChanged = useCallback((data) => {
    console.log('HubSpot widget visibility changed:', data);
    // Handle visibility changes if needed
  }, []);

  // SDK API methods
  const sendCallStatus = useCallback((status) => {
    if (callingExtension && isSDKReady) {
      try {
        callingExtension.updateCallStatus(status);
      } catch (error) {
        console.error('Failed to send call status:', error);
      }
    }
  }, [callingExtension, isSDKReady]);

  const sendCallStarted = useCallback((callInfo) => {
    if (callingExtension && isSDKReady) {
      try {
        callingExtension.callStarted({
          externalCallId: callInfo.id,
          fromNumber: callInfo.fromNumber,
          toNumber: callInfo.toNumber
        });
      } catch (error) {
        console.error('Failed to send call started:', error);
      }
    }
  }, [callingExtension, isSDKReady]);

  const sendCallAnswered = useCallback(() => {
    if (callingExtension && isSDKReady) {
      try {
        callingExtension.callAnswered();
      } catch (error) {
        console.error('Failed to send call answered:', error);
      }
    }
  }, [callingExtension, isSDKReady]);

  const sendCallEnded = useCallback((callData) => {
    if (callingExtension && isSDKReady) {
      try {
        callingExtension.callEnded({
          externalCallId: callData.id,
          engagementId: callData.hubspotEngagementId,
          callEndStatus: callData.status || 'COMPLETED',
          duration: callData.duration || 0
        });
      } catch (error) {
        console.error('Failed to send call ended:', error);
      }
    }
  }, [callingExtension, isSDKReady]);

  const sendCallError = useCallback((error) => {
    if (callingExtension && isSDKReady) {
      try {
        callingExtension.callFailed({
          message: error.message || 'Call failed'
        });
      } catch (err) {
        console.error('Failed to send call error:', err);
      }
    }
  }, [callingExtension, isSDKReady]);

  const resizeWidget = useCallback((dimensions) => {
    if (callingExtension && isSDKReady) {
      try {
        callingExtension.resize(dimensions);
      } catch (error) {
        console.error('Failed to resize widget:', error);
      }
    }
  }, [callingExtension, isSDKReady]);

  const logMessage = useCallback((message, level = 'INFO') => {
    if (callingExtension && isSDKReady) {
      try {
        callingExtension.logMessage({
          message,
          level // 'DEBUG', 'INFO', 'WARN', 'ERROR'
        });
      } catch (error) {
        console.error('Failed to log message:', error);
      }
    }
  }, [callingExtension, isSDKReady]);

  // Auto-initialize when conditions are met
  useEffect(() => {
    if (user?.hubspotConnected && !isInitialized) {
      initializeSDK();
    }
  }, [user, isInitialized, initializeSDK]);

  return {
    // State
    isSDKReady,
    isInitialized,
    currentContact,
    callingExtension,
    errors,
    
    // Actions
    initializeSDK,
    
    // SDK API methods
    sendCallStatus,
    sendCallStarted,
    sendCallAnswered,
    sendCallEnded,
    sendCallError,
    resizeWidget,
    logMessage,
    
    // Utilities
    isSDKAvailable: !!CallingExtensions
  };
};