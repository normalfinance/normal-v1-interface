'use client';

import type { PoolPosition } from '@/hooks';

import { useTranslate } from '@/locales';
import { format, getCryptoIconUrl } from '@normalfinance/utils';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { Stack, Avatar, Button, Typography } from '@mui/material';

export interface PoolsTabsProps {
  positions?: PoolPosition[];
}

export default function PositionsTab({ positions = [] }: PoolsTabsProps) {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  return (
    <Box sx={{ p: 2, pt: 0 }}>
      {positions.length > 0 ? (
        positions.map((position) => (
          <Button
            key={position.pool.address}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              padding: 2,
              mb: 2,
              width: '100%',
              alignItems: 'center',
              borderRadius: '16px',
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Stack direction="row" width={1} alignItems="center">
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                }}
              >
                <Avatar
                  src={position.tokenA.icon ?? getCryptoIconUrl(position.tokenA.symbol)}
                  alt="Token A"
                  sx={{ width: 25, height: 25, zIndex: 1 }}
                />

                <Avatar
                  src={position.tokenB.icon ?? getCryptoIconUrl(position.tokenB.symbol)}
                  alt="Token B"
                  sx={{
                    width: 25,
                    height: 25,
                    ml: '-12px',
                  }}
                />
              </Box>
              <Stack direction="column" width={1} alignItems="start">
                <Typography component="span" color="text.primary" variant="h6" ml={1}>
                  {position.tokenA.symbol}
                  {t('/')}
                  {position.tokenB.symbol}
                </Typography>
              </Stack>
            </Stack>

            <Stack direction="row" width={1} mt={4} gap={3} alignItems="start">
              <Stack direction="column" alignItems="start">
                <Typography color="text.primary" variant="body1">
                  {position.balances.tokenA} {position.tokenA.symbol} (
                  {format.fCurrency(position.usdValues.tokenA)}){position.balances.tokenB}{' '}
                  {position.tokenB.symbol} ({format.fCurrency(position.usdValues.tokenB)})
                </Typography>
                <Typography color="text.secondary" variant="caption">
                  {t('Liquidity Provided')}
                </Typography>
              </Stack>
            </Stack>
          </Button>
        ))
      ) : (
        <Typography>{t('No tokens match your search.')}</Typography>
      )}
    </Box>
  );
}
