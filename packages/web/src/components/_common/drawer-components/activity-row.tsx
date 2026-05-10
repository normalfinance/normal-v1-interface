// app/components/connected-wallet/tabs/activity-row.tsx

'use client';

import type { Activity } from '@/types/activity';

import { useTranslate } from '@/locales';
import { useState, useCallback } from 'react';
import { format, getCryptoIconUrl } from '@normalfinance/utils';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
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
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
function fmtAmount(amount: number, symbol: string): string {
  if (symbol === 'USDC') return `${amount.toFixed(2)} USDC`;
  if (symbol === 'XLM') return `${amount.toFixed(4)} XLM`;
  return `${amount.toFixed(4)} ${symbol}`;
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
  const CHIP: Record<string, ChipConfig> = {
    'Buy':              { label: 'On-Ramp',         color: '#0a6640', bg: '#d3f9d8' },
    'Sell':             { label: 'Off-Ramp',         color: '#7d4a00', bg: '#ffe8cc' },
    'Receive':          { label: 'Received',         color: '#0c4a6e', bg: '#e0f2fe' },
    'Sent':             { label: 'Sent',             color: '#374151', bg: '#f3f4f6' },
    'Swap':             { label: 'Swap',             color: '#1e3a8a', bg: '#dbeafe' },
    'Savings Deposit':  { label: 'Savings Deposit',  color: '#4a1d96', bg: '#f3e8ff' },
    'Savings Withdraw': { label: 'Savings Withdraw', color: '#7d1d1d', bg: '#fee2e2' },
    'Mint':             { label: 'Mint',             color: '#065f46', bg: '#d1fae5' },
    'Redeem':           { label: 'Redeem',           color: '#7d4a00', bg: '#fef3c7' },
    'Add Liquidity':    { label: 'Add Liquidity',    color: '#065f46', bg: '#d1fae5' },
    'Remove Liquidity': { label: 'Remove Liquidity', color: '#7d1d1d', bg: '#fee2e2' },
  };
  const chip = CHIP[activity.type] ?? { label: activity.type, color: '#374151', bg: '#f3f4f6' };

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
      if (symbol === 'USDC') usdStr = `$${amount.toFixed(2)}`;
      break;
    }
    case 'Sent': {
      const { token: { symbol, amount, iconUrl }, address } = activity;
      icon = <ActivityTokenImage src={iconUrl || getCryptoIconUrl(symbol)} symbol={symbol} />;
      amountStr = fmtAmount(amount, symbol);
      subtitle = `To ${format.shortenAddress(address)}`;
      isPositive = false;
      if (symbol === 'USDC') usdStr = `$${amount.toFixed(2)}`;
      break;
    }
    case 'Buy': {
      const { iconUrl, amount, symbol, provider } = activity;
      icon = <ActivityTokenImage src={iconUrl || getCryptoIconUrl(symbol)} symbol={symbol} />;
      amountStr = fmtAmount(amount, symbol);
      subtitle = provider ?? '';
      isPositive = true;
      usdStr = `$${amount.toFixed(2)}`;
      break;
    }
    case 'Sell': {
      const { iconUrl, amount, symbol, provider } = activity;
      icon = <ActivityTokenImage src={iconUrl || getCryptoIconUrl(symbol)} symbol={symbol} />;
      amountStr = fmtAmount(amount, symbol);
      subtitle = provider ?? '';
      isPositive = false;
      usdStr = `$${amount.toFixed(2)}`;
      break;
    }
    case 'Savings Deposit': {
      const { amount } = activity;
      icon = <ActivityTokenImage src={getCryptoIconUrl('USDC')} symbol="USDC" />;
      amountStr = fmtAmount(parseFloat(amount), 'USDC');
      subtitle = 'Normal Savings';
      isPositive = true;
      usdStr = `$${parseFloat(amount).toFixed(2)}`;
      break;
    }
    case 'Savings Withdraw': {
      const { amount } = activity;
      icon = <ActivityTokenImage src={getCryptoIconUrl('USDC')} symbol="USDC" />;
      amountStr = fmtAmount(parseFloat(amount), 'USDC');
      subtitle = 'Normal Savings';
      isPositive = false;
      usdStr = `$${parseFloat(amount).toFixed(2)}`;
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
      if (sOut === 'USDC') usdStr = `$${aOut.toFixed(2)}`;
      else if (sIn === 'USDC') usdStr = `$${aIn.toFixed(2)}`;
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
      if (symbol === 'USDC') usdStr = `$${amount.toFixed(2)}`;
      break;
    }
    default:
      break;
  }

  const amountColor = isPositive === true ? 'success.main' : 'text.primary';
  const amountPrefix = isPositive === true ? '+' : '';

  /* ---------- UI ------------------------------------------------ */
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      {icon}

      <Stack direction="row" sx={{ flexGrow: 1 }} alignItems="center" justifyContent="space-between">
        {/* left: chip + amount + subtitle */}
        <Stack spacing={0.3} alignItems="flex-start">
          <Chip
            label={chip.label}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.7rem',
              fontWeight: 600,
              color: chip.color,
              bgcolor: chip.bg,
              borderRadius: '6px',
              '& .MuiChip-label': { px: 1 },
            }}
          />
          {amountStr && (
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              {amountStr}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="caption" color="text.disabled">
              {subtitle}
            </Typography>
          )}
        </Stack>

        {/* right: usd value + time */}
        <Stack alignItems="flex-end" spacing={0.2}>
          {usdStr && (
            <Typography variant="subtitle2" fontWeight={600} color={amountColor}>
              {amountPrefix}{usdStr}
            </Typography>
          )}
          <Typography variant="caption" color={grey[500]}>
            {time} {t('ago')}
          </Typography>
        </Stack>
      </Stack>
    </Stack>
  );
}
