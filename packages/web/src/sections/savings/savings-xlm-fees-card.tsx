'use client';

// #67 — "Network fees on Stellar" explainer. The savings page's plain-language
// answer to "why does the app hold 1 XLM back, and why is my savings button
// paused?", with the same live traffic light as the savings card (same
// classifier, so the two can never disagree).
//
// Data comes from the token store (display-grade; the savings card's own
// action gate uses a fresh Horizon read) and the shared deduped
// savings-position SWR — zero additional network requests.

import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import { usePersistStore } from '@normalfinance/state';
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

export function SavingsXlmFeesCard() {
  const { t } = useTranslate();
  const router = useRouter();
  const { wallet, tokenState } = usePersistStore();
  const { position } = useSavingsPosition();

  if (!wallet.address) return null;

  const xlmBalance = BigNumber(
    tokenState.tokens.find((tok) => tok.symbol === 'XLM')?.balance ?? 0
  ).toNumber();
  const status = xlmFeeStatus(xlmBalance);
  const style = STATUS_STYLE[status];
  const feeAvailable = xlmAvailableForFees(xlmBalance);
  const hasActiveSavings =
    BigNumber(position?.currentValue || 0).gt(0) || BigNumber(position?.shares || 0).gt(0);

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

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{
          mt: '14px',
          px: '12px',
          py: '10px',
          borderRadius: '12px',
          bgcolor: '#fff',
          border: '1px solid rgba(10,10,15,0.06)',
        }}
      >
        <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
          {t('XLM available for fees')}
        </Typography>
        <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#0A0A0F', ...MONO }}>
          {feeAvailable.toFixed(2)} XLM
        </Typography>
      </Stack>

      {status !== 'ok' && (
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
