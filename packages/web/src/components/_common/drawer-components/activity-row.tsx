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

  // `activity.timestamp` is ms (e.g. from Date.parse). `format.ago` expects Unix seconds.
  const createdAtSec = Number.isFinite(activity.timestamp)
    ? Math.floor(activity.timestamp / 1000)
    : Math.floor(Date.now() / 1000);
  const time = format.ago(createdAtSec);

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
      const { iconUrl, amount, symbol } = activity;
      icon = <Avatar src={iconUrl} sx={{ width: 32, height: 32 }} />;
      sentence = `${amount} ${symbol} pairs`;
      break;
    }
    case 'Mint': {
      const { iconUrl, amount, symbol } = activity;

      icon = <Avatar src={iconUrl} sx={{ width: 32, height: 32 }} />;
      sentence = `${amount} ${symbol} pairs`;
      break;
    }
    case 'Redeem': {
      const { iconUrl, amount, symbol } = activity;

      icon = <Avatar src={iconUrl} sx={{ width: 32, height: 32 }} />;
      sentence = `${amount} ${symbol} pairs`;
      break;
    }
    case 'Buy': {
      const { iconUrl, amount, symbol } = activity;

      icon = <Avatar src={iconUrl} sx={{ width: 32, height: 32 }} />;
      sentence = `${amount} ${symbol}`;
      break;
    }
    case 'Sell': {
      const { iconUrl, amount, symbol } = activity;

      icon = <Avatar src={iconUrl} sx={{ width: 32, height: 32 }} />;
      sentence = `${amount} ${symbol}`;
      break;
    }
    case 'Savings Deposit':
    case 'Savings Withdraw': {
      const { amount } = activity;
      icon = (
        <Avatar src={getCryptoIconUrl('usdc')} sx={{ width: 32, height: 32 }} />
      );
      sentence = `${amount} USDC`;
      break;
    }
    case 'Swap': {
      const {
        tokenIn: { symbol: sIn, amount: aIn, iconUrl: iIn },
        tokenOut: { symbol: sOut, amount: aOut, iconUrl: iOut },
      } = activity;
      icon = <SplitAvatar left={iIn} right={iOut} />;
      sentence = `${aIn} ${sIn} → ${aOut} ${sOut}`;
      break;
    }
    case 'Account sponsored': {
      icon = <Avatar src={getCryptoIconUrl('xlm')} sx={{ width: 32, height: 32 }} />;
      sentence = t('Sponsorship funded this account');
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
