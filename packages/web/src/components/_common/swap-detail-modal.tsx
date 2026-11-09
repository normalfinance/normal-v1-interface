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

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { buildAuthHeaders } from '@/utils/http';
import { indexById } from '@/lib/index/indexes';
import { RouterLink } from '@/routes/components';
import { BRAND_COLORS } from '@/theme/brand-colors';
import { abortTimeout } from '@/utils/abort-timeout';
import { assetName } from '@/lib/portfolio/asset-names';
import { useState, useEffect, useCallback } from 'react';
import { transferEnding } from '@/lib/cctp/transfer-ending';
import { heldSymbolOf, INDEX_DIRECTION } from '@/lib/index/legs';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from '@/components/template/iconify';
import { appLocale } from '@/components/_common/app-ui';

const MONO = { fontFamily: '"Geist Mono", ui-monospace, monospace' } as const;

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
  quoteJson?: string | null;
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
  /** It ended here calmly (nothing lost): a grey dash, never a tick or red. */
  stopped?: boolean;
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

/** The index an index purchase bought (its quote stores the id), or null. */
function indexOfTransfer(tr: CctpTransferDetail) {
  if (tr.direction !== INDEX_DIRECTION) return null;
  try {
    return indexById(tr.quoteJson ? JSON.parse(tr.quoteJson)?.index : null);
  } catch {
    return null;
  }
}

function buildSteps(tr: CctpTransferDetail, t: Translate): Step[] {
  const attested = !!tr.eventNonce || !!tr.mintTxHash || tr.status === 'COMPLETED';
  // How it ended, if it has: a step not reached by then is not waiting.
  const ending = transferEnding(t, tr);
  // An index purchase: one transfer to Base, then each coin bought there.
  // It used to fall into the swap-in branch below ("Swap INDEX to USDC")
  // and read as done the moment Circle finished, before any coin was bought.
  if (tr.direction === INDEX_DIRECTION) {
    const held = tr.dstSwapTxHash ? null : heldSymbolOf(tr.errorDetail);
    return [
      { key: 'burn', label: t('Hand it to Circle'), sub: t('From your Stellar wallet'), hash: tr.burnTxHash, explorer: 'stellar' },
      { key: 'attest', label: t('Circle confirms'), sub: attested ? t('Confirmed') : ending ? t('Not reached') : t('Waiting for Circle'), hash: null, explorer: null, done: attested },
      { key: 'mint', label: t('Created on {{chain}}', { chain: 'Base' }), sub: t('Digital dollars at your own Base address'), hash: tr.mintTxHash, explorer: 'base', done: tr.status === 'COMPLETED' },
      {
        key: 'buy',
        label: t('Buy the coins'),
        sub: held
          ? t('{{coin}} is waiting for you to try it again', { coin: assetName(held) })
          : tr.dstSwapTxHash
            ? t('Every coin bought')
            : t('Buying each coin'),
        hash: null,
        explorer: null,
        done: !!tr.dstSwapTxHash,
      },
    ];
  }
  // The words the journey page uses (lib/flow/plans.ts), not the protocol's:
  // "Hand it to Circle", never "Burn on Stellar" (Niko 2026-11-09). A swap
  // that was sent back says so as its last step (the steps update on a refund).
  if (tr.direction === 'stellar_to_crosschain') {
    const coin = assetName(tr.dstAsset);
    return [
      { key: 'burn', label: t('Hand it to Circle'), sub: t('From your Stellar wallet'), hash: tr.burnTxHash, explorer: 'stellar' },
      { key: 'attest', label: t('Circle confirms'), sub: attested ? t('Confirmed') : ending ? t('Not reached') : t('Waiting for Circle'), hash: null, explorer: null, done: attested },
      { key: 'mint', label: t('Created on {{chain}}', { chain: 'Base' }), sub: t('Digital dollars at your own Base address'), hash: tr.mintTxHash, explorer: 'base' },
      ending?.kind === 'coming-back'
        ? { key: 'back', label: t('Sent back as digital dollars'), sub: t('The swap to {{coin}} could not finish', { coin }), hash: null, explorer: null, done: true }
        : { key: 'pivot', label: t('Buy {{coin}}', { coin }), sub: t('Exchanged on Base and sent to your {{coin}} wallet', { coin }), hash: tr.dstSwapTxHash, explorer: 'lifi' },
    ];
  }
  // inbound: crosschain_to_stellar
  const coming = [
    { key: 'burn', label: t('Hand it to Circle'), sub: t('From your Base address'), hash: tr.burnTxHash, explorer: 'base' as const },
    { key: 'attest', label: t('Circle confirms'), sub: attested ? t('Confirmed') : ending ? t('Not reached') : t('Waiting for Circle, about 20 minutes'), hash: null, explorer: null, done: attested },
    { key: 'mint', label: t('Created on Stellar'), sub: t('Digital dollars in your Stellar wallet'), hash: tr.mintTxHash, explorer: 'stellar' as const },
  ];
  // "Bring back as USDC": digital dollars on their way home, no exchange.
  if (tr.srcAsset === 'USDC' && tr.dstAsset === 'USDC') return coming;
  const coin = assetName(tr.srcAsset);
  const send: Step = { key: 'src', label: t('Send to the exchange'), sub: t('Exchanged for digital dollars on Base'), hash: tr.srcSwapTxHash, explorer: 'lifi' };
  if (ending?.kind === 'sent-back') {
    return [
      { ...send, done: true },
      { key: 'back', label: t('The exchange sends it back'), sub: t('{{coin}} back in your wallet', { coin }), hash: null, explorer: null, done: true },
    ];
  }
  if (ending?.kind === 'not-sent') {
    return [{ ...send, sub: t('Not sent: nothing left your wallet'), hash: null, stopped: true }];
  }
  return [send, ...coming];
}

const STATUS_CHIP: Record<string, { label: string; color: string; bg: string }> = {
  COMPLETED: { label: 'Completed', color: '#0A6649', bg: 'rgba(26,179,125,0.12)' },
  FAILED: { label: 'Failed', color: '#B91C1C', bg: 'rgba(220,38,38,0.1)' },
  REFUNDED: { label: 'Refunded', color: '#8A4A00', bg: 'rgba(245,158,11,0.12)' },
};

export function SwapDetailModal({
  transferId,
  onClose,
}: {
  transferId: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslate();
  const [transfer, setTransfer] = useState<CctpTransferDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryNote, setRetryNote] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    // Keep the last content mounted while the dialog animates closed (transferId
    // → null); only clear when a new transfer is opened, so the spinner shows.
    if (!transferId) return undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setTransfer(null);
    setRetryNote(null);
    setLoading(true);

    // LIVE VIEW, not a snapshot (#66 follow-up, observed live): this dialog
    // used to fetch once on open, so watching an in-flight swap from here
    // left the attestation spinner spinning forever after the transfer had
    // already COMPLETED. While the dialog is open and the transfer is not
    // terminal, re-read every few seconds; stop at a terminal status.
    const TERMINAL = ['COMPLETED', 'FAILED', 'REFUNDED'];
    const load = async () => {
      try {
        const headers = await buildAuthHeaders();
        // noAdvance = fast read (don't block on the state machine — the banner's
        // poke and the cron advance it); timeout so a slow/hung server surfaces
        // as an error instead of an endless spinner.
        const res = await fetch(`/api/cctp/transfers/${transferId}?noAdvance=1`, {
          headers,
          credentials: 'include',
          signal: abortTimeout(12_000),
        });
        const data = await res.json();
        if (cancelled) return;
        const fresh: CctpTransferDetail | null = res.ok ? (data.transfer ?? null) : null;
        // Never clobber shown content with a transient failure.
        if (fresh) setTransfer(fresh);
        // A swap out or an index purchase is COMPLETED once Circle is done,
        // with its last step still to come: keep watching until it lands.
        const lastStepPending =
          !!fresh &&
          fresh.status === 'COMPLETED' &&
          (fresh.direction === 'stellar_to_crosschain' || fresh.direction === INDEX_DIRECTION) &&
          !fresh.dstSwapTxHash;
        if (!fresh || !TERMINAL.includes(fresh.status) || lastStepPending) {
          timer = setTimeout(load, 8_000);
        }
      } catch {
        if (!cancelled) {
          // First load failed → the error text shows; keep retrying quietly so
          // a transient hiccup (or a mid-flight tab wake) self-heals.
          timer = setTimeout(load, 8_000);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [transferId]);

  const fmt = useCallback((v: string | null) => {
    if (!v) return '';
    const n = Number(v);
    // The app's language, never the browser's (DESIGN.md: a Slovenian browser
    // showed "1,1292 SOL" on an English page).
    return Number.isFinite(n) ? n.toLocaleString(appLocale(), { maximumFractionDigits: 8 }) : v;
  }, []);

  const steps = transfer ? buildSteps(transfer, t) : [];
  // First not-yet-done step is the "active" one (unless the whole thing is done).
  // Outbound COMPLETED means "minted on Base", not "delivered" — the pivot is
  // its own step and must earn its own green (live 2026-08-26: a stuck swap
  // showed all-green + Completed while the SOL never moved).
  // An index purchase too: COMPLETED is Circle's part, the coins come after.
  const settlesLater =
    transfer?.direction === 'stellar_to_crosschain' || transfer?.direction === INDEX_DIRECTION;
  const isDone =
    transfer?.status === 'COMPLETED' && (!settlesLater || !!transfer.dstSwapTxHash);
  // A coin of an index purchase that stopped retrying: the person's move.
  const heldCoin =
    transfer?.direction === INDEX_DIRECTION && !transfer.dstSwapTxHash
      ? heldSymbolOf(transfer.errorDetail)
      : null;
  // How it ended, in plain words: calm (grey, nothing lost) or a real failure.
  const ending = transfer ? transferEnding(t, transfer) : null;
  const isFailed = ending?.kind === 'failed';
  // Waiting on the USER, not on the chain — the icon must say "your move",
  // never spin (Niko 2026-08-26: "the loading stuff that is not correct").
  const needsAction =
    !!heldCoin ||
    (!!transfer &&
    transfer.direction === 'stellar_to_crosschain' &&
    (!!transfer.mintTxHash || transfer.status === 'COMPLETED') &&
    !transfer.dstSwapTxHash &&
    transfer.status !== 'REFUNDED');
  const activeIdx =
    isDone || ending?.calm ? -1 : steps.findIndex((s) => !(s.done || !!s.hash || s.stopped));
  const chip = transfer
    ? transfer.direction === 'stellar_to_crosschain' &&
      transfer.status === 'COMPLETED' &&
      !transfer.dstSwapTxHash
      ? { label: t('Action needed'), color: '#8A4A00', bg: 'rgba(245,158,11,0.12)' }
      : heldCoin
        ? { label: t('Action needed'), color: '#8A4A00', bg: 'rgba(245,158,11,0.12)' }
        : transfer.direction === INDEX_DIRECTION && transfer.status === 'COMPLETED' && !isDone
          ? undefined // Circle's part is done, the coins are still being bought
          : ending?.calm
            ? {
                label: ending.kind === 'not-sent' ? t('Not sent') : t('Sent back'),
                color: '#2A2A33',
                bg: 'rgba(10,10,15,0.06)',
              }
            : STATUS_CHIP[transfer.status]
    : undefined;

  // Put a held coin back in line from here (recovery reachable from wherever
  // the person already is): the same request and words as the buy page.
  const retryHeld = async () => {
    if (!transferId || !heldCoin) return;
    const coin = assetName(heldCoin);
    setRetrying(true);
    setRetryNote(t('Trying {{coin}} again on another route…', { coin }));
    const res = await fetch(`/api/index/purchases/${transferId}/retry`, {
      method: 'POST',
      headers: await buildAuthHeaders(),
      credentials: 'include',
    }).catch(() => null);
    setRetrying(false);
    // The coin is back in line (the server cleared the mark): show it so now,
    // without waiting for the next read.
    if (res?.ok) setTransfer((tr) => (tr ? { ...tr, errorDetail: null } : tr));
    setRetryNote(
      res?.ok
        ? t('{{coin}} is being bought again. It finishes on its own: follow it in Activity.', { coin })
        : t('That did not start. Your {{coin}} share is still safe at your own Base address.', { coin })
    );
    window.dispatchEvent(new Event('nf:activity-updated'));
  };

  return (
    <Dialog
      open={transferId !== null}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: 'var(--radius-lg)', p: '22px', maxWidth: 420 } }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: '14px' }}>
        <Typography sx={{ fontSize: '17px', fontWeight: 500, color: '#0A0A0F' }}>
          {transfer?.direction === INDEX_DIRECTION ? t('Purchase details') : t('Swap details')}
        </Typography>
        <Box
          component="button"
          onClick={onClose}
          sx={{ all: 'unset', cursor: 'pointer', color: '#9A9AA3', display: 'flex' }}
        >
          <Iconify icon="mingcute:close-line" width={20} />
        </Box>
      </Stack>

      {loading && !transfer ? (
        <Stack alignItems="center" sx={{ py: '32px' }}>
          <CircularProgress size={22} sx={{ color: '#0A0A0F' }} />
        </Stack>
      ) : !transfer ? (
        <Typography sx={{ fontSize: '13px', color: '#6B6B76', py: '20px', textAlign: 'center' }}>
          {t('Could not load this transfer.')}
        </Typography>
      ) : (
        <>
          {/* Route summary */}
          <Box
            sx={{
              p: '12px 14px',
              borderRadius: 'var(--radius-md)',
              bgcolor: '#FAFAFB',
              border: '1px solid rgba(10,10,15,0.08)',
              mb: '14px',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontSize: '15px', fontWeight: 500, color: '#0A0A0F', ...MONO }}>
                {transfer.direction === INDEX_DIRECTION ? (
                  <>
                    {fmt(transfer.srcAmount)} {transfer.srcAsset} →{' '}
                    {indexOfTransfer(transfer)?.name ?? t('an index')}
                  </>
                ) : (
                  <>
                    {fmt(transfer.srcAmount)} {transfer.srcAsset} → {fmt(transfer.dstAmount)}{' '}
                    {transfer.dstAsset}
                  </>
                )}
              </Typography>
              <Chip
                label={t(chip?.label ?? 'In progress')}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '11px',
                  fontWeight: 500,
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
                <Stack
                  key={s.key}
                  direction="row"
                  spacing={1.5}
                  alignItems="flex-start"
                  sx={{ py: '9px', opacity: stepDone || isActive ? 1 : 0.45 }}
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
                    {s.stopped ? (
                      <Box sx={{ width: 10, height: 2, bgcolor: '#9A9AA3' }} aria-label={t('Not sent')} />
                    ) : stepDone ? (
                      <Iconify icon="lets-icons:check-fill" width={20} sx={{ color: '#1AB37D' }} />
                    ) : showError ? (
                      <Iconify
                        icon="eva:alert-triangle-fill"
                        width={18}
                        sx={{ color: '#DC2626' }}
                      />
                    ) : isActive && needsAction ? (
                      <Iconify
                        icon="eva:alert-triangle-fill"
                        width={18}
                        sx={{ color: BRAND_COLORS.yellow.deep }}
                      />
                    ) : isActive ? (
                      <CircularProgress size={16} sx={{ color: '#0A0A0F' }} />
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
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: '13.5px',
                        fontWeight: 500,
                        color: '#0A0A0F',
                        lineHeight: 1.35,
                      }}
                    >
                      {s.label}
                    </Typography>
                    <Typography sx={{ fontSize: '11.5px', color: '#9A9AA3', lineHeight: 1.4 }}>
                      {s.sub}
                    </Typography>
                  </Box>
                  {s.hash && s.explorer && (
                    <Link
                      href={explorerUrl(s.explorer, s.hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '11px',
                        color: '#6B6B76',
                        textDecoration: 'none',
                        ...MONO,
                        flexShrink: 0,
                        '&:hover': { color: '#0A0A0F' },
                      }}
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
            <Typography sx={{ fontSize: '11px', color: '#9A9AA3', mt: '8px' }}>
              {t('Network fees on Base were sponsored by Normal.')}
            </Typography>
          )}

          {ending && (
            <Box
              sx={{
                mt: '12px',
                px: '12px',
                py: '10px',
                borderRadius: 'var(--radius-md)',
                bgcolor: ending.calm ? '#FAFAFB' : 'rgba(220,38,38,0.05)',
                border: ending.calm
                  ? '1px solid rgba(10,10,15,0.08)'
                  : '1px solid rgba(220,38,38,0.15)',
              }}
            >
              <Typography
                sx={{
                  fontSize: '12px',
                  color: '#2A2A33',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                }}
              >
                {ending.text}
              </Typography>
            </Box>
          )}
          {/* Honest-bridge-endings (Niko): a resumable transfer is finishable
              from HERE too — recovery reachable from wherever you already
              are. The swap page's banner owns the actual handler; this
              dispatches to it (and gets you there if you're elsewhere). */}
          {!ending &&
            transfer.status !== 'REFUNDED' &&
            ((transfer.direction === 'crosschain_to_stellar' &&
              !!transfer.srcSwapTxHash &&
              !transfer.burnTxHash &&
              transfer.status !== 'COMPLETED') ||
              (transfer.direction === 'stellar_to_crosschain' &&
                (!!transfer.mintTxHash || transfer.status === 'COMPLETED') &&
                !transfer.dstSwapTxHash)) && (
              <Box
                component="button"
                onClick={() => {
                  onClose();
                  if (window.location.pathname.startsWith(paths.swap)) {
                    window.dispatchEvent(
                      new CustomEvent('nf:cctp-resume', { detail: { id: transferId } })
                    );
                  } else {
                    // A dispatched event dies with the old document on a full
                    // navigation (live 2026-08-26: "clicking does nothing" from
                    // any page but /swap) — the id rides the URL instead.
                    window.location.assign(`${paths.swap}?cctpResume=${transferId}`);
                  }
                }}
                sx={{
                  mt: '12px',
                  appearance: 'none',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  px: '16px',
                  py: '10px',
                  width: '100%',
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  bgcolor: '#0A0A0F',
                  color: '#fff',
                  '&:hover': { opacity: 0.85 },
                }}
              >
                {t('Finish this transfer')}
              </Box>
            )}
          {heldCoin && !retrying && (
            <Box
              component="button"
              onClick={retryHeld}
              disabled={retrying}
              sx={{
                mt: '12px',
                appearance: 'none',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                px: '16px',
                py: '10px',
                width: '100%',
                fontSize: '13px',
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: 'pointer',
                bgcolor: '#0A0A0F',
                color: '#fff',
                '&:hover': { opacity: 0.85 },
              }}
            >
              {t('Try {{coin}} again', { coin: assetName(heldCoin) })}
            </Box>
          )}
          {retryNote && (
            <Typography sx={{ mt: '12px', fontSize: '13px', lineHeight: 1.5, color: 'text.secondary' }}>
              {retryNote}
            </Typography>
          )}
          {/* The swap's own page: its whole journey, where the money is, and
              the way forward when it waits (Niko 2026-11-09). */}
          {transferId && transfer.direction !== INDEX_DIRECTION && (
            <Link
              component={RouterLink}
              href={paths.swapTransfer(transferId)}
              onClick={onClose}
              sx={{
                display: 'block',
                mt: '14px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#0A0A0F',
                textAlign: 'center',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              {t('See every step')}
            </Link>
          )}
        </>
      )}
    </Dialog>
  );
}
