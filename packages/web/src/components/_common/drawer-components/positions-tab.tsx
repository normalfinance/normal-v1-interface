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
        positions?.map((position) => {
          // FIXME: replace 1 with quoteTokenOraclePrice
          const positionFiatValue = BigNumber(1).multipliedBy(
            format.formatTokenAmount(position.balance)
          );

          return (
            <Button
              key={position.poolAddress}
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
                    src={getCryptoIconUrl(position.tokenA.name ?? '')}
                    alt="Token A"
                    sx={{ width: 25, height: 25, zIndex: 1 }}
                  />

                  <Avatar
                    src={getCryptoIconUrl(position.tokenB.name ?? '')}
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
                    {position.tokenA.name}
                    {t('/')}
                    {position.tokenB.name}
                  </Typography>
                </Stack>
              </Stack>

              <Stack direction="row" width={1} mt={4} gap={3} alignItems="start">
                <Stack direction="column" alignItems="start">
                  <Typography color="text.primary" variant="body1">
                    {}
                    {format.formatTokenAmount(position.balance)} {position.tokenA.name} (
                    {format.fCurrency(positionFiatValue.toFixed(2))})
                  </Typography>
                  <Typography color="text.secondary" variant="caption">
                    {t('Liquidity Provided')}
                  </Typography>
                </Stack>
              </Stack>
            </Button>
          );
        })
      ) : (
        <Typography>{t('No tokens match your search.')}</Typography>
      )}
    </Box>
  );
}
