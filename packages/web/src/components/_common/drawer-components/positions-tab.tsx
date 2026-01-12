'use client';

import type { LiquidityPosition } from '@/hooks';

import { useTranslate } from '@/locales';
import { fCurrency } from '@/utils/format-number';
import { getCryptoIconUrl } from '@normalfinance/utils';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { Stack, Button, Avatar, Typography } from '@mui/material';

export interface PoolsTabsProps {
  positions?: LiquidityPosition[];
}

export default function PositionsTab({ positions = [] }: PoolsTabsProps) {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  return (
    <Box sx={{ p: 2, pt: 0 }}>
      {positions.length > 0 ? (
        positions.map((position) => {
          const totalPositionValue = BigNumber(position.usdValues.tokenLong)
            .plus(position.usdValues.tokenShort)
            .plus(position.usdValues.tokenUSDC);

          return (
            <Button
              key={position.pair.pairAddress}
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
                    src={getCryptoIconUrl(position.pair.asset)}
                    alt={position.pair.asset}
                    sx={{ width: 25, height: 25, zIndex: 1 }}
                  />
                </Box>
                <Stack direction="column" width={1} alignItems="start">
                  <Typography component="span" color="text.primary" variant="h6" ml={1}>
                    {position.pair.asset}
                  </Typography>
                </Stack>
              </Stack>

              <Stack direction="row" width={1} mt={4} gap={3} alignItems="start">
                <Stack direction="column" alignItems="start">
                  <Typography color="text.primary" variant="body1">
                    {fCurrency(totalPositionValue)}
                  </Typography>

                  <Typography color="text.secondary" variant="caption">
                    {t('Balance')}
                  </Typography>
                </Stack>
              </Stack>
            </Button>
          );
        })
      ) : (
        <Typography>{t('No Earn balances found.')}</Typography>
      )}
    </Box>
  );
}
