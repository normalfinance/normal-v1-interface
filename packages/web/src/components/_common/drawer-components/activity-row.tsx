// app/components/connected-wallet/tabs/activity-row.tsx

'use client';

import type { Activity } from '@/types/activity';

import { useTranslate } from '@/locales';
import { useState, useCallback } from 'react';
import { format, getCryptoIconUrl } from '@normalfinance/utils';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import MonetizationOnOutlined from '@mui/icons-material/MonetizationOnOutlined';

const ICON_BOX_SX = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  flexShrink: 0,
  bgcolor: 'rgba(10,10,15,0.06)',
} as const;

const MONO = {
  fontFamily: '"Geist Mono", ui-monospace, monospace',
  fontFeatureSettings: '"ss01","ss02","zero"',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '-0.01em',
} as const;

function ActivityTokenImage({
  src,
  symbol: _symbol,
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
        <MonetizationOnOutlined sx={{ fontSize: size * 0.65 }} />
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
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
function fmtAmount(amount: number, symbol: string): string {
  return `${amount.toFixed(7)} ${symbol}`;
}

function fmtUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/* ------------------------------------------------------------------ */
/* Row component                                                      */
/* ------------------------------------------------------------------ */
export function ActivityRow({ activity }: { activity: Activity }) {
  const { t } = useTranslate();

  const createdAtSec = Number.isFinite(activity.timestamp)
    ? Math.floor(activity.timestamp / 1000)
    : Math.floor(Date.now() / 1000);
  const time = format.ago(createdAtSec);

  type ChipConfig = { label: string; color: string; bg: string };
  // Palette anchored to #1AB37D (savings green) + brand gradient colors
  const CHIP: Record<string, ChipConfig> = {
    'Buy':              { label: 'On-Ramp',         color: '#0A6649', bg: 'rgba(26,179,125,0.11)' },
    'Sell':             { label: 'Off-Ramp',         color: '#8A4A00', bg: 'rgba(255,176,96,0.16)'  },
    'Receive':          { label: 'Received',         color: '#0A5272', bg: 'rgba(91,207,255,0.14)'  },
    'Sent':             { label: 'Sent',             color: '#2A2A33', bg: 'rgba(10,10,15,0.07)'    },
    'Swap':             { label: 'Swap',             color: '#5A2E9E', bg: 'rgba(177,123,255,0.13)' },
    'Savings Deposit':  { label: 'Deposit',          color: '#0A6649', bg: 'rgba(26,179,125,0.11)'  },
    'Savings Withdraw': { label: 'Withdraw',         color: '#2A2A33', bg: 'rgba(10,10,15,0.07)'    },
    'Mint':             { label: 'Mint',             color: '#0A6649', bg: 'rgba(26,179,125,0.11)'  },
    'Redeem':           { label: 'Redeem',           color: '#8A4A00', bg: 'rgba(255,176,96,0.16)'  },
    'Add Liquidity':    { label: 'Add Liquidity',    color: '#0A5272', bg: 'rgba(91,207,255,0.14)'  },
    'Remove Liquidity': { label: 'Remove Liquidity', color: '#7A1D4A', bg: 'rgba(255,123,197,0.12)' },
  };
  const chip = CHIP[activity.type] ?? { label: activity.type, color: '#2A2A33', bg: 'rgba(10,10,15,0.07)' };
  const isPendingBtc =
    (activity.type === 'Sent' || activity.type === 'Receive') &&
    activity.confirmed === false;

  let icon: React.ReactNode = null;
  let amountStr = '';
  let subtitle = '';
  let isPositive: boolean | null = null;
  let usdStr: string | null = null;

  switch (activity.type) {
    case 'Receive': {
      const { token: { symbol, amount, iconUrl }, address } = activity;
      icon = <ActivityTokenImage src={iconUrl || getCryptoIconUrl(symbol)} symbol={symbol} />;
      amountStr = fmtAmount(amount, symbol);
      subtitle = `From ${format.shortenAddress(address)}`;
      isPositive = true;
      usdStr = symbol === 'USDC' ? fmtUsd(amount) : fmtAmount(amount, symbol);
      break;
    }
    case 'Sent': {
      const { token: { symbol, amount, iconUrl }, address } = activity;
      icon = <ActivityTokenImage src={iconUrl || getCryptoIconUrl(symbol)} symbol={symbol} />;
      amountStr = fmtAmount(amount, symbol);
      subtitle = `To ${format.shortenAddress(address)}`;
      isPositive = false;
      usdStr = symbol === 'USDC' ? fmtUsd(amount) : fmtAmount(amount, symbol);
      break;
    }
    case 'Buy': {
      const { iconUrl, amount, symbol, provider } = activity;
      icon = <ActivityTokenImage src={iconUrl || getCryptoIconUrl(symbol)} symbol={symbol} />;
      amountStr = fmtAmount(amount, symbol);
      subtitle = provider ?? '';
      isPositive = true;
      usdStr = symbol === 'USDC' ? fmtUsd(amount) : fmtAmount(amount, symbol);
      break;
    }
    case 'Sell': {
      const { iconUrl, amount, symbol, provider } = activity;
      icon = <ActivityTokenImage src={iconUrl || getCryptoIconUrl(symbol)} symbol={symbol} />;
      amountStr = fmtAmount(amount, symbol);
      subtitle = provider ?? '';
      isPositive = false;
      usdStr = symbol === 'USDC' ? fmtUsd(amount) : fmtAmount(amount, symbol);
      break;
    }
    case 'Savings Deposit': {
      const { amount } = activity;
      icon = <ActivityTokenImage src={getCryptoIconUrl('USDC')} symbol="USDC" />;
      amountStr = fmtAmount(parseFloat(amount), 'USDC');
      subtitle = 'Normal Savings';
      isPositive = true;
      usdStr = fmtUsd(parseFloat(amount));
      break;
    }
    case 'Savings Withdraw': {
      const { amount } = activity;
      icon = <ActivityTokenImage src={getCryptoIconUrl('USDC')} symbol="USDC" />;
      amountStr = fmtAmount(parseFloat(amount), 'USDC');
      subtitle = 'Normal Savings';
      isPositive = false;
      usdStr = fmtUsd(parseFloat(amount));
      break;
    }
    case 'Swap': {
      const { tokenIn: { symbol: sIn, amount: aIn, iconUrl: iIn }, tokenOut: { symbol: sOut, amount: aOut, iconUrl: iOut } } = activity;
      icon = (
        <SplitAvatar
          leftSrc={iIn || getCryptoIconUrl(sIn)}
          rightSrc={iOut || getCryptoIconUrl(sOut)}
          leftSymbol={sIn}
          rightSymbol={sOut}
        />
      );
      amountStr = `${fmtAmount(aIn, sIn)} → ${fmtAmount(aOut, sOut)}`;
      isPositive = null;
      if (sOut === 'USDC') usdStr = fmtUsd(aOut);
      else if (sIn === 'USDC') usdStr = fmtUsd(aIn);
      else usdStr = fmtAmount(aOut, sOut);
      break;
    }
    case 'Add Liquidity':
    case 'Remove Liquidity':
    case 'Mint':
    case 'Redeem': {
      const { iconUrl, amount, symbol } = activity;
      icon = <ActivityTokenImage src={iconUrl || getCryptoIconUrl(symbol)} symbol={symbol} />;
      amountStr = fmtAmount(amount, symbol);
      isPositive = null;
      usdStr = symbol === 'USDC' ? fmtUsd(amount) : fmtAmount(amount, symbol);
      break;
    }
    default:
      break;
  }

  const amountColor = isPositive === true ? '#1AB37D' : '#0A0A0F';
  const amountPrefix = isPositive === true ? '+' : '';

  /* ---------- UI ------------------------------------------------ */
  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      sx={{ borderRadius: '12px', padding: '4px 8px', mx: '-8px', transition: 'background .15s ease', '&:hover': { bgcolor: 'rgba(10,10,15,0.03)' } }}
    >
      {icon}

      <Stack direction="row" sx={{ flexGrow: 1 }} alignItems="center" justifyContent="space-between">
        {/* left: chip + amount + subtitle */}
        <Stack spacing={0.4} alignItems="flex-start">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Chip
              label={chip.label}
              size="small"
              sx={{
                height: 20,
                fontSize: '11px',
                fontWeight: 600,
                color: chip.color,
                bgcolor: chip.bg,
                borderRadius: '6px',
                '& .MuiChip-label': { px: '8px' },
              }}
            />
            {isPendingBtc && (
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 20,
                  px: '7px',
                  borderRadius: '6px',
                  bgcolor: 'rgba(245,158,11,0.1)',
                  color: '#B45309',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                Pending
              </Box>
            )}
          </Box>
          {amountStr && (
            <Typography sx={{ fontSize: '12px', color: '#6B6B76', ...MONO }}>
              {amountStr}
            </Typography>
          )}
          {subtitle && (
            <Typography sx={{ fontSize: '11.5px', color: '#9A9AA3' }}>
              {subtitle}
            </Typography>
          )}
        </Stack>

        {/* right: usd value + time */}
        <Stack alignItems="flex-end" spacing={0.2}>
          {usdStr && (
            <Typography sx={{ fontSize: '13.5px', fontWeight: 400, color: amountColor, ...MONO }}>
              {amountPrefix}{usdStr}
            </Typography>
          )}
          <Typography sx={{ fontSize: '11px', color: '#9A9AA3', ...MONO }}>
            {time} {t('ago')}
          </Typography>
        </Stack>
      </Stack>
    </Stack>
  );
}
