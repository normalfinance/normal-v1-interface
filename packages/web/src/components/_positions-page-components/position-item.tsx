'use client';

import type { PoolPosition } from '@/hooks';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import { fPercent } from '@/utils/format-number';

import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import { Stack, Button, Typography, IconButton } from '@mui/material';

import { Iconify } from '../template/iconify';
import PoolTokensAvatarGroup from '../_common/pool-tokens-avatar-group';

interface PositionItemProps {
  position: PoolPosition;
  onWithdraw: () => void;
}

export default function PositionItem({ position, onWithdraw }: PositionItemProps) {
  const theme = useTheme();
  const { t } = useTranslate('auto');
  const router = useRouter();

  const handleCardClick = () => {
    router.push(paths.pools.details(position.poolAddress));
  };
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
        // href={paths.pools.details(position.poolAddress)}
        onClick={handleCardClick}
      >
        <Stack direction="row" width={1} alignItems="center">
          <PoolTokensAvatarGroup
            tokenAName={position.tokenA.name}
            tokenBName={position.tokenB.name}
          />

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

          <IconButton
            onClick={(e) => {
              e.stopPropagation(); // Prevents outer button from triggering
              onWithdraw();
            }}
            sx={{ top: 8, right: 8, position: 'absolute', color: 'error.main' }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" />
          </IconButton>
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
              {/* {fCurrency(pool.performance?.fees)} */}
              {t('Coming soon')}
            </Typography>
            <Typography color="text.secondary" variant="caption">
              {t('Fees')}
            </Typography>
          </Stack>
        </Stack>
      </Button>
    </Box>
  );
}
