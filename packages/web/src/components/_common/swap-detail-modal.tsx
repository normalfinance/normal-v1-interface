'use client';

// Post-hoc detail for a cross-ecosystem (CCTP) composite swap. A single feed row
// hides a multi-leg journey (source swap → Circle burn → attestation → mint, and
// the reverse for outbound); this modal fetches the full transfer and shows every
// real sub-transaction with its own status and block-explorer link — the "LI.FI
// scan" experience, but for our composite route.
//
// Opened from both activity feeds (portfolio card + account drawer) for any row
// whose id starts with `cctp:`. The GET also advances the state machine, so
// opening details nudges an in-flight transfer forward.

import type { Activity } from '@/types/activity';

import { useTranslate } from '@/locales';
import { buildAuthHeaders } from '@/utils/http';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from '@/components/template/iconify';

const MONO = { fontFamily: '"Geist Mono", "Courier New", monospace' } as const;

/** The transfer id behind a `cctp:<id>` activity, or null for non-CCTP rows. */
export function cctpTransferIdOf(a: Activity): string | null {
  return a.id.startsWith('cctp:') ? a.id.slice(5) : null;
}

interface CctpTransferDetail {
  direction: string;
  status: string;
  network: string;
  srcAsset: string;
  dstAsset: string;
  srcAmount: string | null;
  dstAmount: string | null;
  srcSwapTxHash: string | null;
  burnTxHash: string | null;
  eventNonce: string | null;
  mintTxHash: string | null;
  dstSwapTxHash: string | null;
  gasTopUpTxHash: string | null;
  errorDetail: string | null;
  createdAt: string;
}

type Explorer = 'lifi' | 'base' | 'stellar';

interface Step {
  key: string;
  label: string;
  sub: string;
  hash: string | null;
  explorer: Explorer | null;
  /** done even without a hash of its own (e.g. the attestation stage) */
  done?: boolean;
}

const explorerUrl = (explorer: Explorer, hash: string): string => {
  switch (explorer) {
    case 'lifi':
      return `https://scan.li.fi/tx/${hash}`;
    case 'base':
      return `https://basescan.org/tx/${hash}`;
    case 'stellar':
    default:
      return `https://stellar.expert/explorer/public/tx/${hash}`;
  }
};

const shortHash = (h: string) => (h.length > 14 ? `${h.slice(0, 8)}…${h.slice(-4)}` : h);

type Translate = (key: string, opts?: Record<string, unknown>) => string;

function buildSteps(tr: CctpTransferDetail, t: Translate): Step[] {
  const attested = !!tr.eventNonce || !!tr.mintTxHash || tr.status === 'COMPLETED';
  if (tr.direction === 'stellar_to_crosschain') {
    return [
      { key: 'burn', label: t('Bridge USDC (Circle CCTP)'), sub: t('Burn on Stellar'), hash: tr.burnTxHash, explorer: 'stellar' },
      { key: 'attest', label: t('Circle attestation'), sub: attested ? t('Attested') : t('Awaiting Circle'), hash: null, explorer: null, done: attested },
      { key: 'mint', label: t('Receive USDC on Base'), sub: t('Mint'), hash: tr.mintTxHash, explorer: 'base' },
      { key: 'pivot', label: t('Swap USDC → {{asset}}', { asset: tr.dstAsset }), sub: t('Via LI.FI'), hash: tr.dstSwapTxHash, explorer: 'lifi' },
    ];
  }
  // inbound: crosschain_to_stellar
  return [
    { key: 'src', label: t('Swap {{asset}} → USDC', { asset: tr.srcAsset }), sub: t('Via LI.FI'), hash: tr.srcSwapTxHash, explorer: 'lifi' },
    { key: 'burn', label: t('Bridge USDC (Circle CCTP)'), sub: t('Burn on Base'), hash: tr.burnTxHash, explorer: 'base' },
    { key: 'attest', label: t('Circle attestation'), sub: attested ? t('Attested') : t('Awaiting Circle (~20 min)'), hash: null, explorer: null, done: attested },
    { key: 'mint', label: t('Receive USDC on Stellar'), sub: t('Mint'), hash: tr.mintTxHash, explorer: 'stellar' },
  ];
}

const STATUS_CHIP: Record<string, { label: string; color: string; bg: string }> = {
  COMPLETED: { label: 'Completed', color: '#0A6649', bg: 'rgba(26,179,125,0.12)' },
  FAILED: { label: 'Failed', color: '#B91C1C', bg: 'rgba(220,38,38,0.1)' },
  REFUNDED: { label: 'Refunded', color: '#8A4A00', bg: 'rgba(245,158,11,0.12)' },
};

export function SwapDetailModal({ transferId, onClose }: { transferId: string | null; onClose: () => void }) {
  const { t } = useTranslate();
  const [transfer, setTransfer] = useState<CctpTransferDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Keep the last content mounted while the dialog animates closed (transferId
    // → null); only clear when a new transfer is opened, so the spinner shows.
    if (!transferId) return undefined;
    let cancelled = false;
    setTransfer(null);
    setLoading(true);
    (async () => {
      try {
        const headers = await buildAuthHeaders();
        // noAdvance = fast read (don't block on the state machine); timeout so a
        // slow/hung server surfaces as an error instead of an endless spinner.
        const res = await fetch(`/api/cctp/transfers/${transferId}?noAdvance=1`, {
          headers,
          credentials: 'include',
          signal: AbortSignal.timeout(12_000),
        });
        const data = await res.json();
        if (!cancelled) setTransfer(res.ok ? (data.transfer ?? null) : null);
      } catch {
        if (!cancelled) setTransfer(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [transferId]);

  const fmt = useCallback((v: string | null) => {
    if (!v) return '—';
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 8 }) : v;
  }, []);

  const steps = transfer ? buildSteps(transfer, t) : [];
  // First not-yet-done step is the "active" one (unless the whole thing is done).
  const isDone = transfer?.status === 'COMPLETED';
  const isFailed = transfer?.status === 'FAILED';
  const activeIdx = isDone ? -1 : steps.findIndex((s) => !(s.done || !!s.hash));
  const chip = transfer ? STATUS_CHIP[transfer.status] : undefined;

  return (
    <Dialog open={transferId !== null} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '24px', p: '22px', maxWidth: 420 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: '14px' }}>
        <Typography sx={{ fontSize: '17px', fontWeight: 600, color: '#0A0A0F' }}>{t('Swap details')}</Typography>
        <Box component="button" onClick={onClose} sx={{ all: 'unset', cursor: 'pointer', color: 'rgba(10,10,15,0.4)', display: 'flex' }}>
          <Iconify icon="mingcute:close-line" width={20} />
        </Box>
      </Stack>

      {loading && !transfer ? (
        <Stack alignItems="center" sx={{ py: '32px' }}>
          <CircularProgress size={22} sx={{ color: '#0A0A0F' }} />
        </Stack>
      ) : !transfer ? (
        <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.5)', py: '20px', textAlign: 'center' }}>
          {t('Could not load this transfer.')}
        </Typography>
      ) : (
        <>
          {/* Route summary */}
          <Box sx={{ p: '12px 14px', borderRadius: '14px', bgcolor: '#FAFAFB', border: '1px solid rgba(10,10,15,0.06)', mb: '14px' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#0A0A0F', ...MONO }}>
                {fmt(transfer.srcAmount)} {transfer.srcAsset} → {fmt(transfer.dstAmount)} {transfer.dstAsset}
              </Typography>
              <Chip
                label={t(chip?.label ?? 'In progress')}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '11px',
                  fontWeight: 600,
                  color: chip?.color ?? '#8A4A00',
                  bgcolor: chip?.bg ?? 'rgba(245,158,11,0.12)',
                  '& .MuiChip-label': { px: '8px' },
                }}
              />
            </Stack>
          </Box>

          {/* Steps */}
          <Stack spacing={0}>
            {steps.map((s, idx) => {
              const stepDone = isDone || s.done || !!s.hash;
              const isActive = !stepDone && idx === activeIdx;
              const showError = isActive && isFailed;
              return (
                <Stack key={s.key} direction="row" spacing={1.5} alignItems="flex-start" sx={{ py: '9px', opacity: stepDone || isActive ? 1 : 0.45 }}>
                  <Box sx={{ width: 22, height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', mt: '1px' }}>
                    {stepDone ? (
                      <Iconify icon="lets-icons:check-fill" width={20} sx={{ color: '#1AB37D' }} />
                    ) : showError ? (
                      <Iconify icon="eva:alert-triangle-fill" width={18} sx={{ color: '#DC2626' }} />
                    ) : isActive ? (
                      <CircularProgress size={16} sx={{ color: '#0A0A0F' }} />
                    ) : (
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(10,10,15,0.15)' }} />
                    )}
                  </Box>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: '#0A0A0F', lineHeight: 1.35 }}>{s.label}</Typography>
                    <Typography sx={{ fontSize: '11.5px', color: 'rgba(10,10,15,0.45)', lineHeight: 1.4 }}>{s.sub}</Typography>
                  </Box>
                  {s.hash && s.explorer && (
                    <Link
                      href={explorerUrl(s.explorer, s.hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'rgba(10,10,15,0.5)', textDecoration: 'none', ...MONO, flexShrink: 0, '&:hover': { color: '#0A0A0F' } }}
                    >
                      {shortHash(s.hash)}
                      <Iconify icon="solar:arrow-right-up-linear" width={13} />
                    </Link>
                  )}
                </Stack>
              );
            })}
          </Stack>

          {transfer.gasTopUpTxHash && !['skipped', 'pending'].includes(transfer.gasTopUpTxHash) && (
            <Typography sx={{ fontSize: '11px', color: 'rgba(10,10,15,0.4)', mt: '8px' }}>
              {t('Network fees on Base were sponsored by Normal.')}
            </Typography>
          )}

          {isFailed && transfer.errorDetail && (
            <Box sx={{ mt: '12px', px: '12px', py: '10px', borderRadius: '10px', bgcolor: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)' }}>
              <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.7)', lineHeight: 1.5, wordBreak: 'break-word' }}>{transfer.errorDetail}</Typography>
            </Box>
          )}
        </>
      )}
    </Dialog>
  );
}
