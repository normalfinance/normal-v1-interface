'use client';

import { useTranslate } from '@/locales';
import { fRawPercent, fCurrencyTwoDecimals } from '@/utils/format-number';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from '@/components/template/iconify';

interface MyBalanceHeaderProps {
  totalBalance: number;
  percentageChange?: number;
}

export default function MyBalanceHeader({
  totalBalance,
  percentageChange = 0,
}: MyBalanceHeaderProps) {
  const { t } = useTranslate();
  const theme = useTheme();

  const isPositive = percentageChange >= 0;
  const changeColor = isPositive ? theme.palette.success.main : theme.palette.error.main;

  return (
    <Stack
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: alpha(theme.palette.grey[500], 0.08),
      }}
    >
      <Typography variant="subtitle2" color="text.secondary">
        {t('My Balance')}
      </Typography>

      <Stack direction="row" alignItems="baseline" spacing={2}>
        <Typography
          variant="h2"
          sx={{
            fontSize: { xs: '32px', md: '48px' },
            fontWeight: 600,
            lineHeight: 1.2,
          }}
        >
          {fCurrencyTwoDecimals(totalBalance)}
        </Typography>

        {percentageChange !== 0 && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              color: changeColor,
            }}
          >
            <Iconify
              icon={isPositive ? 'eva:trending-up-fill' : 'eva:trending-down-fill'}
              width={20}
            />
            <Typography variant="subtitle2" sx={{ color: 'inherit' }}>
              {isPositive ? '+' : ''}
              {fRawPercent(percentageChange)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('24h')}
            </Typography>
          </Box>
        )}
      </Stack>
    </Stack>
  );
}
