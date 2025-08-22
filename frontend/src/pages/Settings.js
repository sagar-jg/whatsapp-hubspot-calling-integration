import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  HubSpot as HubSpotIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  Phone as PhoneIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useHubSpotSDK } from '../hooks/useHubSpotSDK';
import authService from '../services/authService';
import { toast } from 'react-toastify';

const Settings = () => {
  const { user, logout, updateUser } = useAuth();
  const { connected, socketId } = useSocket();
  const { isSDKReady, isSDKAvailable, errors: sdkErrors } = useHubSpotSDK();
  
  const [settings, setSettings] = useState({
    notifications: {
      incomingCalls: true,
      callStatusUpdates: true,
      emailNotifications: false
    },
    calling: {
      autoRecord: true,
      defaultCallType: 'voice',
      muteOnStart: false
    },
    integration: {
      syncContacts: true,
      createEngagements: true,
      logToHubSpot: true
    }
  });
  
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [testConnection, setTestConnection] = useState({ loading: false, result: null });
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const info = await authService.getUserInfo();
      setUserInfo(info);
    } catch (error) {
      console.error('Failed to load user info:', error);
    }
  };

  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
    
    // In a real implementation, you'd save this to the backend
    toast.success('Setting updated');
  };

  const handleDisconnectHubSpot = async () => {
    try {
      setLoading(true);
      await authService.disconnect();
      await logout();
      toast.success('HubSpot account disconnected');
    } catch (error) {
      toast.error('Failed to disconnect: ' + error.message);
    } finally {
      setLoading(false);
      setShowDisconnectDialog(false);
    }
  };

  const handleTestConnection = async () => {
    setTestConnection({ loading: true, result: null });
    
    try {
      // Test various connections
      const results = {
        server: connected,
        hubspot: user?.hubspotConnected,
        sdk: isSDKReady && isSDKAvailable,
        timestamp: new Date().toISOString()
      };
      
      setTestConnection({ loading: false, result: results });
      
      if (results.server && results.hubspot && results.sdk) {
        toast.success('All connections are working properly');
      } else {
        toast.warning('Some connections have issues');
      }
    } catch (error) {
      setTestConnection({ loading: false, result: { error: error.message } });
      toast.error('Connection test failed');
    }
  };

  const handleRefreshToken = async () => {
    try {
      setLoading(true);
      await authService.refreshToken();
      await loadUserInfo();
      toast.success('Token refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh token: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    if (status) {
      return <CheckIcon color="success" />;
    }
    return <ErrorIcon color="error" />;
  };

  const getStatusColor = (status) => {
    return status ? 'success' : 'error';
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Settings
      </Typography>

      <Grid container spacing={3}>
        {/* HubSpot Integration */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <HubSpotIcon color="primary" sx={{ fontSize: 32 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    HubSpot Integration
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage your HubSpot connection and integration settings
                  </Typography>
                </Box>
                <Chip
                  label={user?.hubspotConnected ? 'Connected' : 'Disconnected'}
                  color={user?.hubspotConnected ? 'success' : 'error'}
                  icon={user?.hubspotConnected ? <LinkIcon /> : <LinkOffIcon />}
                />
              </Box>

              {user?.hubspotConnected ? (
                <Box>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          User ID
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {user.userId}
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Connection Status
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getStatusIcon(user?.hubspotConnected)}
                          <Typography variant="body2">
                            {user?.hubspotConnected ? 'Active' : 'Inactive'}
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                    <Button
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={handleRefreshToken}
                      disabled={loading}
                    >
                      Refresh Token
                    </Button>
                    
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => setShowDisconnectDialog(true)}
                      disabled={loading}
                    >
                      Disconnect
                    </Button>
                  </Box>

                  <Divider sx={{ my: 3 }} />

                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    Integration Settings
                  </Typography>

                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <StorageIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Sync Contacts"
                        secondary="Automatically sync HubSpot contacts for calling"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={settings.integration.syncContacts}
                          onChange={(e) => handleSettingChange('integration', 'syncContacts', e.target.checked)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>

                    <ListItem>
                      <ListItemIcon>
                        <PhoneIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Create Engagements"
                        secondary="Automatically create call engagements in HubSpot"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={settings.integration.createEngagements}
                          onChange={(e) => handleSettingChange('integration', 'createEngagements', e.target.checked)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>

                    <ListItem>
                      <ListItemIcon>
                        <InfoIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Log to HubSpot"
                        secondary="Send call logs and recordings to HubSpot"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={settings.integration.logToHubSpot}
                          onChange={(e) => handleSettingChange('integration', 'logToHubSpot', e.target.checked)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  </List>
                </Box>
              ) : (
                <Alert severity="warning">
                  HubSpot is not connected. Please connect your account to use calling features.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Call Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Call Settings
              </Typography>

              <List>
                <ListItem>
                  <ListItemIcon>
                    <PhoneIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Auto Record Calls"
                    secondary="Automatically record all calls for quality purposes"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.calling.autoRecord}
                      onChange={(e) => handleSettingChange('calling', 'autoRecord', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <PhoneIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Mute on Start"
                    secondary="Start calls with microphone muted"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.calling.muteOnStart}
                      onChange={(e) => handleSettingChange('calling', 'muteOnStart', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>

              <Box sx={{ mt: 2 }}>
                <TextField
                  select
                  fullWidth
                  label="Default Call Type"
                  value={settings.calling.defaultCallType}
                  onChange={(e) => handleSettingChange('calling', 'defaultCallType', e.target.value)}
                  SelectProps={{ native: true }}
                >
                  <option value="voice">Voice Only</option>
                  <option value="video">Video Call</option>
                </TextField>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Notifications
              </Typography>

              <List>
                <ListItem>
                  <ListItemIcon>
                    <NotificationsIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Incoming Calls"
                    secondary="Show notifications for incoming WhatsApp calls"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.notifications.incomingCalls}
                      onChange={(e) => handleSettingChange('notifications', 'incomingCalls', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <PhoneIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Call Status Updates"
                    secondary="Show notifications for call status changes"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.notifications.callStatusUpdates}
                      onChange={(e) => handleSettingChange('notifications', 'callStatusUpdates', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <NotificationsIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Email Notifications"
                    secondary="Receive email notifications for important events"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.notifications.emailNotifications}
                      onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* System Status */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  System Status
                </Typography>
                
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleTestConnection}
                  disabled={testConnection.loading}
                >
                  Test Connections
                </Button>
              </Box>

              <TableContainer component={Paper} elevation={0}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Component</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Server Connection</TableCell>
                      <TableCell>
                        <Chip
                          label={connected ? 'Connected' : 'Disconnected'}
                          color={getStatusColor(connected)}
                          size="small"
                          icon={getStatusIcon(connected)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {connected ? `Socket ID: ${socketId?.substring(0, 8)}...` : 'No connection'}
                        </Typography>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell>HubSpot Integration</TableCell>
                      <TableCell>
                        <Chip
                          label={user?.hubspotConnected ? 'Connected' : 'Not Connected'}
                          color={getStatusColor(user?.hubspotConnected)}
                          size="small"
                          icon={getStatusIcon(user?.hubspotConnected)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {user?.hubspotConnected ? 'OAuth tokens valid' : 'Not authenticated'}
                        </Typography>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell>Calling SDK</TableCell>
                      <TableCell>
                        <Chip
                          label={isSDKReady && isSDKAvailable ? 'Ready' : isSDKAvailable ? 'Loading' : 'Not Available'}
                          color={isSDKReady && isSDKAvailable ? 'success' : isSDKAvailable ? 'warning' : 'error'}
                          size="small"
                          icon={isSDKReady && isSDKAvailable ? <CheckIcon /> : isSDKAvailable ? <WarningIcon /> : <ErrorIcon />}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {isSDKReady && isSDKAvailable 
                            ? 'HubSpot SDK initialized' 
                            : isSDKAvailable 
                            ? 'Initializing...' 
                            : 'SDK not loaded'
                          }
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* SDK Errors */}
              {sdkErrors.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="error" sx={{ mb: 1 }}>
                    SDK Errors:
                  </Typography>
                  {sdkErrors.map((error, index) => (
                    <Alert key={index} severity="error" sx={{ mb: 1 }}>
                      {error}
                    </Alert>
                  ))}
                </Box>
              )}

              {/* Test Results */}
              {testConnection.result && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Last Test Results:
                  </Typography>
                  <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(testConnection.result, null, 2)}
                    </Typography>
                  </Paper>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Disconnect Dialog */}
      <Dialog open={showDisconnectDialog} onClose={() => setShowDisconnectDialog(false)}>
        <DialogTitle>Disconnect HubSpot</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to disconnect your HubSpot account? This will:
          </Typography>
          <Box component="ul" sx={{ mt: 2, pl: 2 }}>
            <li>Remove access to HubSpot contacts</li>
            <li>Stop automatic call logging</li>
            <li>Disable the calling integration</li>
            <li>Require re-authentication to reconnect</li>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDisconnectDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDisconnectHubSpot} 
            color="error" 
            variant="contained"
            disabled={loading}
          >
            Disconnect
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;