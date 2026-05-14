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
  positionFetching: boolean;
}

export function MySavingsSection({
  vaultInfo,
  userPosition,
  fetching,
  positionFetching,
}: MySavingsSectionProps) {
  const { t } = useTranslate();

  const hasPosition = userPosition && parseFloat(userPosition.currentValue) > 0;

  const rows = [
    { label: t('Current Value'), value: userPosition?.currentValue, prefix: '', color: 'text.primary' as const },
    { label: t('Total Deposited'), value: userPosition?.totalDeposited, prefix: '', color: 'text.primary' as const },
    { label: t('Earnings'), value: userPosition?.earnings, prefix: '+', color: 'success.main' as const },
  ];

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
        // Phase 1: vault info loading — skeleton for all three rows
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={3}
          divider={<Divider orientation="vertical" flexItem />}
        >
          {rows.map(({ label }) => (
            <Box key={label} sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
              <Skeleton variant="text" width={120} height={32} sx={{ mt: 0.5 }} />
            </Box>
          ))}
        </Stack>
      ) : !hasPosition && !positionFetching ? (
        // No active position and not loading
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
        // Phase 2: show rows — per-row skeleton while position is loading
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={3}
          divider={<Divider orientation="vertical" flexItem />}
        >
          {rows.map(({ label, value, prefix, color }) => (
            <Box key={label} sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
              {positionFetching ? (
                <Skeleton variant="text" width={120} height={32} sx={{ mt: 0.5 }} />
              ) : (
                <Typography variant="h5" color={color} sx={{ mt: 0.5 }}>
                  {prefix}
                  {parseFloat(value || '0').toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}{' '}
                  <Typography component="span" variant="body2" color="text.secondary">
                    USDC
                  </Typography>
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
      )}
    </Card>
  );
}
