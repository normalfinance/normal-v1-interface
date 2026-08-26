'use client';

// In-flight & halted cross-ecosystem transfers, shown above the swap card.
//
// Custody note: at every step principal sits at the user's OWN addresses
// (Turnkey). The relayer only pays gas and replays user-signed CCTP messages —
// it never holds funds. So a halt is never "stuck on us"; it's the user's USDC
// on their own Base account, one signature from moving forward.
//
// Phases per transfer:
//   auto          — INBOUND post-burn only: the bridge/mint completes server-side
//                   (cron). Passive spinner, no action; closing the tab is safe.
//                   (Outbound bridging is NOT auto — its pivot signature still
//                   follows — so it's hidden here and owned by the progress modal.)
//   halt-receive  — INBOUND: LI.FI delivered USDC to the user's Base address but
//                   the burn never fired. One tap finishes it → USDC on Stellar.
//   halt-finish   — OUTBOUND: CCTP minted USDC to the user's Base address but the
//                   LI.FI pivot never ran. One tap finishes it → target asset.
// Recovery always moves funds FORWARD to the intended asset (never a costly
// reverse swap). Halts only surface after a short grace so a normal in-session
// swap (driven by the progress modal) isn't double-shown here.

import type { NetworkType } from '@normalfinance/utils';

import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { buildAuthHeaders } from '@/utils/http';
import { wireToUsdc } from '@/lib/cctp/decimals';
import { burnUsdcOnEvm } from '@/lib/cctp/burn-evm';
import { executePivotSwap } from '@/lib/cctp/pivot-swap';
import { EVM_USDC, CCTP_DOMAIN } from '@/lib/cctp/config';
import { useRef, useState, useEffect, useCallback } from 'react';
import { baseFallbackTransport } from '@/lib/chains/rpc-fallback';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { friendlyAppError } from '@/utils/errors/error-classifier';
import { parseFailedTool, parseFailedExchanges } from '@/lib/cctp/failure-class';
import { getActiveCctpTransfer, ACTIVE_CCTP_TRANSFER_EVENT } from '@/lib/cctp/active-transfer';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useSnackbar } from '@/components/template/snackbar';

type CrosschainSymbol = 'BTC' | 'ETH' | 'SOL';
const NATIVE_DECIMALS: Record<CrosschainSymbol, number> = { BTC: 8, ETH: 18, SOL: 9 };

interface TransferRow {
  id: string;
  network: string;
  direction: string;
  status: string;
  srcAsset: string;
  dstAsset: string;
  amountWire: string;
  srcAddress: string;
  destAddress: string;
  srcSwapTxHash: string | null;
  burnTxHash: string | null;
  mintTxHash: string | null;
  dstSwapTxHash: string | null;
  updatedAt: string;
  errorDetail?: string | null;
}

type Phase = 'hidden' | 'auto' | 'halt-receive' | 'halt-finish';

function rawPhase(tr: TransferRow): Phase {
  if (tr.status === 'REFUNDED') return 'hidden';
  const outbound = tr.direction === 'stellar_to_crosschain';
  if (outbound) {
    if (tr.dstSwapTxHash) return 'hidden'; // pivot done → settled
    if (!tr.burnTxHash) return 'hidden'; // pre-burn, still in-session
    if (tr.mintTxHash || tr.status === 'COMPLETED') return 'halt-finish'; // USDC on Base → pivot needed
    // Bridging Stellar→Base: the pivot signature still follows, so this is NOT
    // "no action needed". The progress modal owns it in-session; an orphaned one
    // resurfaces as halt-finish (after grace) once the mint lands.
    return 'hidden';
  }
  // inbound
  if (tr.status === 'COMPLETED') return 'hidden'; // USDC delivered to Stellar
  if (tr.burnTxHash) return 'auto'; // bridging Base → Stellar
  if (tr.srcSwapTxHash) return 'halt-receive'; // USDC on Base, needs the burn
  return 'hidden'; // pre-LI.FI delivery — nothing to recover yet
}

function phaseOf(tr: TransferRow, now: number): Phase {
  // No freshness grace (2026-08-26, second bite): hiding a "too fresh" halt
  // made the banner empty right after a reload, which also blinded the
  // resume/refund handlers that look rows up in the banner's list. The
  // in-session duplication the grace guarded against is already prevented by
  // the activeId filter, which tracks the ACTUAL open modal.
  void now;
  return rawPhase(tr);
}

async function readBaseUsdc(network: NetworkType, address: string): Promise<bigint> {
  const { http, erc20Abi, createPublicClient } = await import('viem');
  const { base, baseSepolia } = await import('viem/chains');
  const client = createPublicClient({
    chain: network === 'mainnet' ? base : baseSepolia,
    transport: network === 'mainnet' ? await baseFallbackTransport() : http(),
  });
  return client.readContract({
    address: EVM_USDC.base[network],
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  });
}

interface Props {
  addresses?: { BTC: string | null; ETH: string | null; SOL: string | null };
}

export function CctpRecoveryBanner({ addresses }: Props) {
  const { t } = useTranslate();
  const { user } = useSupabaseAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const transfersRef = useRef<TransferRow[]>([]);
  const recoverRef = useRef<((tr: TransferRow, ph: Phase) => void) | null>(null);
  const refundRef = useRef<((tr: TransferRow) => void) | null>(null);
  // Per-transfer memory of route elements that already reverted THIS session —
  // merged with the row's recorded detail so consecutive retries accumulate
  // exclusions instead of ping-ponging between two broken routes.
  const deniedRef = useRef(new Map<string, { bridges: Set<string>; exchanges: Set<string> }>());
  // While set in the future, phase checks skip the freshness grace — armed by
  // the failure modal so a halted transfer surfaces INSTANTLY (2026-08-26).
  const graceOffUntilRef = useRef(0);
  const phaseFor = (tr: TransferRow, now: number): Phase =>
    now < graceOffUntilRef.current ? rawPhase(tr) : phaseOf(tr, now);
  const [busyId, setBusyId] = useState<string | null>(null);
  // "Safe in your Base account" is only said once we've SEEN the balance —
  // an undelivered (later refunded) leg was described as safely arrived
  // (Niko, 2026-08-20). Unverified rows say "heading to" instead.
  const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set());
  // The transfer THIS tab's modal is actively working is hidden here — one
  // entrance per job. The engine clears the signal on error/done/unmount,
  // at which point the row reappears with its recovery action (the old
  // 2-minute grace timer guessed and guessed wrong on ~1h BTC legs).
  const [activeId, setActiveId] = useState<string | null>(getActiveCctpTransfer());
  useEffect(() => {
    const h = () => setActiveId(getActiveCctpTransfer());
    window.addEventListener(ACTIVE_CCTP_TRANSFER_EVENT, h);
    return () => window.removeEventListener(ACTIVE_CCTP_TRANSFER_EVENT, h);
  }, []);
  // 'auto' rows always render, active or not: the modal that owns the active
  // transfer can vanish (closed tab / navigation / dev reload), and a user
  // with money mid-bridge must never be left with zero surface (2026-08-26).
  const visibleTransfers = transfers.filter(
    (tr) => tr.id !== activeId || phaseFor(tr, Date.now()) === 'auto'
  );

  const refresh = useCallback(async () => {
    try {
      const headers = await buildAuthHeaders();
      // History returns full rows (all step hashes + updatedAt) so we can classify
      // every phase — including outbound "minted but pivot pending", which the
      // in-flight-only endpoint (COMPLETED-excluded) would miss.
      const res = await fetch('/api/cctp/transfers?history=1', { headers, credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const now = Date.now();
      const shown: TransferRow[] = (data.transfers ?? []).filter(
        (tr: TransferRow) => phaseFor(tr, now) !== 'hidden'
      );
      setTransfers(shown);
      transfersRef.current = shown;
      // Verify halted rows' actual Base balance (parallel, best-effort):
      // message honesty only — the receive handler re-checks at click.
      Promise.all(
        shown
          .filter((tr) => {
            const ph = phaseFor(tr, now);
            return ph === 'halt-receive' || ph === 'halt-finish';
          })
          .map(async (tr) => {
            try {
              const addr = phaseFor(tr, now) === 'halt-receive' ? tr.srcAddress : tr.destAddress;
              const bal = await readBaseUsdc(tr.network as NetworkType, addr);
              return bal > 0n ? tr.id : null;
            } catch {
              return null;
            }
          })
      ).then((ids) => {
        setVerifiedIds(new Set(ids.filter((x): x is string => !!x)));
      });
      // Poke any 'auto' (post-burn) transfer so its status advances between cron ticks.
      const auto = shown.find((tr) => phaseFor(tr, now) === 'auto');
      if (auto) {
        fetch(`/api/cctp/transfers/${auto.id}`, { headers, credentials: 'include' }).catch(
          () => {}
        );
      }
    } catch {
      /* transient */
    }
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    refresh();
    const id = setInterval(refresh, 30_000);
    // The engine announces every settle instantly (finish()/markFailed
    // dispatch nf:activity-updated) — re-read NOW instead of waiting out the
    // 30s tick, so a completed swap's "Completing automatically" row doesn't
    // keep spinning above the card after the modal already said Done (#66).
    const onActivity = () => {
      refresh();
    };
    // The transaction-row popup's "Finish this transfer" dispatches here —
    // recovery reachable from wherever the user already is; ONE handler.
    const onResume = (e: Event) => {
      const id2 = (e as CustomEvent<{ id?: string }>).detail?.id;
      if (!id2) return;
      const runResume = () => {
        const tr = transfersRef.current.find((x) => x.id === id2);
        if (!tr) return false;
        const ph = rawPhase(tr);
        // recoverRef: `recover` is declared below this effect; the ref keeps
        // the listener stable without a TDZ/order problem.
        if (ph === 'halt-receive' || ph === 'halt-finish') recoverRef.current?.(tr, ph);
        return true;
      };
      if (!runResume()) {
        // The list may still be loading (fresh navigation) — re-read and try
        // once more; a user's click must never be a silent no-op.
        refresh();
        setTimeout(runResume, 1500);
      }
    };
    // Failure modal on screen → surface the halt NOW, grace off for 5 min.
    const onHalted = () => {
      graceOffUntilRef.current = Date.now() + 5 * 60_000;
      refresh();
    };
    // "Bring back as USDC" from the failure modal — same refund handler the
    // banner button uses; retried once if the rows have not loaded yet.
    const onRefund = (e: Event) => {
      const id2 = (e as CustomEvent<{ id?: string }>).detail?.id;
      if (!id2) return;
      graceOffUntilRef.current = Date.now() + 5 * 60_000;
      const run = () => {
        const tr = transfersRef.current.find((x) => x.id === id2);
        if (tr && rawPhase(tr) === 'halt-finish') {
          refundRef.current?.(tr);
          return true;
        }
        return false;
      };
      if (!run()) {
        refresh();
        setTimeout(run, 1500);
      }
    };
    window.addEventListener('nf:cctp-halted', onHalted);
    window.addEventListener('nf:cctp-refund', onRefund);
    window.addEventListener('nf:activity-updated', onActivity);
    window.addEventListener('nf:cctp-resume', onResume);
    // Cross-page "Finish this transfer": the id arrives via ?cctpResume=…
    // because a dispatched event cannot survive a full navigation. One-shot;
    // the param is scrubbed so a reload does not re-trigger recovery.
    try {
      const params = new URLSearchParams(window.location.search);
      const resumeId = params.get('cctpResume');
      if (resumeId) {
        params.delete('cctpResume');
        window.history.replaceState(
          null,
          '',
          window.location.pathname + (params.toString() ? `?${params}` : '')
        );
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('nf:cctp-resume', { detail: { id: resumeId } }));
        }, 1500); // after the first refresh() has rows
      }
    } catch {
      /* URL API unavailable — the banner buttons still work */
    }
    return () => {
      clearInterval(id);
      window.removeEventListener('nf:cctp-halted', onHalted);
      window.removeEventListener('nf:cctp-refund', onRefund);
      window.removeEventListener('nf:cctp-resume', onResume);
      window.removeEventListener('nf:activity-updated', onActivity);
    };
  }, [user, refresh]);

  const patch = useCallback(
    (id: string, headers: HeadersInit, body: Record<string, string>) =>
      fetch(`/api/cctp/transfers/${id}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify(body),
      }),
    []
  );

  const recover = useCallback(
    async (tr: TransferRow, phase: Phase) => {
      setBusyId(tr.id);
      try {
        const network = tr.network as NetworkType;
        const headers = await buildAuthHeaders();
        // 1) relayer gas top-up (route is direction-aware; skips if already funded)
        await fetch('/api/cctp/gas-topup', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ transferId: tr.id }),
        });
        await new Promise((r) => setTimeout(r, 6000));

        if (phase === 'halt-receive') {
          // INBOUND: burn whatever USDC actually landed on the user's Base address.
          const bal = await readBaseUsdc(network, tr.srcAddress);
          if (bal === 0n) throw new Error(t('No USDC found on Base — it may already be bridging.'));
          const { burnTxHash } = await burnUsdcOnEvm({
            network,
            chain: 'base',
            evmAddress: tr.srcAddress,
            amountWire: bal,
            stellarRecipient: tr.destAddress,
          });
          await patch(tr.id, headers, { burnTxHash, dstAmount: wireToUsdc(bal) });
          enqueueSnackbar(t('Bridging your USDC to Stellar — completes automatically (~20 min).'), {
            variant: 'info',
          });
        } else {
          // OUTBOUND: swap the minted USDC on Base into the target asset via LI.FI.
          const toSymbol = tr.dstAsset as CrosschainSymbol;
          const toAddress = addresses?.[toSymbol] ?? null;
          if (!toAddress)
            throw new Error(
              t('Set up your {{sym}} wallet first to receive the funds.', { sym: tr.dstAsset })
            );
          const bal = await readBaseUsdc(network, tr.destAddress);
          if (bal === 0n)
            throw new Error(t('No USDC found on Base — it may already be on its way.'));
          // Deny list for THIS retry (2026-08-26 forensic): the recorded
          // bridge AND the recorded DEX steps — the poisoned element can be
          // either (today's reverts died in a fake token inside the "fly"
          // swap step, not in any bridge). Read the row FRESH first: the
          // cached copy went stale mid-session and re-picked the exact
          // route that had just reverted.
          let detail = tr.errorDetail ?? null;
          try {
            const fres = await fetch(`/api/cctp/transfers/${tr.id}`, {
              headers,
              credentials: 'include',
            });
            const fdata = await fres.json().catch(() => null);
            if (fdata?.transfer) detail = fdata.transfer.errorDetail ?? detail;
          } catch {
            /* stale detail is still better than none */
          }
          const remembered = deniedRef.current.get(tr.id);
          const denyBridges = [
            ...new Set(
              [parseFailedTool(detail), ...(remembered?.bridges ?? [])].filter(
                (x): x is string => !!x
              )
            ),
          ];
          const denyExchanges = [
            ...new Set([...parseFailedExchanges(detail), ...(remembered?.exchanges ?? [])]),
          ];
          const result = await executePivotSwap({
            evmAddress: tr.destAddress,
            toSymbol,
            toAddress,
            amountWire: bal,
            denyBridges: denyBridges.length ? denyBridges : undefined,
            denyExchanges: denyExchanges.length ? denyExchanges : undefined,
          });
          const dstAmount = BigNumber(result.toAmountMin)
            .dividedBy(BigNumber(10).pow(NATIVE_DECIMALS[toSymbol]))
            .toFixed();
          await patch(tr.id, headers, { dstSwapTxHash: result.txHash, dstAmount });
          enqueueSnackbar(t('{{sym}} is on its way to your wallet.', { sym: tr.dstAsset }), {
            variant: 'info',
          });
        }
        refresh();
      } catch (e: any) {
        console.error('[cctp recovery] failed:', e); // surface stack
        // A classified revert records the failed bridge so the NEXT retry
        // quotes without it (failover applies here too, not just in-run).
        if (e?.__pivotRevert) {
          const entry = deniedRef.current.get(tr.id) ?? {
            bridges: new Set<string>(),
            exchanges: new Set<string>(),
          };
          if (typeof e.tool === 'string' && e.tool) entry.bridges.add(e.tool);
          for (const x of Array.isArray(e.exchanges) ? e.exchanges : [])
            if (typeof x === 'string' && x) entry.exchanges.add(x);
          deniedRef.current.set(tr.id, entry);
          await patch(tr.id, await buildAuthHeaders(), {
            pivotRevertTool: e.tool ?? '',
            pivotRevertTxHash: e.txHash ?? '',
            pivotRevertExchanges: Array.isArray(e.exchanges) ? e.exchanges.join('+') : '',
          }).catch(() => {});
        }
        enqueueSnackbar(
          e?.__pivotRevert
            ? t(
                'The exchange route failed on the provider side — your USDC is safe. Try again to use a different route.'
              )
            : friendlyAppError(e),
          { variant: 'error' }
        );
      } finally {
        setBusyId(null);
      }
    },
    [t, addresses, enqueueSnackbar, patch, refresh]
  );
  recoverRef.current = recover;

  // OUTBOUND escape hatch: when the pivot to the target asset has no route, bring
  // the minted USDC back to Stellar via a fresh CCTP bridge (Base → Stellar), then
  // retire the original swap as refunded. Forward ("Finish") stays the default;
  // this is the fallback so funds are never stranded on Base.
  const refundToStellar = useCallback(
    async (tr: TransferRow) => {
      setBusyId(tr.id);
      try {
        const network = tr.network as NetworkType;
        const headers = await buildAuthHeaders();
        // The user's own Base address (outbound destAddress) holds the minted USDC.
        const bal = await readBaseUsdc(network, tr.destAddress);
        if (bal === 0n) throw new Error(t('No USDC found on Base — it may already be moving.'));
        // Fresh Base→Stellar bridge to the user's own Stellar account. `refund`
        // bypasses the $10 min / cap — this recovers existing funds, not a new swap.
        const createRes = await fetch('/api/cctp/transfers', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            direction: 'crosschain_to_stellar',
            sourceDomain: CCTP_DOMAIN.base,
            destDomain: CCTP_DOMAIN.stellar,
            amountWire: bal.toString(),
            srcAsset: 'USDC',
            dstAsset: 'USDC',
            srcAmount: wireToUsdc(bal),
            srcAddress: tr.destAddress, // user's Base (source of the re-bridge)
            destAddress: tr.srcAddress, // user's Stellar (outbound srcAddress = Stellar)
            refund: true,
          }),
        });
        const createData = await createRes.json();
        if (!createRes.ok || !createData.id)
          throw new Error(createData.error ?? t('Could not start the refund.'));
        const newId: string = createData.id;
        // Relayer gas for the new burn (route tops up the Base address), then burn.
        await fetch('/api/cctp/gas-topup', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ transferId: newId }),
        });
        await new Promise((r) => setTimeout(r, 6000));
        const { burnTxHash } = await burnUsdcOnEvm({
          network,
          chain: 'base',
          evmAddress: tr.destAddress,
          amountWire: bal,
          stellarRecipient: tr.srcAddress,
        });
        await patch(newId, headers, { burnTxHash, dstAmount: wireToUsdc(bal) });
        // Retire the original outbound swap as refunded.
        await patch(tr.id, headers, { markRefunded: 'true' });
        enqueueSnackbar(
          t('Bringing your USDC back to Stellar — completes automatically (~20 min).'),
          { variant: 'info' }
        );
        refresh();
      } catch (e: any) {
        console.error('[cctp refund] failed:', e); // surface stack
        enqueueSnackbar(friendlyAppError(e), {
          variant: 'error',
        });
      } finally {
        setBusyId(null);
      }
    },
    [t, enqueueSnackbar, patch, refresh]
  );
  refundRef.current = refundToStellar;

  if (!visibleTransfers.length) return null;
  const now = Date.now();

  return (
    <Box
      sx={{
        mb: '12px',
        p: '12px 16px',
        borderRadius: '14px',
        bgcolor: 'rgba(110,139,255,0.07)',
        border: '1px solid rgba(110,139,255,0.25)',
      }}
    >
      {visibleTransfers.map((tr) => {
        const phase = phaseFor(tr, now);
        const isHalt = phase === 'halt-receive' || phase === 'halt-finish';
        const usd = (Number(tr.amountWire) / 1e6).toFixed(2);
        return (
          <Stack key={tr.id} direction="row" spacing={1.5} alignItems="center" sx={{ py: '5px' }}>
            {isHalt ? (
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  bgcolor: '#F59E0B',
                  flexShrink: 0,
                }}
              />
            ) : (
              <CircularProgress size={14} sx={{ color: '#3E51B1', flexShrink: 0 }} />
            )}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#0A0A0F' }}>
                {t('{{amount}} USDC · {{from}} → {{to}}', {
                  amount: usd,
                  from: tr.srcAsset,
                  to: tr.dstAsset,
                })}
              </Typography>
              <Typography sx={{ fontSize: '11.5px', color: 'rgba(10,10,15,0.5)' }}>
                {phase === 'halt-receive'
                  ? verifiedIds.has(tr.id)
                    ? t(
                        'Your USDC is safe in your own Base account — finish delivering it to Stellar'
                      )
                    : t(
                        'USDC heading to your own Base account via the bridge — finish once it arrives'
                      )
                  : phase === 'halt-finish'
                    ? verifiedIds.has(tr.id)
                      ? t(
                          'Your USDC is safe in your own Base account — finish the swap to {{sym}}',
                          { sym: tr.dstAsset }
                        )
                      : t('USDC heading to your own Base account — finish once it arrives')
                    : t('Completing automatically — no action needed')}
              </Typography>
            </Box>
            {isHalt && (
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }}>
                <Button
                  onClick={() => recover(tr, phase)}
                  disabled={busyId === tr.id}
                  size="small"
                  sx={{
                    bgcolor: '#0A0A0F',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: '10px',
                    px: '12px',
                    '&:hover': { bgcolor: '#1A1A28' },
                    '&.Mui-disabled': { bgcolor: 'rgba(10,10,15,0.3)', color: '#fff' },
                  }}
                >
                  {busyId === tr.id
                    ? t('Working…')
                    : phase === 'halt-receive'
                      ? t('Receive USDC')
                      : t('Finish')}
                </Button>
                {phase === 'halt-finish' && (
                  <Button
                    onClick={() => refundToStellar(tr)}
                    disabled={busyId === tr.id}
                    size="small"
                    sx={{
                      bgcolor: 'transparent',
                      color: '#0A0A0F',
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: '10px',
                      px: '10px',
                      border: '1px solid rgba(10,10,15,0.2)',
                      '&:hover': { bgcolor: 'rgba(10,10,15,0.04)' },
                      '&.Mui-disabled': {
                        color: 'rgba(10,10,15,0.3)',
                        borderColor: 'rgba(10,10,15,0.1)',
                      },
                    }}
                  >
                    {t('Bring back as USDC')}
                  </Button>
                )}
              </Stack>
            )}
          </Stack>
        );
      })}
    </Box>
  );
}
