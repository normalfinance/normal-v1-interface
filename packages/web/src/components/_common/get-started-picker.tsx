'use client';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { assetDisplay } from '@/lib/portfolio/display';
import { useAssetActionsContext } from '@/providers/AssetActionsProvider';

import { alpha, useTheme } from '@mui/material/styles';
import { Box, Stack, Button, Typography } from '@mui/material';

import { Iconify } from '@/components/template/iconify';

// ---------------------------------------------------------------------------
// Asset-first "get started" picker: choose an asset → Buy or Receive it, with
// the wallet provisioned lazily inside the shared useAssetActions flow (no XLM
// funding / USDC trustline forced — that lives on /savings). Single source of
// truth for this step, reused by the onboarding wizard and the empty states on
// /portfolio and /swap so the experience is identical everywhere.
// ---------------------------------------------------------------------------

const GET_STARTED_ASSETS: { symbol: string; name: string }[] = [
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'XLM', name: 'Stellar Lumens' },
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'SOL', name: 'Solana' },
];

interface GetStartedPickerProps {
  /** Optional secondary link ("Bring your own wallet instead"). */
  onBringOwnWallet?: () => void;
}

export function GetStartedPicker({ onBringOwnWallet }: GetStartedPickerProps) {
  const { t } = useTranslate();
  const theme = useTheme();
  const { startFlow } = useAssetActionsContext();
  const [selected, setSelected] = useState<string | null>(null);

  const asset = selected ? GET_STARTED_ASSETS.find((a) => a.symbol === selected) : null;

  const tileSx = {
    p: 1.75,
    borderRadius: 2,
    cursor: 'pointer',
    border: `1.5px solid ${theme.palette.divider}`,
    transition: 'all 0.15s',
    '&:hover': { borderColor: theme.palette.text.primary, bgcolor: alpha(theme.palette.text.primary, 0.02) },
  } as const;

  return (
    <>
      {asset ? (
        <Stack spacing={2.5}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.25} mb={0.5}>
              <Box component="img" src={assetDisplay(asset.symbol).icon} sx={{ width: 28, height: 28, borderRadius: '50%' }} />
              <Typography variant="h4" fontWeight={700}>{t('Add {{symbol}}', { symbol: asset.symbol })}</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {t('Buy it in a few taps, or receive it from a wallet or exchange you already use.')}
            </Typography>
          </Box>

          <Stack spacing={1.5}>
            {[
              {
                icon: 'solar:card-bold',
                title: t('Buy {{symbol}}', { symbol: asset.symbol }),
                subtitle: t('Card, bank transfer, or MoneyGram'),
                onClick: () => startFlow('buy', asset.symbol),
              },
              {
                icon: 'solar:download-minimalistic-bold',
                title: t('Receive {{symbol}}', { symbol: asset.symbol }),
                subtitle: t('Transfer from another wallet or exchange'),
                onClick: () => startFlow('receive', asset.symbol),
              },
            ].map((o) => (
              <Box key={o.title} onClick={o.onClick} sx={{ ...tileSx, p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(theme.palette.text.primary, 0.06), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Iconify icon={o.icon} width={20} sx={{ color: 'text.primary' }} />
                  </Box>
                  <Box flex={1} minWidth={0}>
                    <Typography variant="subtitle2" fontWeight={700}>{o.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{o.subtitle}</Typography>
                  </Box>
                  <Iconify icon="mingcute:right-line" sx={{ color: 'text.disabled', flexShrink: 0 }} />
                </Stack>
              </Box>
            ))}
          </Stack>

          <Button variant="text" size="small" fullWidth onClick={() => setSelected(null)} sx={{ color: 'text.secondary', fontWeight: 500 }}>
            {t('← Choose a different asset')}
          </Button>
        </Stack>
      ) : (
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>{t('What do you want to start with?')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('Pick an asset — we’ll set up your wallet for it in one tap. No seed phrase, no forms.')}
            </Typography>
          </Box>

          <Stack spacing={1.25}>
            {GET_STARTED_ASSETS.map((a) => (
              <Box key={a.symbol} onClick={() => setSelected(a.symbol)} sx={tileSx}>
                <Stack direction="row" alignItems="center" spacing={1.75}>
                  <Box component="img" src={assetDisplay(a.symbol).icon} sx={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0 }} />
                  <Box flex={1} minWidth={0}>
                    <Typography variant="subtitle2" fontWeight={700}>{a.symbol}</Typography>
                    <Typography variant="caption" color="text.secondary">{a.name}</Typography>
                  </Box>
                  <Iconify icon="mingcute:right-line" sx={{ color: 'text.disabled', flexShrink: 0 }} />
                </Stack>
              </Box>
            ))}
          </Stack>

          {onBringOwnWallet && (
            <Button variant="text" size="small" fullWidth onClick={onBringOwnWallet} sx={{ color: 'text.disabled', fontWeight: 500 }}>
              {t('Bring your own wallet instead')}
            </Button>
          )}
        </Stack>
      )}
    </>
  );
}
