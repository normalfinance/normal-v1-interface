'use client';

import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

import { ProtocolPoints } from './protocol-points';
import { useProtocolPoints, UseProtocolPointsOptions } from '../rewards/hooks/use-protocol-points';

type Props = {
  walletAddress?: string;
  options?: UseProtocolPointsOptions; // optional overrides
};

export default function ProtocolPointsSection({ walletAddress, options }: Props) {
  const { loading, error, totalPoints, history } = useProtocolPoints(walletAddress, options);

  if (!walletAddress) {
    return <Alert severity="info">Connect your wallet to see Protocol Points.</Alert>;
  }

  if (loading) {
    return (
      <Card sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <CircularProgress size={20} />
          Loading protocol points...
        </Box>
      </Card>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return <ProtocolPoints totalPoints={totalPoints} history={history} />;
}
