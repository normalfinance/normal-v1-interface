'use client';

// #67 — "Network fees on Stellar" explainer. The savings page's plain-language
// answer to "why does the app hold 1 XLM back, and why is my savings button
// paused?", with the same live traffic light as the savings card (same
// classifier, so the two can never disagree).
//
// #75 round 2 (Niko): on a hybrid account this card showed ONE wallet — the
// connected slot's XLM (0.50 for a fresh Lobstr) while savings actually runs
// from either wallet via the savings-card tabs. It now shows a row PER
// wallet, each with its own semaphore; the header chip is the BEST status
// (money can always move via the healthy wallet). Balances come from the
// portfolio aggregate — the one display source (doc 75 rule), refreshed on
// every activity event.

import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import { usePersistStore } from '@normalfinance/state';
import { connectedWalletLabel } from '@/lib/portfolio/display';
import { useWalletBalances } from '@/hooks/use-wallet-balances';
import { useSavingsPosition } from '@/hooks/use-savings-position';
import { xlmFeeStatus, SAVINGS_XLM_BUFFER, xlmAvailableForFees } from '@/utils/stellar-reserve';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

const MONO = { fontFamily: '"Geist Mono", "Courier New", monospace' } as const;

const STATUS_STYLE = {
  ok: { dot: '#1AB37D', label: 'Healthy', color: '#0A6649', bg: 'rgba(26,179,125,0.12)' },
  low: { dot: '#F59E0B', label: 'Running low', color: '#7A4A00', bg: 'rgba(245,158,11,0.14)' },
  blocked: { dot: '#DC2626', label: 'Add XLM', color: '#7F1D1D', bg: 'rgba(220,38,38,0.1)' },
} as const;

const STATUS_RANK = { ok: 0, low: 1, blocked: 2 } as const;

export function SavingsXlmFeesCard() {
  const { t } = useTranslate();
  const router = useRouter();
  const { wallet } = usePersistStore();
  const { position, companionPosition } = useSavingsPosition();
  const { assets, companionStellar } = useWalletBalances(true);

  if (!wallet.address) return null;

  const isExternalSlot = wallet.walletType != null && wallet.walletType !== 'normal-wallet';
  const slotXlm = BigNumber(
    assets.find((a) => a.chain === 'stellar' && a.symbol === 'XLM')?.balance ?? 0
  ).toNumber();
  const companionXlm = companionStellar
    ? BigNumber(companionStellar.assets.find((a) => a.symbol === 'XLM')?.balance ?? 0).toNumber()
    : null;

  // One row per wallet that can run savings transactions. Normal wallet
  // first — same order as the savings-card tabs.
  const rows = [
    ...(isExternalSlot && companionXlm != null
      ? [{ key: 'normal', label: t('Normal wallet'), xlm: companionXlm }]
      : []),
    {
      key: 'slot',
      label: isExternalSlot ? connectedWalletLabel(wallet.walletType) : null,
      xlm: slotXlm,
    },
  ].map((r) => ({ ...r, status: xlmFeeStatus(r.xlm), feeAvailable: xlmAvailableForFees(r.xlm) }));

  // Header chip = the WORST wallet's status (Niko: a red row under a green
  // "Healthy" chip reads as a contradiction). The per-row dots say which
  // wallet needs the XLM.
  const worst = rows.reduce((a, b) => (STATUS_RANK[a.status] >= STATUS_RANK[b.status] ? a : b));
  const style = STATUS_STYLE[worst.status];
  const hasActiveSavings =
    BigNumber(position?.currentValue || 0).gt(0) ||
    BigNumber(position?.shares || 0).gt(0) ||
    BigNumber(companionPosition?.currentValue || 0).gt(0) ||
    BigNumber(companionPosition?.shares || 0).gt(0);

  return (
    <Box
      sx={{
        p: '22px',
        borderRadius: '22px',
        border: '1px solid rgba(10,10,15,0.08)',
        bgcolor: '#FAFAFB',
        alignSelf: 'start',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: '4px' }}>
        <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#0A0A0F' }}>
          {t('Network fees (XLM)')}
        </Typography>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            px: '9px',
            py: '3px',
            borderRadius: '999px',
            bgcolor: style.bg,
          }}
        >
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: style.dot }} />
          <Typography sx={{ fontSize: '11px', fontWeight: 600, color: style.color }}>
            {t(style.label)}
          </Typography>
        </Box>
      </Stack>

      <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.5)', lineHeight: 1.55 }}>
        {t(
          'Every deposit and withdrawal is a Stellar transaction that costs a small XLM fee. No XLM means no way to move money in or out of savings.'
        )}
      </Typography>

      {hasActiveSavings && (
        <Typography
          sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.5)', lineHeight: 1.55, mt: '8px' }}
        >
          {t(
            'While you have savings, {{buffer}} XLM is kept aside so a withdrawal can always pay its fee — that is why Send and Swap show slightly less than your full XLM balance.',
            { buffer: SAVINGS_XLM_BUFFER }
          )}
        </Typography>
      )}

      <Stack spacing={0.75} sx={{ mt: '14px' }}>
        {rows.map((r) => {
          const rowStyle = STATUS_STYLE[r.status];
          return (
            <Stack
              key={r.key}
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{
                px: '12px',
                py: '10px',
                borderRadius: '12px',
                bgcolor: '#fff',
                border: '1px solid rgba(10,10,15,0.06)',
              }}
            >
              <Stack direction="row" alignItems="center" gap="8px" sx={{ minWidth: 0 }}>
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    bgcolor: rowStyle.dot,
                    flexShrink: 0,
                  }}
                />
                <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
                  {r.label ?? t('Your wallet')}
                </Typography>
              </Stack>
              {/* Total first, spendable-after-reserve second — showing only
                  the fee number read as a WRONG balance (Niko: "it tells
                  Lobstr has 0.5 XLM, but it actually has 2"). */}
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#0A0A0F', ...MONO }}>
                {r.xlm.toFixed(2)} XLM
                <Box component="span" sx={{ color: 'rgba(10,10,15,0.45)', fontWeight: 500 }}>
                  {` · ${r.feeAvailable.toFixed(2)} ${t('for fees')}`}
                </Box>
              </Typography>
            </Stack>
          );
        })}
      </Stack>

      {worst.status !== 'ok' && (
        <Button
          onClick={() => router.push('/swap?from=USDC')}
          fullWidth
          sx={{
            mt: '12px',
            bgcolor: '#0A0A0F',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: '12px',
            py: '9px',
            '&:hover': { bgcolor: '#1A1A28' },
          }}
        >
          {t('Get XLM — swap a little USDC')}
        </Button>
      )}
    </Box>
  );
}
