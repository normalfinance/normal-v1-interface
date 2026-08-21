'use client';

// Step-by-step progress for a Stellar (Soroswap) swap — the same visual
// language as the CCTP modal, so every swap in the app narrates itself.
// Niko 2026-08-21: Stellar swaps were the last flow with no status popup and
// no refetch-gated Done. 'Done' here means the ENGINE finished its awaited
// balance refresh — the wallet already shows the result (#62/#66 rule).

import type { SoroswapStage } from '@/hooks/stellar/use-swap';

import { useTranslate } from '@/locales';
import { createStellarExpertUrl } from '@/utils/transactions.utils';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from '@/components/template/iconify';

interface Props {
  open: boolean;
  stage: SoroswapStage | null;
  error: string | null;
  fromSymbol: string;
  toSymbol: string;
  /** One-signature (embedded fee) run — drives the honest signature copy. */
  embedded: boolean;
  /** Set at Done — powers the explorer link. */
  txHash: string | null;
  onClose: () => void;
  onTryAgain?: () => void;
}

export function SoroswapProgressModal({
  open,
  stage,
  error,
  fromSymbol,
  toSymbol,
  embedded,
  txHash,
  onClose,
  onTryAgain,
}: Props) {
  const { t } = useTranslate();

  const steps: { id: string; label: string; sub: string }[] = [
    {
      id: 'build',
      label: t('Preparing the swap'),
      sub: t('Building your transaction'),
    },
    {
      id: 'sign',
      label: t('Approve in your wallet'),
      sub:
        stage === 'sign-fee'
          ? t('Now the Normal fee — second signature')
          : embedded
            ? t('One signature — the Normal fee is included')
            : t('Two signatures: the swap, then the Normal fee'),
    },
    {
      id: 'submit',
      label: t('Submitting to Stellar'),
      sub: t('Broadcasting — usually a few seconds'),
    },
    {
      id: 'refetch',
      label: t('Updating balances'),
      sub: t('Waiting until your wallet shows the result'),
    },
    { id: 'done', label: t('Done'), sub: t('{{sym}} received', { sym: toSymbol }) },
  ];

  const stageToStep: Record<SoroswapStage, string> = {
    build: 'build',
    'sign-swap': 'sign',
    'sign-fee': 'sign',
    submit: 'submit',
    refetch: 'refetch',
    done: 'done',
    degraded: 'build', // not a real step — the engine consumes it before here
  };
  const activeId = stage ? stageToStep[stage] : null;
  const activeIdx = activeId ? steps.findIndex((s) => s.id === activeId) : -1;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: '24px', p: '22px', maxWidth: 400 } }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        sx={{ mb: '14px' }}
      >
        <Box sx={{ pr: 1 }}>
          <Typography sx={{ fontSize: '17px', fontWeight: 600, color: '#0A0A0F' }}>
            {t('Swapping {{from}} → {{to}}', { from: fromSymbol, to: toSymbol })}
          </Typography>
          {stage && stage !== 'done' && (
            <Typography
              sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)', mt: '3px', lineHeight: 1.4 }}
            >
              {t('Runs on Stellar — usually well under a minute.')}
            </Typography>
          )}
        </Box>
        <Box
          component="button"
          onClick={onClose}
          sx={{
            all: 'unset',
            cursor: 'pointer',
            color: 'rgba(10,10,15,0.4)',
            display: 'flex',
            flexShrink: 0,
            mt: '2px',
          }}
        >
          <Iconify icon="mingcute:close-line" width={20} />
        </Box>
      </Stack>

      <Stack spacing={0}>
        {steps.map((s, idx) => {
          const isDone = stage === 'done' ? s.id !== 'done' || true : idx < activeIdx;
          const isActive = activeId === s.id && stage !== 'done';
          const isFinalDone = stage === 'done' && s.id === 'done';
          return (
            <Stack
              key={s.id}
              direction="row"
              spacing={1.5}
              alignItems="flex-start"
              sx={{ py: '9px', opacity: isDone || isActive || isFinalDone ? 1 : 0.45 }}
            >
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mt: '1px',
                }}
              >
                {isDone || isFinalDone ? (
                  <Iconify icon="lets-icons:check-fill" width={20} sx={{ color: '#1AB37D' }} />
                ) : isActive && !error ? (
                  <CircularProgress size={16} sx={{ color: '#0A0A0F' }} />
                ) : isActive && error ? (
                  <Iconify icon="eva:alert-triangle-fill" width={18} sx={{ color: '#DC2626' }} />
                ) : (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'rgba(10,10,15,0.15)',
                    }}
                  />
                )}
              </Box>
              <Box>
                <Typography
                  sx={{ fontSize: '13.5px', fontWeight: 600, color: '#0A0A0F', lineHeight: 1.35 }}
                >
                  {s.label}
                </Typography>
                <Typography
                  sx={{ fontSize: '11.5px', color: 'rgba(10,10,15,0.45)', lineHeight: 1.4 }}
                >
                  {s.sub}
                </Typography>
              </Box>
            </Stack>
          );
        })}
      </Stack>

      {stage === 'done' && txHash && (
        <Box
          component="button"
          onClick={() =>
            window.open(createStellarExpertUrl('tx', txHash), '_blank', 'noopener,noreferrer')
          }
          sx={{
            mt: '12px',
            appearance: 'none',
            border: '1px solid rgba(10,10,15,0.14)',
            borderRadius: '10px',
            px: '16px',
            py: '9px',
            width: '100%',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
            bgcolor: '#fff',
            color: '#0A0A0F',
            '&:hover': { bgcolor: 'rgba(10,10,15,0.04)' },
          }}
        >
          {t('View on stellar.expert')}
        </Box>
      )}

      {error && (
        <Box
          sx={{
            mt: '12px',
            px: '12px',
            py: '10px',
            borderRadius: '10px',
            bgcolor: 'rgba(220,38,38,0.05)',
            border: '1px solid rgba(220,38,38,0.15)',
          }}
        >
          <Typography sx={{ fontSize: '12.5px', color: 'rgba(10,10,15,0.7)', lineHeight: 1.5 }}>
            {error}
          </Typography>
          <Typography
            sx={{ fontSize: '11.5px', color: 'rgba(10,10,15,0.45)', mt: '4px', lineHeight: 1.5 }}
          >
            {t(
              'Nothing was charged unless the swap itself succeeded — rejecting a prompt aborts everything.'
            )}
          </Typography>
          {onTryAgain && (
            <Box
              component="button"
              onClick={onTryAgain}
              sx={{
                mt: '10px',
                appearance: 'none',
                border: 'none',
                borderRadius: '10px',
                px: '16px',
                py: '9px',
                width: '100%',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
                bgcolor: '#0A0A0F',
                color: '#fff',
                '&:hover': { opacity: 0.85 },
              }}
            >
              {t('Try again')}
            </Box>
          )}
        </Box>
      )}
    </Dialog>
  );
}
