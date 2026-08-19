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
import { useState, useEffect, useCallback } from 'react';
import { EVM_USDC, CCTP_DOMAIN } from '@/lib/cctp/config';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
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
}

type Phase = 'hidden' | 'auto' | 'halt-receive' | 'halt-finish';

const GRACE_MS = 120_000; // don't flag a halt while a normal in-session swap runs

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
  const p = rawPhase(tr);
  if ((p === 'halt-receive' || p === 'halt-finish') && now - Date.parse(tr.updatedAt) < GRACE_MS) {
    return 'hidden'; // too fresh — the in-session flow is still handling it
  }
  return p;
}

async function readBaseUsdc(network: NetworkType, address: string): Promise<bigint> {
  const { http, erc20Abi, createPublicClient } = await import('viem');
  const { base, baseSepolia } = await import('viem/chains');
  const client = createPublicClient({
    chain: network === 'mainnet' ? base : baseSepolia,
    transport: http(),
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
  const [busyId, setBusyId] = useState<string | null>(null);
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
  const visibleTransfers = transfers.filter((tr) => tr.id !== activeId);

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
        (tr: TransferRow) => phaseOf(tr, now) !== 'hidden'
      );
      setTransfers(shown);
      // Poke any 'auto' (post-burn) transfer so its status advances between cron ticks.
      const auto = shown.find((tr) => phaseOf(tr, now) === 'auto');
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
    window.addEventListener('nf:activity-updated', onActivity);
    return () => {
      clearInterval(id);
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
          const result = await executePivotSwap({
            evmAddress: tr.destAddress,
            toSymbol,
            toAddress,
            amountWire: bal,
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
        enqueueSnackbar(
          e?.message ?? t('Recovery failed — your funds are safe; please try again.'),
          { variant: 'error' }
        );
      } finally {
        setBusyId(null);
      }
    },
    [t, addresses, enqueueSnackbar, patch, refresh]
  );

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
        enqueueSnackbar(e?.message ?? t('Refund failed — your funds are safe; please try again.'), {
          variant: 'error',
        });
      } finally {
        setBusyId(null);
      }
    },
    [t, enqueueSnackbar, patch, refresh]
  );

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
        const phase = phaseOf(tr, now);
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
                  ? t(
                      'Your USDC is safe in your own Base account — finish delivering it to Stellar'
                    )
                  : phase === 'halt-finish'
                    ? t('Your USDC is safe in your own Base account — finish the swap to {{sym}}', {
                        sym: tr.dstAsset,
                      })
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
