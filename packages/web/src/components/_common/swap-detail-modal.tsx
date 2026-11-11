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
import { abortTimeout } from '@/utils/abort-timeout';
import { useInProgress } from '@/lib/cctp/in-progress';
import { assetName } from '@/lib/portfolio/asset-names';
import { useState, useEffect, useCallback } from 'react';
import { transferEnding } from '@/lib/cctp/transfer-ending';
import { autoFinishAhead } from '@/sections/swap/cctp-phase';
import { autopilotActiveFor } from '@/lib/cctp/autopilot-active';
import { heldSymbolOf, INDEX_DIRECTION } from '@/lib/index/legs';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import {
  INK,
  WELL,
  FAINT,
  MUTED,
  PAPER,
  DANGER,
  SUCCESS,
  WARNING,
  INK_SOFT,
  BRAND_COLORS,
} from '@/theme/brand-colors';

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
  updatedAt: string;
  retryCount?: number | null;
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

/**
 * @param arrived  a swap in's digital dollars were seen at the person's Base
 *                 address (the swap page's keeper, when it is on the page)
 */
function buildSteps(tr: CctpTransferDetail, t: Translate, arrived = false): Step[] {
  const attested = !!tr.eventNonce || !!tr.mintTxHash || tr.status === 'COMPLETED';
  // How it ended, if it has: a step not reached by then is not waiting.
  const ending = transferEnding(t, tr);
  // An index purchase: one transfer to Base, then each coin bought there.
  // It used to fall into the swap-in branch below ("Swap INDEX to USDC")
  // and read as done the moment Circle finished, before any coin was bought.
  if (tr.direction === INDEX_DIRECTION) {
    const held = tr.dstSwapTxHash ? null : heldSymbolOf(tr.errorDetail);
    return [
      {
        key: 'burn',
        label: t('Hand it to Circle'),
        sub: t('From your Stellar wallet'),
        hash: tr.burnTxHash,
        explorer: 'stellar',
      },
      {
        key: 'attest',
        label: t('Circle confirms'),
        sub: attested ? t('Confirmed') : ending ? t('Not reached') : t('Waiting for Circle'),
        hash: null,
        explorer: null,
        done: attested,
      },
      {
        key: 'mint',
        label: t('Created on {{chain}}', { chain: 'Base' }),
        sub: t('Digital dollars at your own Base address'),
        hash: tr.mintTxHash,
        explorer: 'base',
        done: tr.status === 'COMPLETED',
      },
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
      {
        key: 'burn',
        label: t('Hand it to Circle'),
        sub: t('From your Stellar wallet'),
        hash: tr.burnTxHash,
        explorer: 'stellar',
      },
      {
        key: 'attest',
        label: t('Circle confirms'),
        sub: attested ? t('Confirmed') : ending ? t('Not reached') : t('Waiting for Circle'),
        hash: null,
        explorer: null,
        done: attested,
      },
      {
        key: 'mint',
        label: t('Created on {{chain}}', { chain: 'Base' }),
        sub: t('Digital dollars at your own Base address'),
        hash: tr.mintTxHash,
        explorer: 'base',
      },
      ending?.kind === 'coming-back'
        ? {
            key: 'back',
            label: t('Sent back as digital dollars'),
            sub: t('The swap to {{coin}} could not finish', { coin }),
            hash: null,
            explorer: null,
            done: true,
          }
        : {
            key: 'pivot',
            label: t('Buy {{coin}}', { coin }),
            sub: t('Exchanged on Base and sent to your {{coin}} wallet', { coin }),
            hash: tr.dstSwapTxHash,
            explorer: 'lifi',
          },
    ];
  }
  // inbound: crosschain_to_stellar
  const coming = [
    {
      key: 'burn',
      label: t('Hand it to Circle'),
      sub: t('From your Base address'),
      hash: tr.burnTxHash,
      explorer: 'base' as const,
    },
    {
      key: 'attest',
      label: t('Circle confirms'),
      sub: attested
        ? t('Confirmed')
        : ending
          ? t('Not reached')
          : t('Waiting for Circle, about 20 minutes'),
      hash: null,
      explorer: null,
      done: attested,
    },
    {
      key: 'mint',
      label: t('Created on Stellar'),
      sub: t('Digital dollars in your Stellar wallet'),
      hash: tr.mintTxHash,
      explorer: 'stellar' as const,
    },
  ];
  // "Bring back as USDC": digital dollars on their way home, no exchange.
  if (tr.srcAsset === 'USDC' && tr.dstAsset === 'USDC') return coming;
  const coin = assetName(tr.srcAsset);
  const send: Step = {
    key: 'src',
    label: t('Send to the exchange'),
    sub: t('From your {{coin}} wallet', { coin }),
    hash: tr.srcSwapTxHash,
    explorer: 'lifi',
  };
  // The exchange's own part. Sending the coin is not it (Niko 2026-11-10:
  // this said "Exchanged for digital dollars on Base" while Bitcoin was
  // still confirming, and Circle's step turned): it is done once the digital
  // dollars are seen at the Base address, or Circle already has them.
  const exchanged: Step = {
    key: 'exchange',
    label: t('Exchanged for digital dollars'),
    sub: t('At your own Base address'),
    hash: null,
    explorer: null,
    done: arrived || !!tr.burnTxHash || tr.status === 'COMPLETED',
  };
  if (ending?.kind === 'sent-back') {
    return [
      { ...send, done: true },
      {
        key: 'back',
        label: t('The exchange sends it back'),
        sub: t('{{coin}} back in your wallet', { coin }),
        hash: null,
        explorer: null,
        done: true,
      },
    ];
  }
  if (ending?.kind === 'not-sent') {
    return [{ ...send, sub: t('Not sent: nothing left your wallet'), hash: null, stopped: true }];
  }
  return [send, exchanged, ...coming];
}

const STATUS_CHIP: Record<string, { label: string; color: string; bg: string }> = {
  COMPLETED: { label: 'Completed', color: SUCCESS, bg: 'rgba(26,179,125,0.12)' },
  FAILED: { label: 'Failed', color: DANGER, bg: 'rgba(220,38,38,0.1)' },
  REFUNDED: { label: 'Refunded', color: WARNING, bg: 'rgba(245,158,11,0.12)' },
};

export function SwapDetailModal({
  transferId,
  onClose,
}: {
  transferId: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslate();
  const { user } = useSupabaseAuth();
  const [transfer, setTransfer] = useState<CctpTransferDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryNote, setRetryNote] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  // Is auto-finish on? Asked only for a swap out waiting on its last swap.
  const [autopilotOn, setAutopilotOn] = useState<boolean | null>(null);

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

  // The swap page's keeper, when it is on this page, knows where a swap in's
  // digital dollars are and who it waits on.
  const known = useInProgress().items.find((i) => i.id === transferId);
  const steps = transfer ? buildSteps(transfer, t, !!known?.onBase) : [];
  // First not-yet-done step is the "active" one (unless the whole thing is done).
  // Outbound COMPLETED means "minted on Base", not "delivered" — the pivot is
  // its own step and must earn its own green (live 2026-08-26: a stuck swap
  // showed all-green + Completed while the SOL never moved).
  // An index purchase too: COMPLETED is Circle's part, the coins come after.
  const settlesLater =
    transfer?.direction === 'stellar_to_crosschain' || transfer?.direction === INDEX_DIRECTION;
  const isDone = transfer?.status === 'COMPLETED' && (!settlesLater || !!transfer.dstSwapTxHash);
  // A coin of an index purchase that stopped retrying: the person's move.
  const heldCoin =
    transfer?.direction === INDEX_DIRECTION && !transfer.dstSwapTxHash
      ? heldSymbolOf(transfer.errorDetail)
      : null;
  // How it ended, in plain words: calm (grey, nothing lost) or a real failure.
  const ending = transfer ? transferEnding(t, transfer) : null;
  const isFailed = ending?.kind === 'failed';
  // A swap out whose digital dollars are at the person's Base address and
  // still need the swap to the coin.
  const pivotWaits =
    !!transfer &&
    transfer.direction === 'stellar_to_crosschain' &&
    (!!transfer.mintTxHash || transfer.status === 'COMPLETED') &&
    !transfer.dstSwapTxHash &&
    transfer.status !== 'REFUNDED';
  // ...which auto-finish takes on its own when it is on (Niko 2026-11-10: the
  // In progress list and the swap's page say so; this must not say "Action
  // needed" about the same swap). Unknown counts as on: never on a guess.
  const autoFinishing =
    pivotWaits && autopilotOn !== false && autoFinishAhead(transfer, Date.now());
  // Waiting on the USER, not on the chain — the icon must say "your move",
  // never spin (Niko 2026-08-26: "the loading stuff that is not correct").
  const needsAction = !!heldCoin || (pivotWaits && !autoFinishing) || known?.waitsOn === 'person';
  // Still under way with a step that may need the person: the swap's own
  // page decides who it waits on, so the popup sends them there.
  const resumable =
    !!transfer &&
    !ending &&
    transfer.status !== 'REFUNDED' &&
    ((transfer.direction === 'crosschain_to_stellar' &&
      !!transfer.srcSwapTxHash &&
      !transfer.burnTxHash &&
      transfer.status !== 'COMPLETED') ||
      pivotWaits);
  useEffect(() => {
    if (!pivotWaits || !user) return undefined;
    let live = true;
    autopilotActiveFor(user.id).then((on) => {
      if (live) setAutopilotOn(on);
    });
    return () => {
      live = false;
    };
  }, [pivotWaits, user]);
  const activeIdx =
    isDone || ending?.calm ? -1 : steps.findIndex((s) => !(s.done || !!s.hash || s.stopped));
  const chip = transfer
    ? transfer.direction === 'stellar_to_crosschain' &&
      transfer.status === 'COMPLETED' &&
      !transfer.dstSwapTxHash
      ? autoFinishing
        ? undefined // under way, finished on its own: no chip, like any swap in flight
        : { label: t('Action needed'), color: WARNING, bg: 'rgba(245,158,11,0.12)' }
      : heldCoin
        ? { label: t('Action needed'), color: WARNING, bg: 'rgba(245,158,11,0.12)' }
        : transfer.direction === INDEX_DIRECTION && transfer.status === 'COMPLETED' && !isDone
          ? undefined // Circle's part is done, the coins are still being bought
          : ending?.calm
            ? {
                label: ending.kind === 'not-sent' ? t('Not sent') : t('Sent back'),
                color: INK_SOFT,
                bg: 'rgba(var(--nf-ink-rgb),0.06)',
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
        ? t('{{coin}} is being bought again. It finishes on its own: follow it in Activity.', {
            coin,
          })
        : t('That did not start. Your {{coin}} share is still safe at your own Base address.', {
            coin,
          })
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
        <Typography sx={{ fontSize: '17px', fontWeight: 500, color: INK }}>
          {transfer?.direction === INDEX_DIRECTION ? t('Purchase details') : t('Swap details')}
        </Typography>
        <Box
          component="button"
          onClick={onClose}
          sx={{ all: 'unset', cursor: 'pointer', color: FAINT, display: 'flex' }}
        >
          <Iconify icon="mingcute:close-line" width={20} />
        </Box>
      </Stack>

      {loading && !transfer ? (
        <Stack alignItems="center" sx={{ py: '32px' }}>
          <CircularProgress size={22} sx={{ color: INK }} />
        </Stack>
      ) : !transfer ? (
        <Typography sx={{ fontSize: '13px', color: MUTED, py: '20px', textAlign: 'center' }}>
          {t('Could not load this transfer.')}
        </Typography>
      ) : (
        <>
          {/* Route summary */}
          <Box
            sx={{
              p: '12px 14px',
              borderRadius: 'var(--radius-md)',
              bgcolor: WELL,
              border: '1px solid rgba(var(--nf-ink-rgb),0.08)',
              mb: '14px',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontSize: '15px', fontWeight: 500, color: INK, ...MONO }}>
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
                  color: chip?.color ?? WARNING,
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
                      <Box
                        sx={{ width: 10, height: 2, bgcolor: FAINT }}
                        aria-label={t('Not sent')}
                      />
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
                      <CircularProgress size={16} sx={{ color: INK }} />
                    ) : (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: 'rgba(var(--nf-ink-rgb),0.15)',
                        }}
                      />
                    )}
                  </Box>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: '13.5px',
                        fontWeight: 500,
                        color: INK,
                        lineHeight: 1.35,
                      }}
                    >
                      {s.label}
                    </Typography>
                    <Typography sx={{ fontSize: '11.5px', color: FAINT, lineHeight: 1.4 }}>
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
                        color: MUTED,
                        textDecoration: 'none',
                        ...MONO,
                        flexShrink: 0,
                        '&:hover': { color: INK },
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
            <Typography sx={{ fontSize: '11px', color: FAINT, mt: '8px' }}>
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
                bgcolor: ending.calm ? WELL : 'rgba(220,38,38,0.05)',
                border: ending.calm
                  ? '1px solid rgba(var(--nf-ink-rgb),0.08)'
                  : '1px solid rgba(220,38,38,0.15)',
              }}
            >
              <Typography
                sx={{
                  fontSize: '12px',
                  color: INK_SOFT,
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                }}
              >
                {ending.text}
              </Typography>
            </Box>
          )}
          {/* Honest-bridge-endings (Niko): a transfer that may still need a
              step is reachable from HERE too. It opens the swap's own page,
              which knows who it waits on and offers "Finish the swap" only
              when the person is needed (Niko 2026-11-10: a "finish" button
              here could only answer "not yet" while the exchange or
              auto-finish had it). */}
          {resumable && transferId && (
            <Box
              component={RouterLink}
              href={paths.swapTransfer(transferId)}
              onClick={onClose}
              sx={{
                display: 'block',
                boxSizing: 'border-box',
                textAlign: 'center',
                textDecoration: 'none',
                mt: '12px',
                borderRadius: 'var(--radius-md)',
                px: '16px',
                py: '10px',
                width: '100%',
                fontSize: '13px',
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: 'pointer',
                bgcolor: INK,
                color: PAPER,
                '&:hover': { opacity: 0.85 },
              }}
            >
              {t('See where it stands')}
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
                bgcolor: INK,
                color: PAPER,
                '&:hover': { opacity: 0.85 },
              }}
            >
              {t('Try {{coin}} again', { coin: assetName(heldCoin) })}
            </Box>
          )}
          {retryNote && (
            <Typography
              sx={{ mt: '12px', fontSize: '13px', lineHeight: 1.5, color: 'text.secondary' }}
            >
              {retryNote}
            </Typography>
          )}
          {/* The swap's own page: its whole journey, where the money is, and
              the way forward when it waits (Niko 2026-11-09). */}
          {transferId && !resumable && (
            <Link
              component={RouterLink}
              href={
                transfer.direction === INDEX_DIRECTION
                  ? paths.indexes.purchase(transferId)
                  : paths.swapTransfer(transferId)
              }
              onClick={onClose}
              sx={{
                display: 'block',
                mt: '14px',
                fontSize: '13px',
                fontWeight: 500,
                color: INK,
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
