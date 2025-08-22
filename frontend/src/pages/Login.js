import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Container,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  Business as HubSpotIcon,
  Phone as PhoneIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';
import { toast } from 'react-toastify';

const Login = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState(0);

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      setError(`OAuth error: ${error}`);
      return;
    }

    if (code && state) {
      handleOAuthCallback(code, state);
    }
  }, [searchParams]);

  const handleOAuthCallback = async (code, state) => {
    try {
      setAuthLoading(true);
      setActiveStep(1);
      
      const callbackData = {
        code,
        state,
        redirectUri: window.location.origin + '/login'
      };
      
      setActiveStep(2);
      await login(callbackData);
      
      setActiveStep(3);
      toast.success('Successfully connected to HubSpot!');
      navigate('/dashboard');
    } catch (error) {
      console.error('OAuth callback failed:', error);
      setError(error.message);
      setActiveStep(0);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleConnectHubSpot = async () => {
    try {
      setAuthLoading(true);
      setError(null);
      
      const redirectUri = window.location.origin + '/login';
      const state = `state_${Date.now()}`;
      
      const response = await authService.generateOAuthUrl(redirectUri, state);
      
      // Redirect to HubSpot OAuth
      window.location.href = response.authUrl;
    } catch (error) {
      console.error('Failed to generate OAuth URL:', error);
      setError(error.message);
      setAuthLoading(false);
    }
  };

  const steps = [
    {
      label: 'Connect to HubSpot',
      description: 'Authorize the application to access your HubSpot account'
    },
    {
      label: 'Processing Authorization',
      description: 'Exchanging authorization code for access tokens'
    },
    {
      label: 'Setting Up Integration',
      description: 'Configuring HubSpot calling integration'
    },
    {
      label: 'Complete',
      description: 'Ready to start making calls!'
    }
  ];

  if (loading || authLoading) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center'
        }}>
          <Card sx={{ width: '100%', maxWidth: 500 }}>
            <CardContent sx={{ p: 4 }}>
              <CircularProgress size={48} sx={{ mb: 3 }} />
              
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                {authLoading ? 'Connecting to HubSpot...' : 'Loading...'}
              </Typography>
              
              {authLoading && (
                <Box sx={{ mt: 3 }}>
                  <Stepper activeStep={activeStep} orientation="vertical">
                    {steps.map((step, index) => (
                      <Step key={step.label}>
                        <StepLabel>
                          <Typography variant="body2" fontWeight={500}>
                            {step.label}
                          </Typography>
                        </StepLabel>
                        <StepContent>
                          <Typography variant="caption" color="text.secondary">
                            {step.description}
                          </Typography>
                        </StepContent>
                      </Step>
                    ))}
                  </Stepper>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        <Card sx={{ width: '100%', maxWidth: 500 }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            {/* Logo and Title */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <PhoneIcon sx={{ fontSize: 48, color: 'primary.main' }} />
              </Box>
              <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
                WhatsApp Calling
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                HubSpot Integration
              </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                {error}
              </Alert>
            )}

            {/* Features List */}
            <Box sx={{ mb: 4, textAlign: 'left' }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, textAlign: 'center' }}>
                Features
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CheckIcon color="success" />
                  <Typography variant="body2">
                    Make WhatsApp calls directly from HubSpot
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CheckIcon color="success" />
                  <Typography variant="body2">
                    Automatic call logging and engagement tracking
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CheckIcon color="success" />
                  <Typography variant="body2">
                    WebRTC-powered voice calls with virtual numbers
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CheckIcon color="success" />
                  <Typography variant="body2">
                    Real-time call status and duration tracking
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Connect Button */}
            <Button
              variant="contained"
              size="large"
              startIcon={<HubSpotIcon />}
              onClick={handleConnectHubSpot}
              disabled={authLoading}
              sx={{ 
                width: '100%',
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600
              }}
            >
              Connect to HubSpot
            </Button>

            {/* Help Text */}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
              You'll be redirected to HubSpot to authorize this application.
              Make sure you have the necessary permissions for calling integrations.
            </Typography>
          </CardContent>
        </Card>

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            WhatsApp HubSpot Calling Integration v1.0.0
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;