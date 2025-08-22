import React, { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  Alert,
  Paper
} from '@mui/material';
import {
  Phone as PhoneIcon,
  History as HistoryIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HubSpot as HubSpotIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCall } from '../contexts/CallContext';
import { useSocket } from '../contexts/SocketContext';
import { useHubSpotSDK } from '../hooks/useHubSpotSDK';
import moment from 'moment';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { callHistory, loadCallHistory, isInCall, activeCall } = useCall();
  const { connected } = useSocket();
  const { isSDKReady, isSDKAvailable } = useHubSpotSDK();
  const [stats, setStats] = useState({
    totalCalls: 0,
    completedCalls: 0,
    avgDuration: 0,
    todayCalls: 0
  });

  useEffect(() => {
    loadCallHistory();
  }, [loadCallHistory]);

  useEffect(() => {
    if (callHistory.length > 0) {
      const completed = callHistory.filter(call => call.status === 'completed');
      const today = callHistory.filter(call => 
        moment(call.createdAt).isSame(moment(), 'day')
      );
      const avgDuration = completed.length > 0 
        ? completed.reduce((sum, call) => sum + (call.duration || 0), 0) / completed.length
        : 0;

      setStats({
        totalCalls: callHistory.length,
        completedCalls: completed.length,
        avgDuration: Math.round(avgDuration),
        todayCalls: today.length
      });
    }
  }, [callHistory]);

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'busy': return 'warning';
      default: return 'default';
    }
  };

  const recentCalls = callHistory.slice(0, 5);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Dashboard
      </Typography>

      {/* Status Alerts */}
      <Box sx={{ mb: 3 }}>
        {!connected && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Not connected to server. Some features may not work properly.
          </Alert>
        )}
        
        {!user?.hubspotConnected && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            HubSpot is not connected. Please connect your HubSpot account in Settings.
          </Alert>
        )}
        
        {user?.hubspotConnected && !isSDKReady && isSDKAvailable && (
          <Alert severity="info" sx={{ mb: 2 }}>
            HubSpot integration is initializing...
            <LinearProgress sx={{ mt: 1 }} />
          </Alert>
        )}
        
        {user?.hubspotConnected && !isSDKAvailable && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            HubSpot Calling Extensions SDK is not available. Some features may be limited.
          </Alert>
        )}
      </Box>

      {/* Active Call Banner */}
      {isInCall && activeCall && (
        <Paper
          elevation={3}
          sx={{
            p: 3,
            mb: 3,
            backgroundColor: 'success.light',
            color: 'success.contrastText',
            borderRadius: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PhoneIcon />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6">Call in Progress</Typography>
              <Typography variant="body2">
                {activeCall.toNumber} • {activeCall.type || 'Voice'} Call
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="inherit"
              onClick={() => navigate('/call')}
            >
              Go to Call
            </Button>
          </Box>
        </Paper>
      )}

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={6} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Quick Actions
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<PhoneIcon />}
                  onClick={() => navigate('/call')}
                  size="large"
                  disabled={isInCall}
                >
                  Make Call
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<HistoryIcon />}
                  onClick={() => navigate('/history')}
                  size="large"
                >
                  View History
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Call Statistics */}
        <Grid item xs={12} md={6} lg={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Call Statistics
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
                      {stats.totalCalls}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Calls
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
                      {stats.completedCalls}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Completed
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main" sx={{ fontWeight: 700 }}>
                      {formatDuration(stats.avgDuration)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Duration
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main" sx={{ fontWeight: 700 }}>
                      {stats.todayCalls}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Today
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Calls */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Recent Calls
                </Typography>
                <Button
                  variant="text"
                  onClick={() => navigate('/history')}
                  size="small"
                >
                  View All
                </Button>
              </Box>
              
              {recentCalls.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <PhoneIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    No calls yet. Make your first call to get started!
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {recentCalls.map((call, index) => (
                    <ListItem key={call.id || index} sx={{ px: 0 }}>
                      <ListItemIcon>
                        {call.status === 'completed' ? (
                          <CheckCircleIcon color="success" />
                        ) : (
                          <ErrorIcon color="error" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1">
                              {call.toNumber || 'Unknown'}
                            </Typography>
                            <Chip
                              label={call.status || 'Unknown'}
                              size="small"
                              color={getStatusColor(call.status)}
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AccessTimeIcon sx={{ fontSize: 14 }} />
                              <Typography variant="caption">
                                {call.duration ? formatDuration(call.duration) : '0:00'}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {moment(call.createdAt).fromNow()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* System Status */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                System Status
              </Typography>
              
              <List disablePadding>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    {connected ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="Server Connection"
                    secondary={connected ? 'Connected' : 'Disconnected'}
                  />
                </ListItem>
                
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    {user?.hubspotConnected ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="HubSpot Integration"
                    secondary={user?.hubspotConnected ? 'Connected' : 'Not Connected'}
                  />
                </ListItem>
                
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    {isSDKReady && isSDKAvailable ? (
                      <CheckCircleIcon color="success" />
                    ) : isSDKAvailable ? (
                      <AccessTimeIcon color="warning" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="Calling SDK"
                    secondary={
                      isSDKReady && isSDKAvailable
                        ? 'Ready'
                        : isSDKAvailable
                        ? 'Initializing'
                        : 'Not Available'
                    }
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;