import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Backdrop
} from '@mui/material';

const LoadingOverlay = ({ message = 'Loading...', open = true }) => {
  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
      }}
      open={open}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <CircularProgress color="primary" size={48} />
        <Typography variant="h6" component="div" color="white">
          {message}
        </Typography>
      </Box>
    </Backdrop>
  );
};

export default LoadingOverlay;