'use client';

import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { ProtocolPoints } from '@/sections/rewards/protocol-points';
import { useProtocolPointsHardcoded } from './useProtocolPointsHardcoded';

export default function ProtocolPointsDevSection() {
  const { loading, error, totalPoints, history, viewingAddress } = useProtocolPointsHardcoded();

  if (loading) {
    return (
      <Card sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <CircularProgress size={20} />
          Loading demo protocol points...
        </Box>
      </Card>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Demo (hardcoded) — viewing: {viewingAddress}
      </Typography>
      <ProtocolPoints totalPoints={totalPoints} history={history} />
    </>
  );
}
