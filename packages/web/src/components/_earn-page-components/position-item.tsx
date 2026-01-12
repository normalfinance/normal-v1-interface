'use client';

import type { LiquidityPosition } from '@/hooks';

import Image from 'next/image';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';
import { useRouter } from 'next/navigation';
import { fCurrency } from '@/utils/format-number';

import { alpha, useTheme } from '@mui/material/styles';
import { Stack, Button, Avatar, Typography } from '@mui/material';

interface PositionItemProps {
  position: LiquidityPosition;
}

export default function PositionItem({ position }: PositionItemProps) {
  const theme = useTheme();
  const { t } = useTranslate('auto');
  const router = useRouter();

  const handleCardClick = () => {
    router.push(paths.assets.details(position.pair.asset));
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
          <Image
            src={cdn(`/tokens/n${position.pair.asset}.webp`)}
            alt={position.pair.asset}
            width={48}
            height={48}
          />
        </Avatar>

        <Stack direction="column" width={1} alignItems="start">
          <Typography component="span" color="text.primary" variant="h6" ml={1}>
            {position.pair.asset}
          </Typography>
        </Stack>
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

          <Typography color="text.primary" variant="body1">
            {position.balances.tokenShort.toFixed(7)} {t('USDC')} (
            {fCurrency(position.usdValues.tokenUSDC)})
          </Typography>

          <Typography color="text.secondary" variant="caption">
            {t('Balance')}
          </Typography>
        </Stack>
      </Stack>
    </Button>
  );
}
