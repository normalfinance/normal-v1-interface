'use client';

import type { LiquidityPosition } from '@/hooks';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import { fCurrency } from '@/utils/format-number';
import { getCryptoIconUrl } from '@normalfinance/utils';

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
        <Avatar
          src={getCryptoIconUrl(`n${position.pair.asset}`)}
          alt={position.pair.asset}
          sx={{ width: 56, height: 56, mb: 1 }}
        />

        <Stack direction="column" width={1} alignItems="start">
          <Typography component="span" color="text.primary" variant="h6" ml={1}>
            {position.pair.asset}
          </Typography>
        </Stack>
      </Stack>

      <Stack direction="row" width={1} mt={4} gap={3} alignItems="start">
        <Stack direction="column" alignItems="start">
          <Typography color="text.primary" variant="body1">
            {position.balances.long.toFixed(7)} {`n${position.pair.asset}`} (
            {fCurrency(position.usdValues.long)})
          </Typography>

          <Typography color="text.primary" variant="body1">
            {position.balances.short.toFixed(7)} {`sn${position.pair.asset}`} (
            {fCurrency(position.usdValues.short)})
          </Typography>

          <Typography color="text.primary" variant="body1">
            {position.balances.usdc.toFixed(7)} {t('USD')} ({fCurrency(position.usdValues.usdc)})
          </Typography>

          <Typography color="text.secondary" variant="caption">
            {t('Balance')}
          </Typography>
        </Stack>
      </Stack>
    </Button>
  );
}
