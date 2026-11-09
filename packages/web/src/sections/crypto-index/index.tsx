'use client';

import type { IndexMeta } from '@/lib/index/indexes';
import type { FlowPlan, FlowSummary } from '@/lib/flow/types';
import type { TurnkeyChain } from '@/lib/turnkey/add-account';
import type { TurnkeyWalletInfo } from '@/lib/turnkey/wallet-info';

import { paths } from '@/routes/paths';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { mintLanded } from '@/lib/index/legs';
import { CHAINS } from '@/lib/chains/registry';
import { buildAuthHeaders } from '@/utils/http';
import { CCTP_DOMAIN } from '@/lib/cctp/config';
import { RouterLink } from '@/routes/components';
import { useMarkets } from '@/hooks/use-markets';
import { useFlowRun } from '@/hooks/use-flow-run';
import { minSpanFor } from '@/lib/prices/markets';
import { useNetworkStore } from '@normalfinance/state';
import { assetDisplay } from '@/lib/portfolio/display';
import { confirmAction } from '@/lib/auth/action-code';
import { DashboardContent } from '@/layouts/dashboard';
import { evmAddressToBytes } from '@/lib/cctp/addresses';
import { readBridgeStatus } from '@/lib/flow/lifi-status';
import { burnUsdcOnStellar } from '@/lib/cctp/burn-stellar';
import { useWalletBalances } from '@/hooks/use-wallet-balances';
import { getTurnkeyWalletInfo } from '@/lib/turnkey/wallet-info';
import { basketChange, basketSeries } from '@/lib/index/indexes';
import { uncertainBurnHash } from '@/lib/chains/broadcast-safety';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { friendlyAppError } from '@/utils/errors/error-classifier';
import { indexBuyStepId, indexPurchasePlan } from '@/lib/flow/plans';
import { CoinStack, WeightBar } from '@/sections/indexes/index-parts';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { INK, FAINT, HOVER, MUTED, CANVAS, HAIRLINE_STRONG } from '@/theme/brand-colors';
import {
  weightLabel,
  CRYPTO_INDEX,
  splitPurchase,
  purchaseVerdict,
  wireToUsdNumber,
  minimumPurchaseWire,
} from '@/lib/index/basket';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import InputBase from '@mui/material/InputBase';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';

import { AppPageHeader, INK_BUTTON_SX } from '@/components/_common/brand';
import { ChainSetupDialog } from '@/components/_common/chain-setup-dialog';
import AutopilotConsentDialog from '@/components/_common/autopilot-consent-dialog';
import { FlowView, FlowHost, FlowNotice, FlowPortal } from '@/components/_common/flow';
import {
  baseTxLink,
  chainTxLink,
  lifiTrackLink,
  stellarTxLink,
  baseAddressHref,
  stellarAccountHref,
} from '@/components/_common/flow/flow-links';
import {
  BOX_PX,
  Change,
  FIGURES,
  ListRow,
  RowList,
  AppBlock,
  ROW_LINES,
  Sparkline,
  formatUsd,
  assetName,
  formatCoin,
  formatPrice,
} from '@/components/_common/app-ui';

// ---------------------------------------------------------------------------
// /app/indexes/<slug>: buy an index (Top 3: Bitcoin, Ethereum and Solana) in one purchase, with
// one passkey signature (lib/index/basket.ts for how the money moves).
//
// The page follows the app's rule for moving money: "Review purchase" opens
// the review with every step and figure, only Confirm signs, and the journey
// then follows the money. After the Stellar transfer is sent, the rest needs
// no page: the cron mints on Base and buys the coins if this page closes.
// ---------------------------------------------------------------------------

const LIFI_CHAIN_ID = { BTC: 20000000000001, ETH: 1, SOL: 1151111081099710 } as const;
const BASE_LIFI_CHAIN_ID = 8453;
const CHAIN_OF = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana' } as const;
type Coin = keyof typeof CHAIN_OF;

const sleep = (ms: number) =>
  new Promise<void>((r) => {
    setTimeout(r, ms);
  });

const toWire = (amount: string): bigint | null => {
  const n = BigNumber(amount);
  if (!n.isFinite() || n.lte(0)) return null;
  return BigInt(n.times(1_000_000).integerValue(BigNumber.ROUND_DOWN).toFixed());
};

type LegRead = {
  symbol: Coin;
  status: string;
  dstSwapTxHash: string | null;
  dstAmount: string | null;
  amountWire: string;
};
type PurchaseRead = {
  purchase: {
    id: string;
    status: string;
    burnTxHash: string | null;
    mintTxHash: string | null;
    destAddress: string;
  };
  phase: string;
  legs: LegRead[];
};

async function readPurchase(id: string): Promise<PurchaseRead | null> {
  try {
    const res = await fetch(`/api/index/purchases/${id}`, {
      headers: await buildAuthHeaders(),
      credentials: 'include',
    });
    return res.ok ? ((await res.json()) as PurchaseRead) : null;
  } catch {
    return null;
  }
}

export function CryptoIndexView({ meta }: { meta: IndexMeta }) {
  const { t } = useTranslate();
  const { user } = useSupabaseAuth();
  const network = useNetworkStore((s) => s.network);
  const { markets } = useMarkets();
  // The basket's day, for the page's line and today's figure (the card's sums).
  const daySeries = useMemo(
    () => basketSeries(meta.def, (s) => markets[s]?.sparkline24h),
    [meta.def, markets]
  );
  const today = basketChange(meta.def, (s) => markets[s]?.change24h);
  const { assets, refresh } = useWalletBalances(true);
  const flow = useFlowRun();
  const { run: flowState } = flow;

  const [amount, setAmount] = useState('');
  const [view, setView] = useState<'form' | 'flow'>('form');
  const [frozen, setFrozen] = useState<{ summary: FlowSummary; lede: string } | null>(null);
  const [info, setInfo] = useState<TurnkeyWalletInfo | null>(null);
  const [autopilot, setAutopilot] = useState<boolean | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [setupChain, setSetupChain] = useState<TurnkeyChain | null>(null);
  const [busy, setBusy] = useState(false);
  // A coin whose exchange kept failing: its purchase and name, for Try again.
  const [held, setHeld] = useState<{ id: string; coin: string } | null>(null);
  const [retryNote, setRetryNote] = useState<string | null>(null);
  const movedRef = useRef(false);
  const cancelled = useRef(false);

  const loadInfo = useCallback(async () => {
    setInfo(await getTurnkeyWalletInfo().catch(() => null));
  }, []);
  const loadAutopilot = useCallback(async () => {
    try {
      const res = await fetch('/api/autopilot/status', { headers: await buildAuthHeaders() });
      const data = await res.json();
      setAutopilot(!!data?.active);
    } catch {
      setAutopilot(false);
    }
  }, []);
  useEffect(() => {
    loadInfo();
    loadAutopilot();
    return () => {
      cancelled.current = true;
    };
  }, [loadInfo, loadAutopilot]);

  const usdcBalance = Number(
    assets.find((a) => a.chain === 'stellar' && a.symbol === 'USDC')?.balance ?? 0
  );
  const wire = toWire(amount);
  const minimum = minimumPurchaseWire();
  const verdict = wire ? purchaseVerdict(wire, null) : null;
  const tooMuch = wire !== null && wireToUsdNumber(wire) > usdcBalance;
  const missing = CRYPTO_INDEX.legs.filter(
    (l) => info && !info[CHAINS[CHAIN_OF[l.symbol]].addressField as keyof TurnkeyWalletInfo]
  );

  // ---- the plan and the summary, from the amount ---------------------------
  const buildPlan = useCallback(
    (totalWire: bigint): FlowPlan => {
      const slices = splitPurchase(totalWire);
      return indexPurchasePlan({
        t,
        amountUsdc: formatCoin(wireToUsdNumber(totalWire), 'USDC'),
        legs: slices.map((s) => {
          const price = markets[s.symbol]?.price;
          const usd = wireToUsdNumber(s.amountWire);
          return {
            symbol: s.symbol,
            amountUsdc: formatCoin(usd, 'USDC'),
            weight: weightLabel(s.weightBps),
            amountOut: price ? `≈ ${formatCoin(usd / price, s.symbol)}` : undefined,
          };
        }),
        stellarWallet: {
          address: info?.stellarAddress,
          href: stellarAccountHref(info?.stellarAddress),
        },
        baseWallet: {
          address: info?.ethereumAddress,
          href: baseAddressHref(info?.ethereumAddress),
        },
      });
    },
    [t, markets, info]
  );

  const buildSummary = useCallback(
    (totalWire: bigint): FlowSummary => ({
      rows: [
        {
          key: 'pay',
          label: t('You pay'),
          value: formatUsd(wireToUsdNumber(totalWire)),
          detail: t('Digital dollars from your Stellar wallet'),
        },
        ...splitPurchase(totalWire).map((s) => {
          const price = markets[s.symbol]?.price;
          const usd = wireToUsdNumber(s.amountWire);
          return {
            key: s.symbol,
            // The coin's logo before its name (Niko 2026-11-09).
            asset: s.symbol,
            label: t('{{coin}} · {{weight}}', {
              coin: assetName(s.symbol),
              weight: weightLabel(s.weightBps),
            }),
            value: formatUsd(usd),
            detail: price ? `≈ ${formatCoin(usd / price, s.symbol)}` : undefined,
          };
        }),
        {
          key: 'fees',
          label: t('Exchange fees'),
          value: t('About 0.75% of each coin'),
          detail: t('Normal 0.5% and LI.FI 0.25%, taken in the exchange'),
        },
        {
          key: 'network',
          label: t('Network fees'),
          value: t('Paid by Normal'),
          detail: t('Except the Stellar fee, paid in XLM by your wallet'),
        },
        { key: 'signatures', label: t('Signatures'), value: t('One') },
        {
          key: 'time',
          label: t('Time'),
          value: t('Usually 10 to 60 minutes'),
          detail: t('Bitcoin is the slowest to arrive'),
        },
      ],
      note: t(
        'Prices move while the coins are bought. Each exchange guarantees a minimum, or that coin’s share comes back to you as digital dollars.'
      ),
    }),
    [t, markets]
  );

  const liveWire = verdict?.ok ? wire : null;
  const livePlan = useMemo(() => (liveWire ? buildPlan(liveWire) : null), [liveWire, buildPlan]);
  const liveSummary = useMemo(
    () => (liveWire ? buildSummary(liveWire) : null),
    [liveWire, buildSummary]
  );
  const liveLede = liveWire
    ? t('{{pay}} split into Bitcoin, Ethereum and Solana.', {
        pay: formatUsd(wireToUsdNumber(liveWire)),
      })
    : '';
  const shownPlan = flowState.phase === 'review' ? livePlan : (flow.plan ?? livePlan);
  const shownSummary =
    flowState.phase === 'review' ? liveSummary : (frozen?.summary ?? liveSummary);

  // ---- opening and leaving the review --------------------------------------
  const openFlow = useCallback(() => {
    setView('flow');
    try {
      window.history.pushState({ nfFlow: true }, '');
    } catch {
      /* the page's own Back still works */
    }
  }, []);
  const phaseRef = useRef(flowState.phase);
  phaseRef.current = flowState.phase;
  const leaveFlow = useCallback(() => {
    flow.reset();
    setFrozen(null);
    setHeld(null);
    setRetryNote(null);
    setView('form');
    movedRef.current = false;
  }, [flow]);
  const exitFlow = useCallback(() => {
    leaveFlow();
    if ((window.history.state as { nfFlow?: boolean } | null)?.nfFlow) window.history.back();
  }, [leaveFlow]);
  useEffect(() => {
    if (view !== 'flow') return undefined;
    const onPop = () => {
      if (phaseRef.current === 'running') {
        window.history.pushState({ nfFlow: true }, '');
        return;
      }
      leaveFlow();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [view, leaveFlow]);

  // ---- the run ---------------------------------------------------------------
  const follow = useCallback(
    async (id: string, burnTxHash?: string) => {
      // Circle: attest, then the mint on Base (each read advances the row).
      flow.start('attest');
      let read: PurchaseRead | null = null;
      for (let misses = 0; ; ) {
        if (cancelled.current) return;

        read = await readPurchase(id);
        misses = read ? 0 : misses + 1;
        // The burn went out but saving its hash failed: without it nothing
        // on the server can follow this purchase (and the hourly expiry would
        // call it unsent), so keep saving it while the page is open.
        if (read && !read.purchase.burnTxHash && burnTxHash) {
          await fetch(`/api/cctp/transfers/${id}`, {
            method: 'PATCH',
            headers: await buildAuthHeaders(),
            credentials: 'include',
            body: JSON.stringify({ burnTxHash }),
          }).catch(() => null);
        }
        if (misses >= 12) {
          flow.handOff(
            t('Lost connection while following this purchase. It carries on on our servers.')
          );
          return;
        }
        const st = read?.purchase.status;
        if (st === 'FAILED') throw new Error(t('Circle could not complete the transfer.'));
        if (st === 'ATTESTED' || st === 'MINT_SUBMITTED') flow.start('mint');
        // Ours (a hash) or a mint someone else ran (COMPLETED, no hash).
        if (read && mintLanded(read.purchase)) break;

        await sleep(5_000);
      }
      const mintHash = read!.purchase.mintTxHash;
      flow.done('mint', mintHash ? { links: [baseTxLink(t, mintHash)] } : {});

      // Base: Autopilot buys each coin. The request runs the legs one after
      // another; reads alongside it mark each one as its swap goes out.
      flow.start('gas');
      // A refusal that no retry fixes ends the wait here, in plain words.
      const refusal: { reason: string | null } = { reason: null };
      const finishing = fetch(`/api/index/purchases/${id}/finish`, {
        method: 'POST',
        headers: await buildAuthHeaders(),
        credentials: 'include',
      })
        .then(async (r) => {
          if (r.status === 400) {
            const body = await r.json().catch(() => null);
            refusal.reason = String(body?.reason ?? 'refused');
          }
        })
        .catch(() => null);
      const legsDone = new Set<string>();
      for (let rounds = 0; rounds < 120; rounds += 1) {
        if (cancelled.current) return;

        read = (await readPurchase(id)) ?? read;
        const legs = read?.legs ?? [];
        const heldLeg = legs.find((l) => l.status === 'HELD');
        if (heldLeg) {
          setHeld({ id, coin: assetName(heldLeg.symbol) });
          throw new Error(
            t(
              'The exchange for {{coin}} kept failing, so its share is safe as digital dollars at your own Base address. You can try it again on another route.',
              { coin: assetName(heldLeg.symbol) }
            )
          );
        }
        if (refusal.reason === 'autopilot-disabled') {
          flow.handOff(
            t(
              'Normal cannot buy the coins right now. Your digital dollars are safe at your own Base address, and Normal buys them as soon as it can.'
            )
          );
          return;
        }
        if (refusal.reason) {
          throw new Error(
            t(
              'This purchase needs a look from our team. Your digital dollars are safe at your own Base address. Contact support.'
            )
          );
        }
        // A coin is bought once its leg is SENT: its hash is written at
        // broadcast, and a swap that reverts has it cleared again.
        for (const leg of legs) {
          if (leg.status === 'SENT' && leg.dstSwapTxHash && !legsDone.has(leg.symbol)) {
            legsDone.add(leg.symbol);
            flow.done(indexBuyStepId(leg.symbol), {
              links: [baseTxLink(t, leg.dstSwapTxHash), lifiTrackLink(t, leg.dstSwapTxHash)],
            });
          }
        }
        const next = legs.find((l) => l.status !== 'SENT');
        if (!next) break;
        flow.start(indexBuyStepId(next.symbol));
        // A leg left waiting (a route that reverted) gets another try.
        if (rounds > 0 && rounds % 10 === 0) {
          await fetch(`/api/index/purchases/${id}/finish`, {
            method: 'POST',
            headers: await buildAuthHeaders(),
            credentials: 'include',
          }).catch(() => null);
        }

        await sleep(3_000);
      }
      await finishing;
      const legs = read?.legs ?? [];
      if (legs.some((l) => l.status !== 'SENT')) {
        flow.handOff(t('Normal keeps buying the rest on its servers. Check Activity in a while.'));
        return;
      }

      // Delivery: each exchange sends its coin to the person's own wallet.
      flow.start('deliver');
      const pending = new Map(legs.map((l) => [l.symbol, l]));
      const arrived: string[] = [];
      let undelivered: Coin | null = null;
      for (let polls = 0; pending.size && !undelivered && polls < 240; polls += 1) {
        if (cancelled.current) return;
        for (const [symbol, leg] of [...pending]) {
          try {
            const q = new URLSearchParams({
              txHash: leg.dstSwapTxHash!,
              fromChain: String(BASE_LIFI_CHAIN_ID),
              toChain: String(LIFI_CHAIN_ID[symbol]),
            });

            const res = await fetch(`/api/lifi/status?${q}`, {
              headers: await buildAuthHeaders(),
            });

            const data = res.ok ? await res.json() : null;
            const progress = readBridgeStatus(data?.status);
            if (progress.phase === 'delivered') {
              pending.delete(symbol);
              arrived.push(assetName(symbol));
              const link = progress.receivingTxHash
                ? [chainTxLink(t, CHAIN_OF[symbol], progress.receivingTxHash)]
                : [];
              flow.update('deliver', {
                note: t('Arrived so far: {{coins}}.', { coins: arrived.join(', ') }),
                links: link,
              });
            } else if (progress.phase === 'refunded' || progress.phase === 'failed') {
              undelivered = symbol;
            }
          } catch {
            // a read that failed: ask again on the next round
          }
        }

        if (pending.size && !undelivered) await sleep(15_000);
      }
      if (undelivered) {
        throw new Error(
          t(
            'The exchange could not deliver {{coin}} and sent its share back as digital dollars to your own Base address. The other coins are not affected.',
            { coin: assetName(undelivered) }
          )
        );
      }
      if (pending.size) {
        flow.handOff(t('The exchanges are still delivering. Your coins arrive on their own.'));
        return;
      }
      flow.done('deliver');
      flow.done('arrived');
      flow.start('balance');
      // The balances re-read in the background; give them a moment, never longer.
      refresh();
      await sleep(4_000);
      flow.finish();
    },
    [flow, t, refresh]
  );

  const handleConfirm = useCallback(async () => {
    if (!liveWire || !livePlan || !liveSummary || busy) return;
    if (!autopilot) {
      setConsentOpen(true);
      return;
    }
    setBusy(true);
    let approved = false;
    try {
      approved = await confirmAction();
    } finally {
      setBusy(false);
    }
    if (!approved) return;

    movedRef.current = false;
    cancelled.current = false;
    setFrozen({ summary: liveSummary, lede: liveLede });
    flow.begin(livePlan);
    // The burn hash on the row is what lets the cron finish this without the
    // page, so it is saved with a few tries.
    let purchaseId: string | null = null;
    const saveBurnHash = async (id: string, burnTxHash: string) => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const patched = await fetch(`/api/cctp/transfers/${id}`, {
          method: 'PATCH',
          headers: await buildAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({ burnTxHash }),
        }).catch(() => null);
        if (patched?.ok) return;

        await sleep(1500 * (attempt + 1));
      }
    };
    try {
      flow.start('record');
      const res = await fetch('/api/index/purchases', {
        method: 'POST',
        headers: { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amountWire: liveWire.toString() }),
      });
      const created = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(created?.error ?? t('This purchase could not be saved.'));
      const id: string = created.purchase.id;
      purchaseId = id;
      const destAddress: string = created.purchase.destAddress;
      // The server takes this from the person's own wallet row; check it
      // here too, before anything is signed, so a wrong row can never send
      // their money to someone else's address.
      if (
        !info?.ethereumAddress ||
        destAddress?.toLowerCase() !== info.ethereumAddress.toLowerCase()
      ) {
        throw new Error(t('This purchase could not be saved.'));
      }

      flow.start('prepare');
      // Which signature is open: the one-time permission, or the transfer.
      let signing: 'approve' | 'burn-sign' = 'burn-sign';
      const { approveTxHash, burnTxHash } = await burnUsdcOnStellar({
        network,
        stellarAddress: info!.stellarAddress!,
        amountWire: liveWire,
        destinationDomain: CCTP_DOMAIN.base,
        mintRecipient: evmAddressToBytes(destAddress),
        onStep: (st) => {
          signing = st === 'approve' ? 'approve' : 'burn-sign';
          flow.start(signing);
        },
        onSigning: () => flow.update(signing, { waiting: true }),
        onSubmitted: (st, hash) => {
          if (st === 'approve') {
            flow.update('approve', {
              waiting: false,
              links: [stellarTxLink(t, hash, t('View the permission'))],
            });
          } else {
            movedRef.current = true;
            flow.start('burn', { links: [stellarTxLink(t, hash)] });
          }
        },
      });
      movedRef.current = true;
      if (approveTxHash && approveTxHash !== 'skipped') {
        flow.done('approve', { note: t('Done. Later purchases skip this.') });
      }
      flow.done('burn', { links: [stellarTxLink(t, burnTxHash)] });
      await saveBurnHash(id, burnTxHash);
      window.dispatchEvent(new Event('nf:activity-updated'));
      await follow(id, burnTxHash);
    } catch (e) {
      // The transfer may be on its way (lib/cctp/stellar-submit.ts): keep its
      // hash so Circle and the cron can finish it, and offer no second
      // purchase until Activity shows what happened.
      const unclearBurn = uncertainBurnHash(e);
      if (unclearBurn && purchaseId) {
        movedRef.current = true;
        await saveBurnHash(purchaseId, unclearBurn);
        window.dispatchEvent(new Event('nf:activity-updated'));
        flow.fail(
          t(
            "We couldn't tell whether this purchase was sent. Check Activity before you buy again, so you don't buy twice."
          )
        );
        return;
      }
      if (purchaseId && !movedRef.current) {
        // Nothing reached Stellar (a declined passkey, a refused send): retire
        // the purchase now, as the swap page does, instead of it reading
        // "pending" in Activity until the hourly expiry. The server only
        // allows this while the row has no transaction hash at all.
        await fetch(`/api/cctp/transfers/${purchaseId}`, {
          method: 'PATCH',
          headers: await buildAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({ markFailed: true }),
        }).catch(() => null);
        window.dispatchEvent(new Event('nf:activity-updated'));
      }
      flow.fail(friendlyAppError(e));
    }
  }, [liveWire, livePlan, liveSummary, liveLede, busy, autopilot, flow, network, info, t, follow]);

  // Put a held coin back in line: the server retries it on another route
  // (api/index/purchases/:id/retry), the page says so and steps aside.
  const retryHeld = useCallback(
    async (h: { id: string; coin: string }) => {
      setHeld(null);
      setRetryNote(t('Trying {{coin}} again on another route…', { coin: h.coin }));
      const res = await fetch(`/api/index/purchases/${h.id}/retry`, {
        method: 'POST',
        headers: await buildAuthHeaders(),
        credentials: 'include',
      }).catch(() => null);
      setRetryNote(
        res?.ok
          ? t('{{coin}} is being bought again. It finishes on its own: follow it in Activity.', {
              coin: h.coin,
            })
          : t('That did not start. Your {{coin}} share is still safe at your own Base address.', {
              coin: h.coin,
            })
      );
    },
    [t]
  );

  const activeId = flowState.activeId ?? '';
  const beforeSent = ['record', 'prepare', 'approve', 'burn-sign'].includes(activeId);

  // ---- the page --------------------------------------------------------------
  const field = { fontSize: 13.5, color: MUTED } as const;
  const canReview = !!liveWire && !tooMuch && !missing.length && !!info?.stellarAddress;

  return (
    // The host inside the page's content, as on Swap and Savings: the review
    // renders into it, so it keeps the page's gutters (Niko 2026-11-09: the
    // review's top lines sat against the sidebar).
    <DashboardContent>
      <FlowHost>
        <ButtonBase
          component={RouterLink}
          href={paths.indexes.root}
          sx={{
            alignSelf: 'flex-start',
            gap: 0.75,
            ml: -1,
            mb: 2,
            px: 1,
            py: 0.5,
            fontSize: 14,
            fontWeight: 500,
            color: 'text.secondary',
            '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
          }}
        >
          <ArrowBackOutlined sx={{ fontSize: 16 }} />
          {t('Indexes')}
        </ButtonBase>
        {/* The index's picture first: the coins it holds, as on its card. */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, md: 2 }, mb: 3 }}>
          <CoinStack symbols={meta.def.legs.map((leg) => leg.symbol)} size={48} />
          <AppPageHeader
            title={meta.name}
            subtitle={t('Bitcoin, Ethereum and Solana in one purchase, with one signature.')}
            sx={{ mb: 0 }}
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 7fr) minmax(0, 5fr)' },
            alignItems: 'start',
            gap: { xs: 4, lg: 3 },
          }}
        >
          <Box sx={{ minWidth: 0, order: { xs: 2, lg: 1 }, display: 'grid', gap: 4 }}>
            {/* The page's one focal point: the basket's day as a line, and its
                weights in each coin's colour (Niko 2026-11-09: "lift it up"). */}
            <AppBlock
              title={t('The last 24 hours')}
              action={
                <Typography sx={{ fontSize: 12.5, color: MUTED }}>
                  {t('Market data from CoinGecko')}
                </Typography>
              }
            >
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25 }}>
                <Typography
                  component="div"
                  sx={{ ...FIGURES, fontSize: { xs: 26, md: 30 }, fontWeight: 500, lineHeight: 1.1 }}
                >
                  {today === null ? null : <Change pct={today} />}
                </Typography>
                <Typography sx={{ fontSize: 13.5, color: MUTED }}>
                  {t('{{name}} today, at its weights', { name: meta.name })}
                </Typography>
              </Box>
              <Box sx={{ mt: 2.5, mb: 3 }}>
                <Sparkline
                  points={daySeries}
                  color={INK}
                  wash={HOVER}
                  height={112}
                  minSpan={minSpanFor('BTC')}
                  label={t('{{name}} over the last 24 hours', { name: meta.name })}
                />
              </Box>
              <WeightBar def={meta.def} height={8} />
            </AppBlock>

            <AppBlock flush title={t('What you buy')}>
              <RowList>
                {CRYPTO_INDEX.legs.map((leg) => {
                  const m = markets[leg.symbol];
                  return (
                    <ListRow
                      key={leg.symbol}
                      icon={
                        <Box
                          component="img"
                          src={assetDisplay(leg.symbol).icon}
                          alt=""
                          sx={{ width: 40, height: 40, borderRadius: '50%', display: 'block' }}
                        />
                      }
                      title={assetName(leg.symbol)}
                      subtitle={t('{{weight}} of every purchase', {
                        weight: weightLabel(leg.weightBps),
                      })}
                      value={m ? formatPrice(m.price) : undefined}
                      detail={<Change pct={m?.change24h ?? null} />}
                      href={paths.assets.details(leg.symbol)}
                    />
                  );
                })}
              </RowList>
            </AppBlock>

            {/* Three numbered steps, drawn like the journey's own steps. */}
            <AppBlock flush title={t('How it works')}>
              <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none', ...ROW_LINES }}>
                {[
                  {
                    title: t('You sign once'),
                    line: t(
                      'On Stellar. Circle moves your digital dollars to your own Base address.'
                    ),
                  },
                  {
                    title: t('Auto-finish buys each coin'),
                    line: t(
                      'At its share. The exchanges send each coin to your own wallet on its network.'
                    ),
                  },
                  {
                    title: t('The coins are yours'),
                    line: t(
                      'In your wallets, like any you buy one by one. Nothing is pooled with anyone else.'
                    ),
                  },
                ].map((item, i) => (
                  <Box
                    component="li"
                    key={item.title}
                    sx={{ display: 'flex', gap: 1.75, px: BOX_PX, py: 2 }}
                  >
                    <Box
                      aria-hidden="true"
                      sx={{
                        ...FIGURES,
                        width: 26,
                        height: 26,
                        flexShrink: 0,
                        borderRadius: '50%',
                        border: `1px solid ${HAIRLINE_STRONG}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12.5,
                        fontWeight: 500,
                        color: INK,
                      }}
                    >
                      {i + 1}
                    </Box>
                    <Box sx={{ minWidth: 0, pt: '2px' }}>
                      <Typography sx={{ fontSize: 15, fontWeight: 500, color: INK }}>
                        {item.title}
                      </Typography>
                      <Typography sx={{ mt: 0.5, fontSize: 14, lineHeight: '21px', color: MUTED }}>
                        {item.line}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </AppBlock>
          </Box>

          <Box sx={{ minWidth: 0, order: { xs: 1, lg: 2 } }}>
            <AppBlock title={t('Buy')}>
              <Box sx={{ bgcolor: CANVAS, px: 2, py: 1.75 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    // On a narrow phone the balance and MAX take their own line
                    // rather than squeezing both labels onto two lines each.
                    flexWrap: 'wrap',
                    columnGap: 1,
                    rowGap: 0.5,
                  }}
                >
                  <Typography sx={{ fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>
                    {t('Amount in digital dollars')}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                    <Typography sx={{ ...FIGURES, fontSize: 12, color: FAINT, whiteSpace: 'nowrap' }}>
                      {t('In your wallet: {{amount}}', { amount: formatUsd(usdcBalance) })}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setAmount(String(Math.floor(usdcBalance * 100) / 100))}
                      sx={{ minWidth: 0, height: 26, px: 1, fontSize: 11, fontWeight: 500 }}
                    >
                      MAX
                    </Button>
                  </Box>
                </Box>
                <InputBase
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="0.00"
                  inputProps={{
                    inputMode: 'decimal',
                    'aria-label': t('Amount in digital dollars'),
                  }}
                  sx={{
                    mt: 1,
                    width: '100%',
                    '& input': {
                      ...FIGURES,
                      fontSize: 26,
                      fontWeight: 500,
                      color: INK,
                      textAlign: 'right',
                      p: 0,
                    },
                  }}
                />
              </Box>

              {/* What each coin gets: always the three coins with their logos,
                  the dollars and the coin they buy once the amount works. */}
              <Box sx={{ mt: 1, ...ROW_LINES }}>
                {meta.def.legs.map((leg) => {
                  const slice = verdict?.ok
                    ? verdict.slices.find((s) => s.symbol === leg.symbol)
                    : undefined;
                  const usd = slice ? wireToUsdNumber(slice.amountWire) : null;
                  const price = markets[leg.symbol]?.price;
                  return (
                    <Box
                      key={leg.symbol}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 1.25 }}
                    >
                      <Box
                        component="img"
                        src={assetDisplay(leg.symbol).icon}
                        alt=""
                        sx={{ width: 24, height: 24, borderRadius: '50%', display: 'block' }}
                      />
                      <Typography sx={{ ...field, flex: 1, minWidth: 0 }}>
                        <Box component="span" sx={{ color: INK, fontWeight: 500 }}>
                          {assetName(leg.symbol)}
                        </Box>{' '}
                        <Box component="span" sx={FIGURES}>
                          {weightLabel(leg.weightBps)}
                        </Box>
                      </Typography>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography
                          sx={{
                            ...FIGURES,
                            fontSize: 13.5,
                            fontWeight: 500,
                            color: usd === null ? FAINT : INK,
                          }}
                        >
                          {formatUsd(usd ?? 0)}
                        </Typography>
                        {usd !== null && !!price && (
                          <Typography sx={{ ...FIGURES, fontSize: 12, color: MUTED }}>
                            ≈ {formatCoin(usd / price, leg.symbol)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>

              {wire !== null && verdict && !verdict.ok && (
                <Typography sx={{ mt: 1.5, fontSize: 12.5, color: '#B91C1C' }}>
                  {t(
                    'The smallest purchase is {{min}}, so every coin’s share is worth its exchange.',
                    {
                      min: formatUsd(wireToUsdNumber(minimum)),
                    }
                  )}
                </Typography>
              )}
              {tooMuch && (
                <Typography sx={{ mt: 1.5, fontSize: 12.5, color: '#B91C1C' }}>
                  {t('That is more than you have.')}
                </Typography>
              )}

              {missing.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography sx={{ ...field, mb: 1 }}>
                    {t('First add these to your wallet, one passkey confirmation each:')}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {missing.map((l) => (
                      <Button
                        key={l.symbol}
                        variant="outlined"
                        onClick={() => setSetupChain(CHAIN_OF[l.symbol] as TurnkeyChain)}
                      >
                        {t('Add {{coin}}', { coin: assetName(l.symbol) })}
                      </Button>
                    ))}
                  </Box>
                </Box>
              )}

              <Button
                fullWidth
                disabled={!canReview}
                onClick={openFlow}
                sx={{
                  ...INK_BUTTON_SX,
                  mt: 2,
                  height: 48,
                  fontSize: 15,
                  fontWeight: 500,
                  '&.Mui-disabled': { bgcolor: 'rgba(10,10,15,0.08)', color: FAINT },
                }}
              >
                {t('Review purchase')}
              </Button>
              <Typography sx={{ mt: 1.5, fontSize: 12.5, lineHeight: 1.5, color: MUTED }}>
                {autopilot === false
                  ? t(
                      'One signature needs auto-finish: you can turn it on at the review. Minimum {{min}}.',
                      { min: formatUsd(wireToUsdNumber(minimum)) }
                    )
                  : t(
                      'You see every step and each coin’s share before you confirm. Minimum {{min}}.',
                      { min: formatUsd(wireToUsdNumber(minimum)) }
                    )}
              </Typography>
            </AppBlock>
          </Box>
        </Box>

        {view === 'flow' && shownPlan && shownSummary && (
          <FlowPortal>
            <FlowView
              plan={shownPlan}
              run={flowState}
              summary={shownSummary}
              titles={{
                review: t('Review your purchase'),
                running: t('Buying'),
                done: t('Purchase complete'),
                failed: t('Purchase stopped'),
                stopped: t('Purchase ended'),
                'handed-off': t('On its way'),
              }}
              lede={flowState.phase === 'review' ? liveLede : (frozen?.lede ?? liveLede)}
              confirm={{
                label: autopilot ? t('Confirm purchase') : t('Turn on auto-finish'),
                onClick: handleConfirm,
                blocked: tooMuch
                  ? t('That is more than you have. Go back and change the amount.')
                  : null,
                busy,
              }}
              back={{ label: t('Back to {{name}}', { name: meta.name }), onClick: exitFlow }}
              doneActions={[
                { label: t('Make another purchase'), primary: true, onClick: exitFlow },
                { label: t('See it in Activity'), href: paths.activity },
              ]}
              doneNote={t('Your Bitcoin, Ethereum and Solana are in your wallets.')}
              notice={retryNote ? <FlowNotice>{retryNote}</FlowNotice> : undefined}
              failActions={
                held
                  ? [
                      {
                        label: t('Try {{coin}} again', { coin: held.coin }),
                        primary: true,
                        onClick: () => retryHeld(held),
                      },
                      { label: t('See it in Activity'), href: paths.activity },
                    ]
                  : movedRef.current
                    ? [{ label: t('See it in Activity'), href: paths.activity }]
                    : [
                        {
                          label: t('Try again'),
                          primary: true,
                          onClick: () => {
                            flow.reset();
                            setFrozen(null);
                          },
                        },
                      ]
              }
              leave={
                beforeSent
                  ? {
                      safe: false,
                      message: t('Stay a few seconds until it is sent, so no prompt is left open.'),
                    }
                  : {
                      safe: true,
                      message: t('Normal finishes this on its servers, with or without this page.'),
                    }
              }
            />
          </FlowPortal>
        )}

        <AutopilotConsentDialog
          open={consentOpen}
          onChoose={(enabled) => {
            setConsentOpen(false);
            if (enabled) loadAutopilot();
          }}
        />
        {user && setupChain && (
          <ChainSetupDialog
            open
            onClose={() => setSetupChain(null)}
            chain={setupChain}
            userId={user.id}
            userEmail={user.email}
            onSuccess={async () => {
              setSetupChain(null);
              await loadInfo();
            }}
          />
        )}
      </FlowHost>
    </DashboardContent>
  );
}
