'use client';

import type { LiquidityPosition } from '@/hooks';

import { useTranslate } from '@/locales';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { Stack, Button, Typography } from '@mui/material';

export interface PoolsTabsProps {
  positions?: LiquidityPosition[];
}

export default function PositionsTab({ positions = [] }: PoolsTabsProps) {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  return (
    <Box sx={{ p: 2, pt: 0 }}>
      {positions.length > 0 ? (
        positions.map((position) => (
          <Button
            key={position.pair.addresses.pair}
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
                {/* <Avatar
                  src={position.tokenA.icon ?? getCryptoIconUrl(position.tokenA.symbol)}
                  alt="Token A"
                  sx={{ width: 25, height: 25, zIndex: 1 }}
                /> */}
              </Box>
              <Stack direction="column" width={1} alignItems="start">
                <Typography component="span" color="text.primary" variant="h6" ml={1}>
                  {/* {position.tokenA.symbol} */}
                </Typography>
              </Stack>
            </Stack>

            <Stack direction="row" width={1} mt={4} gap={3} alignItems="start">
              <Stack direction="column" alignItems="start">
                {/* <Typography color="text.primary" variant="body1">
                  {position.balances.tokenA.toFixed(position.tokenA.decimals)}{' '}
                  {position.tokenA.symbol} ({fCurrency(position.usdValues.tokenA)})
                  {position.balances.tokenB.toFixed(position.tokenB.decimals)}{' '}
                  {position.tokenB.symbol} ({fCurrency(position.usdValues.tokenB)})
                </Typography> */}
                <Typography color="text.secondary" variant="caption">
                  {t('Liquidity Provided')}
                </Typography>
              </Stack>
            </Stack>
          </Button>
        ))
      ) : (
        <Typography>{t('No positions found.')}</Typography>
      )}
    </Box>
  );
}
