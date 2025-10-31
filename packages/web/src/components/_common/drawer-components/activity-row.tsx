// app/components/connected-wallet/tabs/activity-row.tsx

'use client';

import type { Activity } from '@/types/activity';

import { useTranslate } from '@/locales';
import { format, getCryptoIconUrl } from '@normalfinance/utils';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import { grey } from '@mui/material/colors';
import Typography from '@mui/material/Typography';

/* ------------------------------------------------------------------ */
/* Split avatar helper                                                */
/* ------------------------------------------------------------------ */
export function SplitAvatar({ left, right }: { left: string; right: string }) {
  return (
    <Box sx={{ width: 32, height: 32, position: 'relative' }}>
      <Avatar
        src={left ?? getCryptoIconUrl(left)}
        sx={{ width: 32, height: 32, position: 'absolute', clipPath: 'inset(0 16px 0 0)' }}
      />
      <Avatar
        src={right ?? getCryptoIconUrl(right)}
        sx={{ width: 32, height: 32, position: 'absolute', clipPath: 'inset(0 0 0 16px)' }}
      />
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Row component                                                      */
/* ------------------------------------------------------------------ */
export function ActivityRow({ activity }: { activity: Activity }) {
  const { t } = useTranslate();

  const time = format.ago(activity.timestamp / 1000);

  /* ---------- derive icon + sentence ---------------------------- */
  let icon: React.ReactNode;
  let sentence = '';

  switch (activity.type) {
    case 'Sent':
    case 'Receive': {
      const {
        token: { symbol, amount, iconUrl },
        address: otherAddress, // <— comes from the activity, not asset
        type,
      } = activity;

      icon = <Avatar src={iconUrl} sx={{ width: 32, height: 32 }} />;

      // Sent  ➜ "…to …",  Received ➜ "…from …"
      const preposition = type === 'Sent' ? 'to' : 'from';

      // Sent / Received use fShortenNumber; others use fCurrencyCompact
      sentence = `${amount} ${symbol} ${preposition} ${format.shortenAddress(otherAddress)}`;

      break;
    }
    case 'Add Liquidity':
    case 'Remove Liquidity': {
      const { tokenA, tokenB } = activity;
      icon = <SplitAvatar left={tokenA.iconUrl} right={tokenB.iconUrl} />;
      sentence = `${tokenA.amount} ${tokenA.symbol} and ${tokenB.amount} ${tokenB.symbol}`;
      break;
    }
    case 'Swap': {
      const { sell, buy } = activity;

      icon = <SplitAvatar left={sell.iconUrl} right={buy.iconUrl} />;
      sentence = `${sell.amount} ${sell.symbol} for ${buy.amount} ${buy.symbol}`;
      break;
    }
    default:
      icon = null;
  }

  /* ---------- UI ------------------------------------------------ */
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      {icon}

      <Stack sx={{ flexGrow: 1 }}>
        {/* first line */}
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="subtitle2">{activity.type}</Typography>
          <Typography variant="caption" color={grey[500]}>
            {time} {t('ago')}
          </Typography>
        </Stack>

        {/* second line */}
        <Typography variant="body2" color="text.secondary">
          {sentence}
        </Typography>
      </Stack>
    </Stack>
  );
}
