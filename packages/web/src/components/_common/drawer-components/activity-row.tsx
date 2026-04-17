// app/components/connected-wallet/tabs/activity-row.tsx

'use client';

import type { Activity } from '@/types/activity';

import { useState, useCallback } from 'react';
import { useTranslate } from '@/locales';
import { format, getCryptoIconUrl } from '@normalfinance/utils';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { grey } from '@mui/material/colors';
import Typography from '@mui/material/Typography';

import { Iconify } from '@/components/template/iconify';

/* ------------------------------------------------------------------ */
/* Iconify fallback (align with swap-card TOKENS)                      */
/* ------------------------------------------------------------------ */
function iconifyIconForSymbol(symbol: string): string {
  const u = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (u === 'XLM') return 'cryptocurrency:xlm';
  if (u === 'USDC') return 'cryptocurrency-color:usdc';
  const slug = symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (slug) return `cryptocurrency:${slug}`;
  return 'mdi:coins';
}

const ICON_BOX_SX = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  flexShrink: 0,
  bgcolor: 'action.hover',
} as const;

function ActivityTokenImage({
  src,
  symbol,
  size = 32,
}: {
  src: string;
  symbol: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(() => !src);

  const onError = useCallback(() => {
    setFailed(true);
  }, []);

  if (failed) {
    return (
      <Box sx={{ ...ICON_BOX_SX, width: size, height: size }} aria-hidden>
        <Iconify icon={iconifyIconForSymbol(symbol)} width={size * 0.65} />
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt=""
      onError={onError}
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        display: 'block',
        flexShrink: 0,
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Split avatar helper                                                */
/* ------------------------------------------------------------------ */
export function SplitAvatar({
  leftSrc,
  rightSrc,
  leftSymbol,
  rightSymbol,
}: {
  leftSrc: string;
  rightSrc: string;
  leftSymbol: string;
  rightSymbol: string;
}) {
  return (
    <Box sx={{ width: 32, height: 32, position: 'relative', flexShrink: 0 }}>
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 32,
          height: 32,
          clipPath: 'inset(0 16px 0 0)',
          overflow: 'hidden',
        }}
      >
        <ActivityTokenImage src={leftSrc} symbol={leftSymbol} size={32} />
      </Box>
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 32,
          height: 32,
          clipPath: 'inset(0 0 0 16px)',
          overflow: 'hidden',
        }}
      >
        <ActivityTokenImage src={rightSrc} symbol={rightSymbol} size={32} />
      </Box>
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
        address: otherAddress,
        type,
      } = activity;

      icon = (
        <ActivityTokenImage src={iconUrl || getCryptoIconUrl(symbol)} symbol={symbol} />
      );

      const preposition = type === 'Sent' ? 'to' : 'from';

      sentence = `${amount} ${symbol} ${preposition} ${format.shortenAddress(otherAddress)}`;

      break;
    }
    case 'Add Liquidity':
    case 'Remove Liquidity': {
      const { iconUrl, amount, symbol } = activity;
      icon = <ActivityTokenImage src={iconUrl || getCryptoIconUrl(symbol)} symbol={symbol} />;
      sentence = `${amount} ${symbol} pairs`;
      break;
    }
    case 'Mint': {
      const { iconUrl, amount, symbol } = activity;

      icon = <ActivityTokenImage src={iconUrl || getCryptoIconUrl(symbol)} symbol={symbol} />;
      sentence = `${amount} ${symbol} pairs`;
      break;
    }
    case 'Redeem': {
      const { iconUrl, amount, symbol } = activity;

      icon = <ActivityTokenImage src={iconUrl || getCryptoIconUrl(symbol)} symbol={symbol} />;
      sentence = `${amount} ${symbol} pairs`;
      break;
    }
    case 'Buy': {
      const { iconUrl, amount, symbol } = activity;

      icon = <ActivityTokenImage src={iconUrl || getCryptoIconUrl(symbol)} symbol={symbol} />;
      sentence = `${amount} ${symbol}`;
      break;
    }
    case 'Sell': {
      const { iconUrl, amount, symbol } = activity;

      icon = <ActivityTokenImage src={iconUrl || getCryptoIconUrl(symbol)} symbol={symbol} />;
      sentence = `${amount} ${symbol}`;
      break;
    }
    case 'Savings Deposit':
    case 'Savings Withdraw': {
      const { amount } = activity;
      icon = <ActivityTokenImage src={getCryptoIconUrl('USDC')} symbol="USDC" />;
      sentence = `${amount} USDC`;
      break;
    }
    case 'Swap': {
      const {
        tokenIn: { symbol: sIn, amount: aIn, iconUrl: iIn },
        tokenOut: { symbol: sOut, amount: aOut, iconUrl: iOut },
      } = activity;
      icon = (
        <SplitAvatar
          leftSrc={iIn || getCryptoIconUrl(sIn)}
          rightSrc={iOut || getCryptoIconUrl(sOut)}
          leftSymbol={sIn}
          rightSymbol={sOut}
        />
      );
      sentence = `${aIn} ${sIn} → ${aOut} ${sOut}`;
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
