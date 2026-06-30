'use client';

import { useTranslate } from '@/locales';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from '@/components/template/iconify';

import { chainName } from './engines/lifi-tracker';

import type { Stage } from './engines/lifi-tracker';

// ---------------------------------------------------------------------------
// Presentational view of a cross-chain (LI.FI) swap's progress: Submitted →
// Confirming on source chain → Bridging → Completed/Failed/Refunded. The actual
// tracking (confirm + record + bridge poll + balance refresh) runs in the swap
// engine via useLifiTracker, so closing this dialog never stops the swap — it
// just hides the view. `stage` is fed in from that tracker.
// ---------------------------------------------------------------------------

interface LifiStatusModalProps {
  open: boolean;
  onClose: () => void;
  stage: Stage;
  txHash: string;
  fromChainId: number;
  toChainId: number;
  fromSymbol: string;
  toSymbol: string;
}

export function LifiStatusModal({
  open,
  onClose,
  stage,
  txHash,
  fromChainId,
  toChainId,
  fromSymbol,
  toSymbol,
}: LifiStatusModalProps) {
  const { t } = useTranslate();

  const steps: { key: Stage | 'submitted'; label: string }[] = [
    { key: 'submitted', label: t('Submitted') },
    { key: 'confirming', label: t('Confirming on {{chain}}', { chain: chainName(fromChainId) }) },
    { key: 'bridging', label: t('Bridging to {{chain}}', { chain: chainName(toChainId) }) },
    { key: 'done', label: t('Completed') },
  ];

  const order: Record<string, number> = { submitted: 0, confirming: 1, bridging: 2, done: 3 };
  const isFailed = stage === 'failed';
  const isDone = stage === 'done';
  const isRefunded = stage === 'refunded';
  // failed = stuck at source confirmation; refunded = bridge returned funds (bridging step)
  const currentIndex = isFailed ? order.confirming : isRefunded ? order.bridging : order[stage];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '22px' } } }}>
      <DialogContent sx={{ px: '22px', py: '26px' }}>
        <Stack spacing={2.5}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: '17px', fontWeight: 700, color: '#0A0A0F', letterSpacing: '-0.02em' }}>
              {isDone
                ? t('Swap complete')
                : isRefunded
                  ? t('Swap refunded')
                  : isFailed
                    ? t('Swap failed')
                    : t('Swapping {{from}} → {{to}}', { from: fromSymbol, to: toSymbol })}
            </Typography>
            <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.5)', mt: '4px' }}>
              {isRefunded
                ? t('The bridge couldn’t complete it and returned your {{from}}. No funds were lost — small swaps are sometimes refunded.', { from: fromSymbol })
                : isFailed
                  ? t('The transaction didn’t confirm. No funds were moved — please try again.')
                  : t('You can close this — the swap keeps going on its own.')}
            </Typography>
          </Box>

          {/* Stage checklist */}
          <Stack spacing={1.25}>
            {steps.map((step, i) => {
              const stepDone = isDone ? true : i < currentIndex;
              const stepActive = !isDone && !isFailed && !isRefunded && i === currentIndex;
              const stepFailed = isFailed && i === currentIndex;
              const stepRefunded = isRefunded && i === currentIndex;
              return (
                <Stack key={step.key} direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: stepDone
                        ? 'rgba(26,179,125,0.12)'
                        : stepFailed
                          ? 'rgba(220,38,38,0.1)'
                          : stepRefunded
                            ? 'rgba(245,158,11,0.12)'
                            : 'rgba(10,10,15,0.05)',
                    }}
                  >
                    {stepDone ? (
                      <Iconify icon="eva:checkmark-outline" width={14} sx={{ color: '#0A6649' }} />
                    ) : stepFailed ? (
                      <Iconify icon="eva:close-outline" width={14} sx={{ color: '#B91C1C' }} />
                    ) : stepRefunded ? (
                      <Iconify icon="eva:undo-outline" width={14} sx={{ color: '#B45309' }} />
                    ) : stepActive ? (
                      <CircularProgress size={12} sx={{ color: '#0A0A0F' }} />
                    ) : (
                      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'rgba(10,10,15,0.25)' }} />
                    )}
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '13.5px',
                      color: stepDone || stepActive
                        ? '#0A0A0F'
                        : stepFailed
                          ? '#B91C1C'
                          : stepRefunded
                            ? '#B45309'
                            : 'rgba(10,10,15,0.4)',
                      fontWeight: stepActive ? 600 : 400,
                    }}
                  >
                    {stepRefunded ? t('Refunded — {{from}} returned', { from: fromSymbol }) : step.label}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>

          {/* tx hash */}
          <Box sx={{ px: '12px', py: '8px', borderRadius: '10px', bgcolor: '#FAFAFB', border: '1px solid rgba(10,10,15,0.08)' }}>
            <Typography sx={{ fontSize: '11px', color: 'rgba(10,10,15,0.5)', fontFamily: '"Geist Mono", monospace', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {txHash}
            </Typography>
          </Box>

          <Box
            component="button"
            onClick={onClose}
            sx={{
              px: '24px',
              py: '10px',
              borderRadius: '10px',
              border: '1px solid rgba(10,10,15,0.12)',
              bgcolor: '#FFFFFF',
              color: '#0A0A0F',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              '&:hover': { bgcolor: '#F4F4F7' },
            }}
          >
            {isDone || isFailed || isRefunded ? t('Close') : t('Continue in background')}
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
