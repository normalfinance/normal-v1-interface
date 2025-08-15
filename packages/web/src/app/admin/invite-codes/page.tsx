'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Grid,
  Button,
  Typography,
  CardContent,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Stack,
} from '@mui/material';
import { Download, Add, Refresh } from '@mui/icons-material';

interface InviteCodeStats {
  total: number;
  used: number;
  unused: number;
  usageRate: number;
}

interface RecentActivity {
  inviteCode: string;
  usedAt: string;
  walletAddress?: string;
  source?: string;
}

interface InviteCode {
  id: string;
  inviteCode: string;
  isUsed: boolean;
  usedAt?: string;
  walletAddress?: string;
  source?: string;
  createdAt: string;
}

export default function AdminInviteCodesPage() {
  const [stats, setStats] = useState<InviteCodeStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateCount, setGenerateCount] = useState(10);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsResponse, codesResponse] = await Promise.all([
        fetch('/api/admin/invite-codes?action=stats', {
          headers: {
            'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || 'dev-key'
          }
        }),
        fetch(`/api/admin/invite-codes?action=list&page=${page}&limit=50`, {
          headers: {
            'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || 'dev-key'
          }
        })
      ]);

      if (!statsResponse.ok || !codesResponse.ok) {
        throw new Error('Failed to load data');
      }

      const statsData = await statsResponse.json();
      const codesData = await codesResponse.json();

      setStats(statsData.stats);
      setRecentActivity(statsData.recentActivity || []);
      setCodes(codesData.codes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCodes = async () => {
    try {
      setGenerateLoading(true);
      setError(null);

      const response = await fetch('/api/admin/invite-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || 'dev-key'
        },
        body: JSON.stringify({
          action: 'generate',
          count: generateCount,
          source: 'admin'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate codes');
      }

      const data = await response.json();
      setSuccess(`Successfully generated ${data.codes.length} invite codes`);
      setShowGenerateDialog(false);
      loadData(); // Refresh data
    } catch (err: any) {
      setError(err.message || 'Failed to generate codes');
    } finally {
      setGenerateLoading(false);
    }
  };

  const downloadCodes = () => {
    const csvContent = codes
      .map(code => `${code.inviteCode},${code.isUsed ? 'Used' : 'Unused'},${code.createdAt}`)
      .join('\n');
    
    const csvHeader = 'Code,Status,Created At\n';
    const csvData = csvHeader + csvContent;
    
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invite-codes-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    loadData();
  }, [page]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Invite Code Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">Total Codes</Typography>
                <Typography variant="h4" color="primary">
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">Used Codes</Typography>
                <Typography variant="h4" color="success.main">
                  {stats.used}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">Available Codes</Typography>
                <Typography variant="h4" color="info.main">
                  {stats.unused}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">Usage Rate</Typography>
                <Typography variant="h4" color="warning.main">
                  {stats.usageRate.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Actions */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setShowGenerateDialog(true)}
        >
          Generate Codes
        </Button>
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={downloadCodes}
          disabled={codes.length === 0}
        >
          Download CSV
        </Button>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadData}
        >
          Refresh
        </Button>
      </Stack>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Used At</TableCell>
                    <TableCell>Wallet</TableCell>
                    <TableCell>Source</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentActivity.map((activity, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {activity.inviteCode}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {activity.usedAt ? new Date(activity.usedAt).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace" noWrap>
                          {activity.walletAddress ? 
                            `${activity.walletAddress.slice(0, 10)}...` : 
                            '-'
                          }
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={activity.source || 'unknown'} 
                          size="small" 
                          variant="outlined" 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* All Codes Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            All Invite Codes
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Used At</TableCell>
                  <TableCell>Wallet Address</TableCell>
                  <TableCell>Source</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {codes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {code.inviteCode}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={code.isUsed ? 'Used' : 'Available'}
                        color={code.isUsed ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(code.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {code.usedAt ? new Date(code.usedAt).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" noWrap>
                        {code.walletAddress ? 
                          `${code.walletAddress.slice(0, 10)}...` : 
                          '-'
                        }
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={code.source || 'unknown'} 
                        size="small" 
                        variant="outlined" 
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Generate Codes Dialog */}
      <Dialog open={showGenerateDialog} onClose={() => setShowGenerateDialog(false)}>
        <DialogTitle>Generate Invite Codes</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="number"
            label="Number of codes to generate"
            value={generateCount}
            onChange={(e) => setGenerateCount(parseInt(e.target.value) || 10)}
            inputProps={{ min: 1, max: 1000 }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
          <Button
            onClick={handleGenerateCodes}
            variant="contained"
            disabled={generateLoading}
          >
            {generateLoading ? 'Generating...' : 'Generate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}