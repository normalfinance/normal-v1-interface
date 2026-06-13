'use client';

import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from '@/components/template/iconify';

// ---------------------------------------------------------------------------
// Polls /api/lifi/status until the cross-chain swap completes. Bridges take
// minutes; the user can safely close this — the swap continues on-chain.
// ---------------------------------------------------------------------------

interface LifiStatusModalProps {
  open: boolean;
  onClose: () => void;
  txHash: string;
  fromChainId: number;
  toChainId: number;
  fromSymbol: string;
  toSymbol: string;
}

type SwapStatus = 'PENDING' | 'DONE' | 'FAILED';

export function LifiStatusModal({
  open,
  onClose,
  txHash,
  fromChainId,
  toChainId,
  fromSymbol,
  toSymbol,
}: LifiStatusModalProps) {
  const { t } = useTranslate();
  const [status, setStatus] = useState<SwapStatus>('PENDING');
  const [substatus, setSubstatus] = useState<string>('');

  useEffect(() => {
    if (!open || !txHash) return undefined;
    setStatus('PENDING');
    setSubstatus('');

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/lifi/status?txHash=${txHash}&fromChain=${fromChainId}&toChain=${toChainId}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const s = data?.status?.status as string | undefined;
        if (s === 'DONE') setStatus('DONE');
        else if (s === 'FAILED' || s === 'INVALID') setStatus('FAILED');
        if (data?.status?.substatusMessage) setSubstatus(data.status.substatusMessage);
      } catch {
        // transient — keep polling
      }
    };

    poll();
    const interval = setInterval(() => {
      poll();
    }, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open, txHash, fromChainId, toChainId]);

  const isDone = status === 'DONE';
  const isFailed = status === 'FAILED';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: '22px' } } }}
    >
      <DialogContent sx={{ px: '22px', py: '28px' }}>
        <Stack spacing={2} alignItems="center" sx={{ textAlign: 'center' }}>
          {isDone ? (
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                bgcolor: 'rgba(26,179,125,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Iconify icon="eva:checkmark-outline" width={28} sx={{ color: '#0A6649' }} />
            </Box>
          ) : isFailed ? (
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                bgcolor: 'rgba(220,38,38,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Iconify icon="eva:close-outline" width={28} sx={{ color: '#DC2626' }} />
            </Box>
          ) : (
            <CircularProgress size={44} sx={{ color: '#0A0A0F' }} />
          )}

          <Box>
            <Typography sx={{ fontSize: '17px', fontWeight: 700, color: '#0A0A0F', letterSpacing: '-0.02em' }}>
              {isDone
                ? t('Swap complete')
                : isFailed
                  ? t('Swap failed')
                  : t('Swapping {{from}} → {{to}}', { from: fromSymbol, to: toSymbol })}
            </Typography>
            <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.5)', mt: '6px', lineHeight: 1.55 }}>
              {isDone
                ? t('Your {{to}} has arrived at your wallet address.', { to: toSymbol })
                : isFailed
                  ? substatus || t('The bridge reported a failure. Funds are refunded to your sending address in most cases — contact support if they don’t appear.')
                  : substatus ||
                    t('Cross-chain swaps take a few minutes. You can close this window — the swap continues on its own.')}
            </Typography>
          </Box>

          <Box
            sx={{
              px: '12px',
              py: '8px',
              borderRadius: '10px',
              bgcolor: '#FAFAFB',
              border: '1px solid rgba(10,10,15,0.08)',
              maxWidth: '100%',
              overflow: 'hidden',
            }}
          >
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
            {isDone || isFailed ? t('Close') : t('Continue in background')}
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
