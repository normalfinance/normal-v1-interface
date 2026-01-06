'use client';

import type { LiquidityPosition } from '@/hooks';

import Image from 'next/image';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';
import { useRouter } from 'next/navigation';
import { fPercent, fCurrency } from '@/utils/format-number';

import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import { Stack, Button, Avatar, Typography, IconButton } from '@mui/material';

import { Iconify } from '../template/iconify';

interface PositionItemProps {
  position: LiquidityPosition;
  onWithdraw: () => void;
}

export default function PositionItem({ position, onWithdraw }: PositionItemProps) {
  const theme = useTheme();
  const { t } = useTranslate('auto');
  const router = useRouter();

  const handleCardClick = () => {
    router.push(paths.assets.details('LONG')); // FIXME:
  };

  return (
    <Button
      sx={{
        display: 'flex',
        flexDirection: 'column',
        padding: 4,
        width: '100%',
        alignItems: 'center',
        borderRadius: 3,
        border: 1,
        borderColor: alpha(theme.palette.grey[500], 0.32),
        bgcolor: 'white',
      }}
      onClick={handleCardClick}
    >
      <Stack direction="row" width={1} alignItems="center">
        <Avatar sx={{ width: 56, height: 56, bgcolor: 'transparent', mb: 1 }}>
          <Image src={cdn('/tokens/usdc.webp')} alt={t('testing')} width={48} height={48} />
        </Avatar>

        <Stack direction="column" width={1} alignItems="start">
          <Typography component="span" color="text.primary" variant="h6" ml={1}>
            {t('Asset Name here')}
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
                {fPercent(30)}
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
                {t('v1')}
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
            {position.balances.tokenLong.toFixed(7)} {t('LONG')} (
            {fCurrency(position.usdValues.tokenLong)})
          </Typography>

          <Typography color="text.primary" variant="body1">
            {position.balances.tokenShort.toFixed(7)} {t('SHORT')} (
            {fCurrency(position.usdValues.tokenShort)})
          </Typography>
          <Typography color="text.secondary" variant="caption">
            {t('Balance')}
          </Typography>
        </Stack>
      </Stack>
    </Button>
  );
}
