'use client';

import type { PoolPosition } from '@/hooks';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import { format } from '@normalfinance/utils';
import { fPercent, fCurrency } from '@/utils/format-number';

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
    router.push(paths.assets.details(position.pool.addresses.pool));
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
        <PoolTokensAvatarGroup tokenA={position.tokenA} tokenB={position.tokenB} />

        <Stack direction="column" width={1} alignItems="start">
          <Typography component="span" color="text.primary" variant="h6" ml={1}>
            {position.tokenA.symbol}
            {t('/')}
            {position.tokenB.symbol}
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
                {fPercent(position.pool.fee / 100)}
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
                {position.pool.version}
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
            {position.balances.tokenA.toFixed(position.tokenA.decimals)} {position.tokenA.symbol} (
            {fCurrency(position.usdValues.tokenA)})
          </Typography>

          <Typography color="text.primary" variant="body1">
            {position.balances.tokenB.toFixed(position.tokenA.decimals)} {position.tokenB.symbol} (
            {fCurrency(position.usdValues.tokenB)})
          </Typography>
          <Typography color="text.secondary" variant="caption">
            {t('Liquidity Provided')}
          </Typography>
        </Stack>

        <Stack direction="column" alignItems="start">
          <Typography color="text.primary" variant="body1">
            {format.fTokenAmount(position.balances.feeA)} {position.tokenA.symbol} (
            {fCurrency(position.usdValues.feeA)})
          </Typography>

          <Typography color="text.primary" variant="body1">
            {format.fTokenAmount(position.balances.feeB)} {position.tokenB.symbol} (
            {fCurrency(position.usdValues.feeB)})
          </Typography>
          <Typography color="text.secondary" variant="caption">
            {t('Fees')}
          </Typography>
        </Stack>
      </Stack>
    </Button>
  );
}
