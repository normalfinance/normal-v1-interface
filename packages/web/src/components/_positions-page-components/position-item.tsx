'use client';

import { useTranslate } from '@/locales';
import { fPercent } from '@/utils/format-number';

import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import { Stack, Button, Typography } from '@mui/material';

import PoolTokensAvatarGroup from '../_common/pool-tokens-avatar-group';

export interface PositionItemProps {
  pool: {
    fee: number;
    name: string;
  };
  position: any;
}

export default function PositionItem({ position, pool }: PositionItemProps) {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  return (
    <Box sx={{ p: 2, pt: 0 }}>
      <Button
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
          <PoolTokensAvatarGroup tokenAName="" tokenBName="" />

          <Stack direction="column" width={1} alignItems="start">
            <Typography component="span" color="text.primary" variant="h6" ml={1}>
              {/* {pool.pairInfo?.tokenA.name}
              {t('/')}
              {pool.pairInfo?.tokenB.name} */}
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
                  {fPercent(pool.fee)}
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
                  // eslint-disable-next-line i18next/no-literal-string
                >
                  v1
                </Typography>
              </Box>
            </Box>
          </Stack>
        </Stack>

        {/* <Stack direction="row" width={1} mt={4} gap={3} alignItems="start">
          <Stack direction="column" alignItems="start">
            <Typography color="text.primary" variant="body1">
              {fCurrency(pool.performance?.position)}
            </Typography>
            <Typography color="text.secondary" variant="caption">
              {t('Position')}
            </Typography>
          </Stack>

          <Stack direction="column" alignItems="start">
            <Typography color="text.primary" variant="body1">
              {fCurrency(pool.performance?.fees)}
            </Typography>
            <Typography color="text.secondary" variant="caption">
              {t('Fees')}
            </Typography>
          </Stack>
        </Stack> */}
      </Button>
    </Box>
  );
}
