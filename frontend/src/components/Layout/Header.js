import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  Tooltip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  AccountCircle,
  Phone as PhoneIcon,
  SignalCellularAlt as SignalIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useCall } from '../../contexts/CallContext';

const Header = () => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const { user, logout } = useAuth();
  const { connected, socketId } = useSocket();
  const { isInCall, callStatus, callDuration, formatDuration } = useCall();

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
  };

  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{ 
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        color: 'text.primary'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            WhatsApp Calling
          </Typography>
          
          {isInCall && (
            <Chip
              icon={<PhoneIcon />}
              label={`Call Active - ${formatDuration(callDuration)}`}
              color="success"
              variant="outlined"
              size="small"
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Connection Status */}
          <Tooltip title={connected ? 'Connected to server' : 'Disconnected from server'}>
            <Chip
              icon={<SignalIcon />}
              label={connected ? 'Online' : 'Offline'}
              color={connected ? 'success' : 'error'}
              size="small"
              variant="outlined"
            />
          </Tooltip>

          {/* HubSpot Status */}
          {user?.hubspotConnected && (
            <Chip
              label="HubSpot Connected"
              color="primary"
              size="small"
              variant="outlined"
            />
          )}

          {/* Notifications */}
          <IconButton color="inherit">
            <Badge badgeContent={0} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* User Menu */}
          <IconButton
            color="inherit"
            onClick={handleMenuOpen}
            sx={{ p: 0 }}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              {user?.userId?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleMenuClose}>
              <Box>
                <Typography variant="subtitle2">
                  User ID: {user?.userId?.substring(0, 8)}...
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {connected ? `Socket: ${socketId?.substring(0, 8)}...` : 'Disconnected'}
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;