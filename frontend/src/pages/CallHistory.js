import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Button,
  Paper,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Phone as PhoneIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  CallMade as CallMadeIcon,
  CallReceived as CallReceivedIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useCall } from '../contexts/CallContext';
import callService from '../services/callService';
import moment from 'moment';
import { toast } from 'react-toastify';

const CallHistory = () => {
  const { callHistory, loadCallHistory, initiateCall } = useCall();
  const [filteredCalls, setFilteredCalls] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedCall, setSelectedCall] = useState(null);
  const [showCallDetails, setShowCallDetails] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedCallForMenu, setSelectedCallForMenu] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCallHistory();
  }, [loadCallHistory]);

  useEffect(() => {
    applyFilters();
  }, [callHistory, searchQuery, statusFilter, directionFilter, dateFilter]);

  const applyFilters = () => {
    let filtered = [...callHistory];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(call => 
        call.toNumber?.includes(searchQuery) ||
        call.fromNumber?.includes(searchQuery) ||
        call.contactName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(call => call.status === statusFilter);
    }

    // Direction filter
    if (directionFilter !== 'all') {
      filtered = filtered.filter(call => call.direction?.toLowerCase() === directionFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = moment();
      filtered = filtered.filter(call => {
        const callDate = moment(call.createdAt);
        switch (dateFilter) {
          case 'today':
            return callDate.isSame(now, 'day');
          case 'week':
            return callDate.isSame(now, 'week');
          case 'month':
            return callDate.isSame(now, 'month');
          default:
            return true;
        }
      });
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    setFilteredCalls(filtered);
    setPage(0); // Reset to first page when filters change
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await loadCallHistory();
      toast.success('Call history refreshed');
    } catch (error) {
      toast.error('Failed to refresh call history');
    } finally {
      setLoading(false);
    }
  };

  const handleCallAgain = async (phoneNumber) => {
    try {
      const formattedNumber = callService.formatPhoneNumber(phoneNumber);
      await initiateCall(formattedNumber);
      toast.success('Call initiated');
    } catch (error) {
      toast.error('Failed to initiate call: ' + error.message);
    }
  };

  const handleMenuOpen = (event, call) => {
    setMenuAnchor(event.currentTarget);
    setSelectedCallForMenu(call);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedCallForMenu(null);
  };

  const handleViewDetails = (call) => {
    setSelectedCall(call);
    setShowCallDetails(true);
    handleMenuClose();
  };

  const handleExportCalls = () => {
    try {
      const csvContent = generateCSV(filteredCalls);
      downloadCSV(csvContent, 'call-history.csv');
      toast.success('Call history exported');
    } catch (error) {
      toast.error('Failed to export call history');
    }
  };

  const generateCSV = (calls) => {
    const headers = ['Date', 'Time', 'Direction', 'Number', 'Contact', 'Status', 'Duration', 'Notes'];
    const rows = calls.map(call => [
      moment(call.createdAt).format('YYYY-MM-DD'),
      moment(call.createdAt).format('HH:mm:ss'),
      call.direction || 'Unknown',
      call.direction === 'OUTBOUND' ? call.toNumber : call.fromNumber,
      call.contactName || 'Unknown',
      call.status || 'Unknown',
      formatDuration(call.duration || 0),
      call.notes || ''
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      case 'no-answer': return 'default';
      default: return 'default';
    }
  };

  const getDirectionIcon = (direction) => {
    return direction === 'OUTBOUND' ? <CallMadeIcon /> : <CallReceivedIcon />;
  };

  const paginatedCalls = filteredCalls.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Call History
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportCalls}
            disabled={filteredCalls.length === 0}
          >
            Export
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <Card>
        <CardContent>
          {/* Filters */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search calls..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                  <MenuItem value="busy">Busy</MenuItem>
                  <MenuItem value="no-answer">No Answer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Direction</InputLabel>
                <Select
                  value={directionFilter}
                  label="Direction"
                  onChange={(e) => setDirectionFilter(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="outbound">Outbound</MenuItem>
                  <MenuItem value="inbound">Inbound</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Date</InputLabel>
                <Select
                  value={dateFilter}
                  label="Date"
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <MenuItem value="all">All Time</MenuItem>
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="week">This Week</MenuItem>
                  <MenuItem value="month">This Month</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>
                {filteredCalls.length} call{filteredCalls.length !== 1 ? 's' : ''} found
              </Typography>
            </Grid>
          </Grid>

          {/* Call Table */}
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Direction</TableCell>
                  <TableCell>Contact/Number</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Date & Time</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedCalls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                      <PhoneIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                      <Typography variant="body1" color="text.secondary">
                        {callHistory.length === 0 
                          ? 'No calls yet. Make your first call to see it here!'
                          : 'No calls match your current filters.'
                        }
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCalls.map((call, index) => (
                    <TableRow key={call.id || index} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getDirectionIcon(call.direction)}
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {call.direction?.toLowerCase() || 'Unknown'}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {call.contactName || 'Unknown Contact'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {call.direction === 'OUTBOUND' ? call.toNumber : call.fromNumber}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={callService.getCallStatusText(call.status)}
                          color={getStatusColor(call.status)}
                          size="small"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {formatDuration(call.duration || 0)}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {moment(call.createdAt).format('MMM DD, YYYY')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {moment(call.createdAt).format('HH:mm')}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, call)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {filteredCalls.length > 0 && (
            <TablePagination
              component="div"
              count={filteredCalls.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          )}
        </CardContent>
      </Card>

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleViewDetails(selectedCallForMenu)}>
          <PersonIcon sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        
        {selectedCallForMenu && (
          <MenuItem 
            onClick={() => {
              const number = selectedCallForMenu.direction === 'OUTBOUND' 
                ? selectedCallForMenu.toNumber 
                : selectedCallForMenu.fromNumber;
              handleCallAgain(number);
              handleMenuClose();
            }}
          >
            <PhoneIcon sx={{ mr: 1 }} />
            Call Again
          </MenuItem>
        )}
      </Menu>

      {/* Call Details Dialog */}
      <Dialog 
        open={showCallDetails} 
        onClose={() => setShowCallDetails(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Call Details
        </DialogTitle>
        <DialogContent>
          {selectedCall && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Direction
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    {getDirectionIcon(selectedCall.direction)}
                    <Typography variant="body1">
                      {selectedCall.direction || 'Unknown'}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label={callService.getCallStatusText(selectedCall.status)}
                      color={getStatusColor(selectedCall.status)}
                      size="small"
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Phone Number
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedCall.direction === 'OUTBOUND' 
                      ? selectedCall.toNumber 
                      : selectedCall.fromNumber}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Duration
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {formatDuration(selectedCall.duration || 0)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Date & Time
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {moment(selectedCall.createdAt).format('MMMM DD, YYYY [at] HH:mm')}
                  </Typography>
                </Grid>
                
                {selectedCall.notes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Notes
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedCall.notes}
                    </Typography>
                  </Grid>
                )}
                
                {selectedCall.recordingUrl && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Recording
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      href={selectedCall.recordingUrl}
                      target="_blank"
                      sx={{ mt: 1 }}
                    >
                      Listen to Recording
                    </Button>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCallDetails(false)}>
            Close
          </Button>
          {selectedCall && (
            <Button 
              variant="contained"
              onClick={() => {
                const number = selectedCall.direction === 'OUTBOUND' 
                  ? selectedCall.toNumber 
                  : selectedCall.fromNumber;
                handleCallAgain(number);
                setShowCallDetails(false);
              }}
            >
              Call Again
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CallHistory;