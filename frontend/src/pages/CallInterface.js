import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  IconButton,
  Chip,
  Avatar,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Divider
} from '@mui/material';
import {
  Phone as PhoneIcon,
  CallEnd as CallEndIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  WhatsApp as WhatsAppIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useCall } from '../contexts/CallContext';
import { useHubSpotSDK } from '../hooks/useHubSpotSDK';
import callService from '../services/callService';
import { toast } from 'react-toastify';

const CallInterface = () => {
  const {
    isInCall,
    activeCall,
    callStatus,
    callDuration,
    localStream,
    remoteStream,
    initiateCall,
    endCall,
    formatDuration
  } = useCall();
  
  const { currentContact, sendCallStarted, sendCallEnded } = useHubSpotSDK();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [contactId, setContactId] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callType, setCallType] = useState('voice');
  const [showEndCallDialog, setShowEndCallDialog] = useState(false);
  const [callNotes, setCallNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState([]);
  
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // Set up audio streams
  useEffect(() => {
    if (localStream && localAudioRef.current) {
      localAudioRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(console.error);
    }
  }, [remoteStream]);

  // Handle HubSpot SDK events
  useEffect(() => {
    const handleDialNumber = (event) => {
      const { phoneNumber: number, contact } = event.detail;
      setPhoneNumber(number);
      if (contact) {
        setContactId(contact.id);
      }
    };

    const handleEndCall = () => {
      if (isInCall) {
        handleEndCall();
      }
    };

    window.addEventListener('hubspot:dial-number', handleDialNumber);
    window.addEventListener('hubspot:end-call', handleEndCall);

    return () => {
      window.removeEventListener('hubspot:dial-number', handleDialNumber);
      window.removeEventListener('hubspot:end-call', handleEndCall);
    };
  }, [isInCall]);

  // Notify HubSpot SDK of call events
  useEffect(() => {
    if (activeCall && sendCallStarted) {
      sendCallStarted(activeCall);
    }
  }, [activeCall, sendCallStarted]);

  const handleInitiateCall = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    if (!callService.validatePhoneNumber(phoneNumber)) {
      toast.error('Please enter a valid phone number');
      return;
    }

    try {
      const formattedNumber = callService.formatPhoneNumber(phoneNumber);
      await initiateCall(formattedNumber, contactId, callType);
    } catch (error) {
      toast.error('Failed to initiate call: ' + error.message);
    }
  };

  const handleEndCall = async () => {
    try {
      await endCall();
      
      if (activeCall && sendCallEnded) {
        sendCallEnded({
          ...activeCall,
          duration: callDuration,
          notes: callNotes
        });
      }
      
      setShowEndCallDialog(false);
      setCallNotes('');
      setPhoneNumber('');
      setContactId('');
    } catch (error) {
      toast.error('Failed to end call: ' + error.message);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // Note: Speaker control would require additional WebRTC implementation
  };

  const getCallStatusColor = () => {
    switch (callStatus) {
      case 'connecting': return 'warning';
      case 'connected': return 'success';
      case 'ended': return 'default';
      default: return 'default';
    }
  };

  const getCallStatusText = () => {
    switch (callStatus) {
      case 'connecting': return 'Connecting...';
      case 'connected': return 'Connected';
      case 'ringing': return 'Ringing...';
      case 'ended': return 'Call Ended';
      default: return 'Ready';
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Make a Call
      </Typography>

      <Grid container spacing={3}>
        {/* Call Controls */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Call Setup
              </Typography>
              
              {/* Phone Number Input */}
              <TextField
                fullWidth
                label="Phone Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                disabled={isInCall}
                sx={{ mb: 2 }}
                InputProps={
                  currentContact ? {
                    startAdornment: (
                      <InputAdornment position="start">
                        <WhatsAppIcon color="success" />
                      </InputAdornment>
                    )
                  } : undefined
                }
              />

              {/* Contact Search */}
              <TextField
                fullWidth
                label="Search Contacts"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search HubSpot contacts..."
                disabled={isInCall}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
              />

              {/* Contact Info */}
              {currentContact && (
                <Paper sx={{ p: 2, mb: 2, backgroundColor: 'grey.50' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar>
                      <PersonIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {currentContact.name || 'Unknown Contact'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {currentContact.email || currentContact.phone}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              )}

              {/* Call Button */}
              {!isInCall ? (
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PhoneIcon />}
                  onClick={handleInitiateCall}
                  disabled={!phoneNumber.trim() || callStatus === 'connecting'}
                  sx={{ width: '100%', py: 1.5 }}
                >
                  {callStatus === 'connecting' ? 'Connecting...' : 'Start Call'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="error"
                  size="large"
                  startIcon={<CallEndIcon />}
                  onClick={() => setShowEndCallDialog(true)}
                  sx={{ width: '100%', py: 1.5 }}
                >
                  End Call
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Call Status */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Call Status
              </Typography>
              
              <Box sx={{ textAlign: 'center', py: 3 }}>
                {isInCall ? (
                  <>
                    <Avatar
                      sx={{ 
                        width: 80, 
                        height: 80, 
                        mx: 'auto', 
                        mb: 2,
                        backgroundColor: 'success.main'
                      }}
                    >
                      <PhoneIcon sx={{ fontSize: 40 }} />
                    </Avatar>
                    
                    <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                      {activeCall?.toNumber || 'Unknown'}
                    </Typography>
                    
                    <Chip
                      label={getCallStatusText()}
                      color={getCallStatusColor()}
                      sx={{ mb: 2 }}
                    />
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 3 }}>
                      <ScheduleIcon fontSize="small" />
                      <Typography variant="h6">
                        {formatDuration(callDuration)}
                      </Typography>
                    </Box>

                    {/* Call Controls */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                      <IconButton
                        color={isMuted ? 'error' : 'default'}
                        onClick={toggleMute}
                        sx={{ 
                          backgroundColor: isMuted ? 'error.light' : 'grey.100',
                          '&:hover': {
                            backgroundColor: isMuted ? 'error.main' : 'grey.200'
                          }
                        }}
                      >
                        {isMuted ? <MicOffIcon /> : <MicIcon />}
                      </IconButton>
                      
                      <IconButton
                        color={isSpeakerOn ? 'primary' : 'default'}
                        onClick={toggleSpeaker}
                        sx={{ 
                          backgroundColor: isSpeakerOn ? 'primary.light' : 'grey.100',
                          '&:hover': {
                            backgroundColor: isSpeakerOn ? 'primary.main' : 'grey.200'
                          }
                        }}
                      >
                        {isSpeakerOn ? <VolumeUpIcon /> : <VolumeOffIcon />}
                      </IconButton>
                    </Box>
                  </>
                ) : (
                  <>
                    <PhoneIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      Ready to make a call
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Enter a phone number above to get started
                    </Typography>
                  </>
                )}
              </Box>

              {/* Connection Progress */}
              {callStatus === 'connecting' && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress />
                  <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                    Establishing connection...
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Call Notes (visible during call) */}
        {isInCall && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Call Notes
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Add notes about this call..."
                />
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* End Call Dialog */}
      <Dialog open={showEndCallDialog} onClose={() => setShowEndCallDialog(false)}>
        <DialogTitle>End Call</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to end this call?
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Call Notes (Optional)"
            value={callNotes}
            onChange={(e) => setCallNotes(e.target.value)}
            placeholder="Add any notes about this call..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEndCallDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleEndCall} variant="contained" color="error">
            End Call
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hidden Audio Elements */}
      <audio ref={localAudioRef} muted style={{ display: 'none' }} />
      <audio ref={remoteAudioRef} style={{ display: 'none' }} />
    </Box>
  );
};

export default CallInterface;