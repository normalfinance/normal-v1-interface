'use client';

import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';
import { buildAuthHeaders } from '@/utils/http';
import { ETH_RPC_URL, SOL_RPC_URL } from '@/hooks/use-chain-portfolio';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from '@/components/template/iconify';

// ---------------------------------------------------------------------------
// Staged tracker for a cross-chain (LI.FI) swap. Opens the instant the source
// tx is broadcast and walks through: Submitted → Confirming on source chain →
// Bridging → Completed/Failed. Non-blocking (closable), records the swap only
// after the source tx confirms (so a dropped tx never becomes a phantom row),
// and logs every step to the console.
// ---------------------------------------------------------------------------

const CHAIN = {
  ETH: 1,
  SOL: 1151111081099710,
  BTC: 20000000000001,
};

function chainName(id: number): string {
  if (id === CHAIN.ETH) return 'Ethereum';
  if (id === CHAIN.SOL) return 'Solana';
  if (id === CHAIN.BTC) return 'Bitcoin';
  return 'source chain';
}

interface LifiStatusModalProps {
  open: boolean;
  onClose: () => void;
  txHash: string;
  fromChainId: number;
  toChainId: number;
  fromSymbol: string;
  toSymbol: string;
  amountIn: string;
  amountOut: string;
}

type Stage = 'confirming' | 'bridging' | 'done' | 'failed' | 'refunded';

const log = (msg: string, extra?: unknown) =>
  extra !== undefined ? console.log(`[lifi-swap] ${msg}`, extra) : console.log(`[lifi-swap] ${msg}`);

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// --- source-chain confirmation -------------------------------------------------

async function rpc(url: string, method: string, params: unknown[]): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`rpc ${method} ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message ?? method);
  return data.result;
}

/** 'confirmed' | 'reverted' | 'dropped' */
async function confirmSource(
  fromChainId: number,
  txHash: string,
  stop: () => boolean
): Promise<'confirmed' | 'reverted' | 'dropped'> {
  // Bitcoin: broadcast acceptance is enough — the bridge watches the mempool.
  if (fromChainId === CHAIN.BTC) return 'confirmed';

  if (fromChainId === CHAIN.ETH) {
    for (let i = 0; i < 45 && !stop(); i++) {
      try {
        const receipt = await rpc(ETH_RPC_URL, 'eth_getTransactionReceipt', [txHash]);
        if (receipt) {
          log('ETH receipt status', receipt.status);
          return receipt.status === '0x1' ? 'confirmed' : 'reverted';
        }
      } catch (e) {
        log('ETH receipt poll error', (e as Error).message);
      }
      await delay(4000);
    }
    return 'dropped';
  }

  if (fromChainId === CHAIN.SOL) {
    for (let i = 0; i < 30 && !stop(); i++) {
      try {
        const res = await rpc(SOL_RPC_URL, 'getSignatureStatuses', [[txHash]]);
        const st = res?.value?.[0];
        if (st) {
          if (st.err) return 'reverted';
          if (st.confirmationStatus === 'confirmed' || st.confirmationStatus === 'finalized') {
            return 'confirmed';
          }
        }
      } catch (e) {
        log('SOL status poll error', (e as Error).message);
      }
      await delay(2000);
    }
    return 'dropped';
  }

  return 'confirmed';
}

async function pollBridge(
  txHash: string,
  fromChainId: number,
  toChainId: number,
  stop: () => boolean
): Promise<'DONE' | 'FAILED' | 'REFUNDED' | null> {
  for (let i = 0; i < 80 && !stop(); i++) {
    try {
      const res = await fetch(
        `/api/lifi/status?txHash=${txHash}&fromChain=${fromChainId}&toChain=${toChainId}`
      );
      if (res.ok) {
        const data = await res.json();
        const s = data?.status?.status as string | undefined;
        const sub = String(data?.status?.substatus ?? '').toUpperCase();
        log('bridge status', `${s} / ${sub}`);
        // A refund is reported as DONE+REFUNDED (or PARTIAL) — funds returned,
        // destination not delivered.
        if (s === 'DONE') return sub === 'REFUNDED' || sub === 'PARTIAL' ? 'REFUNDED' : 'DONE';
        if (s === 'FAILED' || s === 'INVALID') return 'FAILED';
      }
    } catch (e) {
      log('bridge poll error', (e as Error).message);
    }
    await delay(15000);
  }
  return null;
}

// ---------------------------------------------------------------------------

export function LifiStatusModal({
  open,
  onClose,
  txHash,
  fromChainId,
  toChainId,
  fromSymbol,
  toSymbol,
  amountIn,
  amountOut,
}: LifiStatusModalProps) {
  const { t } = useTranslate();
  const [stage, setStage] = useState<Stage>('confirming');

  useEffect(() => {
    if (!open || !txHash) return undefined;
    let cancelled = false;
    const stop = () => cancelled;
    setStage('confirming');

    (async () => {
      log(`Submitted ${fromSymbol}→${toSymbol}`, txHash);

      // 1) Confirm the source-chain transaction actually landed.
      const src = await confirmSource(fromChainId, txHash, stop);
      if (cancelled) return;
      if (src !== 'confirmed') {
        log('source not confirmed', src);
        setStage('failed');
        return;
      }
      log('source confirmed');

      // 2) Record now (source landed) so it shows as one Swap row, then refresh feeds.
      try {
        const headers = await buildAuthHeaders();
        await fetch('/api/lifi/record', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromSymbol, toSymbol, amountIn, amountOut, txHash }),
        });
        log('recorded swap');
      } catch (e) {
        log('record failed (non-fatal)', (e as Error).message);
      }
      window.dispatchEvent(new Event('nf:activity-updated'));

      // 3) Track the bridge until it delivers.
      setStage('bridging');
      const bridge = await pollBridge(txHash, fromChainId, toChainId, stop);
      if (cancelled) return;
      if (bridge === 'DONE') setStage('done');
      else if (bridge === 'REFUNDED') setStage('refunded');
      else if (bridge === 'FAILED') setStage('failed');
      window.dispatchEvent(new Event('nf:activity-updated'));
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, txHash]);

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
