import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { toast } from 'react-toastify';

import { useAuth } from './contexts/AuthContext';
import { useHubSpotSDK } from './hooks/useHubSpotSDK';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './pages/Dashboard';
import CallInterface from './pages/CallInterface';
import Settings from './pages/Settings';
import Login from './pages/Login';
import CallHistory from './pages/CallHistory';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import LoadingOverlay from './components/Common/LoadingOverlay';

function App() {
  const { user, loading, checkAuth } = useAuth();
  const { initializeSDK, isSDKReady } = useHubSpotSDK();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user && user.hubspotConnected) {
      initializeSDK();
    }
  }, [user, initializeSDK]);

  useEffect(() => {
    if (isSDKReady) {
      toast.success('HubSpot integration ready!');
    }
  }, [isSDKReady]);

  if (loading) {
    return <LoadingOverlay message="Initializing application..." />;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Header />
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/call" 
              element={
                <ProtectedRoute>
                  <CallInterface />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/history" 
              element={
                <ProtectedRoute>
                  <CallHistory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
}

export default App;