'use client';

import confetti from 'canvas-confetti';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useMemo, useState } from 'react';
import { useTransactionStatus } from '@/hooks';
import { RouterLink } from '@/routes/components';
import { DashboardContent } from '@/layouts/dashboard';
import { createStellarExpertUrl } from '@/utils/transactions.utils';

import Grid2 from '@mui/material/Grid2';
import { Stack, Button, Typography, CircularProgress } from '@mui/material';

import { Iconify } from '@/components/template/iconify';

export default function TransactionStatusView({ trxHash }: { trxHash: string }) {
  const { t } = useTranslate();

  const { isLoading, error, transaction, secondsUntilNextRefresh } = useTransactionStatus(
    trxHash,
    10 * 1000 // 10 seconds
  );

  const [shownConfetti, setShownConfetti] = useState(false);

  const iconSettings = useMemo((): { icon: string; color: string; text: string } => {
    if (isLoading) return { icon: '', color: 'info', text: 'Your transaction is processing.' };
    if (error)
      return {
        icon: 'solar:danger-triangle-bold',
        color: 'error',
        text: 'There was an error with your transaction.',
      };
    if (!transaction)
      return {
        icon: 'solar:question-circle-bold',
        color: 'warning',
        text: 'No transaction was found.',
      };
    if (!transaction.successful)
      return { icon: 'solar:sad-circle-bold', color: 'error', text: 'Your transaction failed.' };

    if (!shownConfetti) {
      confetti();
      setShownConfetti(true);
    }

    return {
      icon: 'solar:check-circle-bold',
      color: 'success',
      text: 'Your transaction was successful!',
    };
  }, [isLoading, error, transaction]);

  const handleViewOnExplorer = () => {
    if (trxHash) {
      const url = createStellarExpertUrl('tx', trxHash);
      window.open(url, '_blank', 'noopener');
    }
  };

  const renderIcon = () => (
    <>
      {isLoading && <CircularProgress />}

      {!isLoading && (
        <Iconify icon={iconSettings.icon} width={64} sx={{ color: `${iconSettings.color}.main` }} />
      )}
    </>
  );

  return (
    <DashboardContent maxWidth="xl">
      <Grid2 container justifyContent="center" alignItems="center" sx={{ minHeight: '60vh' }}>
        <Stack
          spacing={2}
          alignItems="center"
          sx={{
            bgcolor: 'common.white',
            p: { xs: 3, md: 6 },
            borderRadius: 2,
            boxShadow: 3,
            maxWidth: 520,
            width: '100%',
          }}
        >
          <Typography variant="h3">{t('Transaction Status')}</Typography>

          {renderIcon()}

          <Typography variant="body1" fontSize={16}>
            {t(iconSettings.text)}
          </Typography>

          {(!transaction || !transaction.successful) && secondsUntilNextRefresh !== null && (
            <Typography variant="subtitle2" fontSize={16}>
              {t(`Refreshing in ${secondsUntilNextRefresh} seconds`)}
            </Typography>
          )}

          <Stack direction="row" spacing={1}>
            <Button
              key="back"
              component={RouterLink}
              href={paths.invest}
              size="large"
              variant="soft"
              color="info"
              startIcon={<Iconify icon="solar:arrow-left-linear" width={24} />}
            >
              {t('Go back')}
            </Button>

            <Button
              key="view"
              variant="soft"
              color="secondary"
              startIcon={<Iconify icon="eva:external-link-outline" />}
              onClick={handleViewOnExplorer}
            >
              {t('View on explorer')}
            </Button>
          </Stack>
        </Stack>
      </Grid2>
    </DashboardContent>
  );
}
