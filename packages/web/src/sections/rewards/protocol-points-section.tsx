'use client';

import { useTranslate } from '@/locales';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import { ProtocolPoints } from './protocol-points';
import { useProtocolPoints } from '../rewards/hooks/use-protocol-points';

import type { UseProtocolPointsOptions } from '../rewards/hooks/use-protocol-points';

type Props = {
  walletAddress?: string;
  options?: UseProtocolPointsOptions; // optional overrides
};

export default function ProtocolPointsSection({ walletAddress, options }: Props) {
  const { t } = useTranslate();
  const { loading, error, totalPoints, history } = useProtocolPoints(walletAddress, options);

  if (!walletAddress) {
    return <Alert severity="info">{t('Connect your wallet to see Protocol Points.')}</Alert>;
  }

  if (loading) {
    return (
      <Card sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <CircularProgress size={20} />
          {t('Loading protocol points…')}
        </Box>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {t('Something went wrong')}: {error}
      </Alert>
    );
  }

  return <ProtocolPoints totalPoints={totalPoints} history={history} />;
}
