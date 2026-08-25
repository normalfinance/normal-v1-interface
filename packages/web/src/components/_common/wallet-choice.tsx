'use client';

// Which wallet a ramp uses — the visible half of doc 88 B1.
//
// Renders the options from lib/wallet-options as the same pill row the swap
// card uses (one system, one look). Two modes by construction:
//   - several options → a real choice, balances shown beside each
//   - exactly one     → a named line, no buttons: the user still SEES which
//     wallet the ramp will use, which is the half of the fix that applies to
//     everyone (the old dialogs named nothing)

import type { WalletOption } from '@/lib/wallet-options';

import { useTranslate } from '@/locales/use-locales';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

interface Props {
  options: WalletOption[];
  /** Key of the selected option (controlled by the dialog). */
  selectedKey: string | null;
  onSelect: (option: WalletOption) => void;
  /** "Where should it arrive?" / "Which wallet are you selling from?" /
   *  "Which wallet is this send leaving from?" */
  flow: 'onramp' | 'offramp' | 'send';
  /** Symbol used next to balances, e.g. USDC. */
  symbol?: string;
}

const fmtBal = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: n < 1 ? 4 : 2 });

export default function WalletChoice({ options, selectedKey, onSelect, flow, symbol }: Props) {
  const { t } = useTranslate();
  if (options.length === 0) return null;

  // One wallet: name it, plainly. No control that does nothing.
  if (options.length === 1) {
    const only = options[0];
    return (
      <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.55)', mb: '10px' }}>
        {flow === 'onramp'
          ? t('Funds will arrive in {{label}}', { label: only.label })
          : flow === 'send'
            ? t('Sending from {{label}}', { label: only.label })
            : t('Selling from {{label}}', { label: only.label })}
        {only.balance != null && symbol ? ` · ${fmtBal(only.balance)} ${symbol}` : ''}
      </Typography>
    );
  }

  return (
    <Box sx={{ mb: '12px' }}>
      <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.55)', mb: '6px' }}>
        {flow === 'onramp' ? t('Deposit to') : flow === 'send' ? t('Send from') : t('Sell from')}
      </Typography>
      <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: '6px' }}>
        {options.map((opt) => {
          const selected = selectedKey === opt.key;
          return (
            <Box
              key={opt.key}
              component="button"
              type="button"
              onClick={() => onSelect(opt)}
              sx={{
                appearance: 'none',
                border: selected ? '1px solid rgba(10,10,15,0.9)' : '1px solid rgba(10,10,15,0.12)',
                borderRadius: '999px',
                px: '11px',
                py: '5px',
                fontSize: '11.5px',
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
                bgcolor: selected ? '#0A0A0F' : 'transparent',
                color: selected ? '#fff' : '#6B6B76',
                transition: 'all .15s ease',
                '&:hover': selected ? {} : { borderColor: 'rgba(10,10,15,0.3)' },
                '&:focus-visible': { outline: '2px solid #0A0A0F', outlineOffset: '2px' },
              }}
            >
              {opt.label}
              {opt.balance != null ? ` · ${fmtBal(opt.balance)}${symbol ? ` ${symbol}` : ''}` : ''}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
