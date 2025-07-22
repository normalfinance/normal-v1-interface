'use client';

import type { PoolPosition } from '@/hooks';

import { useTranslate } from '@/locales';
import { fPercent } from '@/utils/format-number';
import { getCryptoIconUrl } from '@normalfinance/utils';

import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import { Stack, Avatar, Button, Typography } from '@mui/material';

export interface PoolsTabsProps {
  positions?: PoolPosition[];
}

export default function PositioinsTab({ positions = [] }: { positions: PoolPosition[] }) {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  return (
    <Box sx={{ p: 2, pt: 0 }}>
      {positions.length > 0 ? (
        positions?.map((position) => (
          <Button
            key={position.poolAddress}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              padding: 2,
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
                  sx={{ width: 40, height: 40 }}
                />

                <Avatar
                  src={getCryptoIconUrl(position.tokenB.name ?? '')}
                  alt="Token B"
                  sx={{
                    width: 40,
                    height: 40,
                    ml: '-12px',
                    zIndex: 1,
                  }}
                />
              </Box>
              <Stack direction="column" width={1} alignItems="start">
                <Typography component="span" color="text.primary" variant="h6" ml={1}>
                  {position.tokenA.name}
                  {t('/')}
                  {position.tokenB.name}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                    }}
                  >
                    <Typography
                      color="text.primary"
                      variant="caption"
                      ml={1}
                      sx={{
                        backgroundColor: alpha(theme.palette.grey[500], 0.08),
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: '4px',
                        px: '6px',
                        py: '2px',
                      }}
                    >
                      {fPercent(position.poolFee)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                    }}
                  >
                    <Typography
                      color="text.primary"
                      variant="caption"
                      ml={1}
                      sx={{
                        backgroundColor: alpha(theme.palette.grey[500], 0.08),
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: '4px',
                        px: '6px',
                        py: '2px',
                      }}
                    >
                      {position.poolVersion}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Stack>

            <Stack direction="row" width={1} mt={4} gap={3} alignItems="start">
              <Stack direction="column" alignItems="start">
                <Typography color="text.primary" variant="body1">
                   {/* {fCurrency(pool.performance?.position)} */}
                  {position.balance}
                </Typography>
                <Typography color="text.secondary" variant="caption">
                  {t('Position')}
                </Typography>
              </Stack>

              <Stack direction="column" alignItems="start">
                <Typography color="text.primary" variant="body1">
                  {/* {fCurrency(position.performance?.fees)} */}
                  {t('Coming soon')}
                </Typography>
                <Typography color="text.secondary" variant="caption">
                  {t('Fees')}
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
