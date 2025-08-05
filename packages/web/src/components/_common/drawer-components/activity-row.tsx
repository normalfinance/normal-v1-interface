// app/components/connected-wallet/tabs/activity-row.tsx

'use client';

import type { Activity } from '@/types/activity';

import { useTranslate } from '@/locales';
import { ago } from '@/utils/format-time';
import { shortenAddress } from '@/utils/format-address';
import { getCryptoIconUrl } from '@normalfinance/utils';
import { fTruncate } from '@normalfinance/utils/build/format';
import { fShortenNumber, fCurrencyCompact } from '@/utils/format-number';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import { grey } from '@mui/material/colors';
import Typography from '@mui/material/Typography';

/* ------------------------------------------------------------------ */
/* Split avatar helper                                                */
/* ------------------------------------------------------------------ */
function SplitAvatar({ left, right }: { left: string; right: string }) {
  return (
    <Box sx={{ width: 32, height: 32, position: 'relative' }}>
      <Avatar
        src={getCryptoIconUrl(left)}
        sx={{ width: 32, height: 32, position: 'absolute', clipPath: 'inset(0 16px 0 0)' }}
      />
      <Avatar
        src={getCryptoIconUrl(right)}
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

  const time = ago(activity.timestamp / 1000);
  // new Date(activity.timestamp).toLocaleTimeString();

  /* ---------- derive icon + sentence ---------------------------- */
  let icon: React.ReactNode;
  let sentence = '';

  switch (activity.type) {
    case 'Sent':
    case 'Received': {
      const {
        asset: { token, amount, iconUrl },
        address, // <— comes from the activity, not asset
        type,
      } = activity;

      icon = <Avatar src={iconUrl} sx={{ width: 32, height: 32 }} />;

      // Sent  ➜ "…to …",  Received ➜ "…from …"
      const preposition = type === 'Sent' ? 'to' : 'from';

      // Sent / Received use fShortenNumber; others use fCurrencyCompact
      sentence = `${fShortenNumber(amount)} ${token} ${preposition} ${shortenAddress(address)}`;

      break;
    }
    case 'Stake':
    case 'Unstake': {
      const { token, amount, iconUrl } = activity.asset;
      icon = <Avatar src={iconUrl} sx={{ width: 32, height: 32 }} />;
      sentence = `${fCurrencyCompact(amount)} ${token}`;
      break;
    }
    case 'Add Liquidity':
    case 'Remove Liquidity': {
      const { token, amount, iconUrl } = activity.tokenB;
      icon = <Avatar src={iconUrl} sx={{ width: 32, height: 32 }} />;
      sentence = `${fCurrencyCompact(amount)} ${fTruncate(token, 15)}`;
      break;
    }
    case 'Swapped': {
      const {
        sell: { token: sTok, amount: sAmt },
        buy: { token: bTok, amount: bAmt },
      } = activity;

      icon = <SplitAvatar left={sTok} right={bTok} />;
      sentence = `${fShortenNumber(sAmt)} ${sTok} for ${fShortenNumber(bAmt)} ${bTok}`;
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
