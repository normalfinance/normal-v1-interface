'use client';

import type { VaultInfo, SavingsPosition } from '@/types/savings';

import { useTranslate } from '@/locales';
import { paths } from '@/routes/paths';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';

import { Iconify } from '@/components/template/iconify';
import { RouterLink } from '@/routes/components';

// ----------------------------------------------------------------------

interface MySavingsSectionProps {
  vaultInfo: VaultInfo | null;
  userPosition: SavingsPosition | null;
  fetching: boolean;
  fetchError: string | null;
  onRetry: () => void;
}

export function MySavingsSection({
  vaultInfo,
  userPosition,
  fetching,
  fetchError,
  onRetry,
}: MySavingsSectionProps) {
  const { t } = useTranslate();

  const hasPosition = userPosition && parseFloat(userPosition.currentValue) > 0;

  return (
    <Card sx={{ p: 3, borderRadius: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <CardHeader title={t('Savings')} sx={{ p: 0 }} />
        <Stack direction="row" alignItems="center" spacing={1.5}>
          {vaultInfo && (
            <Chip
              label={`${vaultInfo.apy}% APY`}
              color="success"
              size="small"
              icon={<Iconify icon="solar:graph-up-bold" width={14} />}
            />
          )}
          <Button
            component={RouterLink}
            href={paths.savings}
            size="small"
            variant="outlined"
            endIcon={<Iconify icon="solar:arrow-right-bold" width={14} />}
          >
            {t('Manage')}
          </Button>
        </Stack>
      </Stack>

      <Divider sx={{ mb: 2.5 }} />

      {fetching ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={3}
          divider={<Divider orientation="vertical" flexItem />}
        >
          {[t('Current Value'), t('Total Deposited'), t('Earnings')].map((label) => (
            <Box key={label} sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
              <Skeleton variant="text" width={120} height={32} sx={{ mt: 0.5 }} />
            </Box>
          ))}
        </Stack>
      ) : fetchError ? (
        <Stack spacing={1} alignItems="center" sx={{ py: 2 }}>
          <Typography variant="body2" color="error.main" textAlign="center">
            {fetchError}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={onRetry}
            startIcon={<Iconify icon="solar:refresh-bold" width={16} />}
          >
            {t('Retry')}
          </Button>
        </Stack>
      ) : !hasPosition ? (
        <Stack alignItems="center" spacing={1} sx={{ py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('No savings yet. Deposit USDC to start earning yield.')}
          </Typography>
          <Button
            component={RouterLink}
            href={paths.savings}
            size="small"
            variant="contained"
            color="primary"
          >
            {t('Start saving')}
          </Button>
        </Stack>
      ) : (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={3}
          divider={<Divider orientation="vertical" flexItem />}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {t('Current Value')}
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.5 }}>
              {parseFloat(userPosition!.currentValue).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}{' '}
              <Typography component="span" variant="body2" color="text.secondary">
                USDC
              </Typography>
            </Typography>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {t('Total Deposited')}
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.5 }}>
              {parseFloat(userPosition!.totalDeposited).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}{' '}
              <Typography component="span" variant="body2" color="text.secondary">
                USDC
              </Typography>
            </Typography>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {t('Earnings')}
            </Typography>
            <Typography variant="h5" color="success.main" sx={{ mt: 0.5 }}>
              +
              {parseFloat(userPosition!.earnings).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}{' '}
              <Typography component="span" variant="body2" color="text.secondary">
                USDC
              </Typography>
            </Typography>
          </Box>
        </Stack>
      )}
    </Card>
  );
}
