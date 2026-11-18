import type { IndexPlanLeg } from '@/lib/flow/plans';
import type { BridgePhase } from '@/lib/flow/lifi-status';
import type { RunState, FlowPlan, Translate } from '@/lib/flow/types';

import { assetName } from '@/lib/portfolio/asset-names';
import { mintLanded, heldSymbolOf } from '@/lib/index/legs';
import { indexBuyStepId, indexPurchasePlan } from '@/lib/flow/plans';
import {
  stopRun,
  failRun,
  stepsOf,
  beginRun,
  statusOf,
  finishRun,
  startStep,
  updateStep,
  completeStep,
} from '@/lib/flow/run';

import {
  baseTxLink,
  chainTxLink,
  lifiTrackLink,
  stellarTxLink,
} from '@/components/_common/flow/flow-links';

// ---------------------------------------------------------------------------
// An index purchase no longer on the page that started it, as the journey that
// page showed (Niko 2026-11-10: "there should be some pending screen for
// indexes as well when users leave the purchase screen"). Built from the saved
// purchase and its coins: each hash it holds is a step that happened, with its
// link; each coin's delivery comes from LI.FI's status of its exchange, and
// Bitcoin counts as arrived once its network has confirmed it (a payment still
// confirming is not yet in the wallet's balance). Pure, so it is tested.
// ---------------------------------------------------------------------------

export interface PurchaseLegRead {
  symbol: string;
  weightBps: number;
  amountWire: string;
  status: string;
  dstSwapTxHash: string | null;
  dstAmount: string | null;
}

export interface PurchaseRead {
  purchase: {
    id: string;
    status: string;
    amountWire: string;
    burnTxHash: string | null;
    mintTxHash: string | null;
    errorDetail: string | null;
    createdAt: string;
    updatedAt: string;
  };
  legs: PurchaseLegRead[];
  /** Which index it bought (quoteJson.index). */
  indexId?: string | null;
}

/**
 * Where each coin's exchange stands (lib/flow/lifi-status.ts), plus
 * 'confirming': the exchange sent it and the coin's network has not confirmed
 * it yet. Missing when not asked yet.
 */
export type CoinDelivery = {
  phase: BridgePhase | 'confirming';
  /** The coin's own payment into the person's wallet, when LI.FI knows it. */
  receivingTxHash: string | null;
};
export type Deliveries = Record<string, CoinDelivery | undefined>;

/** Where it stands, and so who it waits on. */
export type PurchaseStanding = 'on-its-way' | 'needs-you' | 'done' | 'ended' | 'failed';

export interface PurchaseStatus {
  standing: PurchaseStanding;
  /** How far it got, for the words about it. */
  stage: 'circle' | 'buying' | 'delivering' | null;
  /** A coin whose exchange kept failing: its share waits at Base for the person. */
  heldCoin: string | null;
  /** A coin its exchange could not deliver and sent back to Base. */
  lostCoin: string | null;
  /** The coins already in the wallets. */
  arrived: string[];
}

/** It ended before it moved anything ('not-sent'), or it could not be finished. */
export function purchaseOutcome(purchase: {
  status: string;
  errorDetail: string | null;
}): 'not-sent' | 'failed' | null {
  if (purchase.status !== 'FAILED' && purchase.status !== 'REFUNDED') return null;
  const detail = (purchase.errorDetail ?? '').trim();
  return /never left your wallet/i.test(detail) ||
    /^Expired: no transaction was ever sent/i.test(detail) ||
    /^Cancelled before any transaction was sent/i.test(detail)
    ? 'not-sent'
    : 'failed';
}

/** Where a purchase stands, from its row, its coins and their deliveries. */
export function purchaseStatus(read: PurchaseRead, deliveries: Deliveries = {}): PurchaseStatus {
  const { purchase, legs } = read;
  const arrived = legs
    .filter((l) => deliveries[l.symbol]?.phase === 'delivered')
    .map((l) => l.symbol);
  const none = { heldCoin: null, lostCoin: null, arrived };
  const outcome = purchaseOutcome(purchase);
  if (outcome === 'not-sent') return { ...none, standing: 'ended', stage: null };
  if (outcome === 'failed') return { ...none, standing: 'failed', stage: null };

  const heldCoin =
    heldSymbolOf(purchase.errorDetail) ?? legs.find((l) => l.status === 'HELD')?.symbol ?? null;
  if (heldCoin) return { ...none, heldCoin, standing: 'needs-you', stage: 'buying' };

  const out = legs.filter((l) => l.status === 'SENT' && !!l.dstSwapTxHash);
  if (legs.length && out.length === legs.length) {
    const lostCoin =
      legs.find((l) => ['refunded', 'failed'].includes(deliveries[l.symbol]?.phase ?? ''))
        ?.symbol ?? null;
    if (lostCoin) return { ...none, lostCoin, standing: 'failed', stage: 'delivering' };
    return {
      ...none,
      standing: arrived.length === legs.length ? 'done' : 'on-its-way',
      stage: 'delivering',
    };
  }
  return { ...none, standing: 'on-its-way', stage: mintLanded(purchase) ? 'buying' : 'circle' };
}

const CHAIN_OF: Record<string, 'bitcoin' | 'ethereum' | 'solana'> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
};

const ATTESTED = new Set(['ATTESTED', 'MINT_SUBMITTED', 'COMPLETED']);

export interface PurchaseJourney extends PurchaseStatus {
  plan: FlowPlan;
  run: RunState;
}

export function purchaseJourney(
  t: Translate,
  read: PurchaseRead,
  words: { amountUsdc: string; legs: IndexPlanLeg[] },
  deliveries: Deliveries = {}
): PurchaseJourney {
  const { purchase, legs } = read;
  const status = purchaseStatus(read, deliveries);
  const plan = indexPurchasePlan({ t, amountUsdc: words.amountUsdc, legs: words.legs });
  const start = Date.parse(purchase.createdAt) || 0;
  const last = Date.parse(purchase.updatedAt) || start;
  let run = beginRun(start);
  // Done straight from the row: no start time, so no made-up duration shows.
  const done = (id: string, links?: ReturnType<typeof baseTxLink>[]) => {
    run = completeStep(run, plan, id, last, links ? { links } : {});
  };

  if (status.standing === 'ended') {
    // Nothing left the wallet: it stopped before the transfer went out. The
    // server's own words for a transfer that never landed are already plain.
    const detail = (purchase.errorDetail ?? '').trim();
    const text = /never left your wallet/i.test(detail)
      ? detail
      : t('This purchase was never sent, so nothing moved. You can start a new one.');
    run = startStep(run, plan, purchase.burnTxHash ? 'attest' : 'burn-sign', last);
    return { ...status, plan, run: stopRun(run, plan, text, last) };
  }

  if (purchase.burnTxHash) done('burn', [stellarTxLink(t, purchase.burnTxHash)]);
  if (ATTESTED.has(purchase.status) || !!purchase.mintTxHash) done('attest');
  if (mintLanded(purchase)) {
    done('mint', purchase.mintTxHash ? [baseTxLink(t, purchase.mintTxHash)] : undefined);
  }
  const out = legs.filter((l) => l.status === 'SENT' && !!l.dstSwapTxHash);
  if (out.length || legs.some((l) => l.status === 'SWAPPING')) done('gas');
  for (const leg of out) {
    done(indexBuyStepId(leg.symbol), [
      baseTxLink(t, leg.dstSwapTxHash!),
      lifiTrackLink(t, leg.dstSwapTxHash!),
    ]);
  }

  if (status.standing === 'failed' && !status.lostCoin) {
    const text = t(
      'This purchase could not be finished. Your digital dollars are safe: contact support and we will sort it out with you.'
    );
    return { ...status, plan, run: failRun(run, plan, text, last) };
  }

  // Paused for the person ("Try again" on a held coin): no step turns
  // (DESIGN.md). The held coin's purchase stopped where its share is, at the
  // person's Base address, calmly and saying so; that is where the page then
  // says the money waits.
  if (status.standing === 'needs-you' && status.heldCoin) {
    const held = indexBuyStepId(status.heldCoin);
    run = {
      ...run,
      steps: {
        ...run.steps,
        [held]: {
          ...run.steps[held],
          status: 'stopped',
          note: t('Its share is safe as digital dollars at your own Base address.'),
        },
      },
    };
    return { ...status, plan, run };
  }

  if (status.stage === 'delivering') {
    const links = legs.flatMap((l) => {
      const hash = deliveries[l.symbol]?.receivingTxHash;
      return hash && CHAIN_OF[l.symbol] ? [chainTxLink(t, CHAIN_OF[l.symbol], hash)] : [];
    });
    if (status.lostCoin) {
      run = startStep(run, plan, 'deliver', last);
      const text = t(
        'The exchange could not deliver {{coin}} and sent its share back as digital dollars to your own Base address. The other coins are not affected.',
        { coin: assetName(status.lostCoin) }
      );
      return { ...status, plan, run: failRun(run, plan, text, last) };
    }
    if (status.standing === 'done') {
      done('deliver', links.length ? links : undefined);
      done('arrived');
      done('balance');
      return { ...status, plan, run: finishRun(run, plan, last) };
    }
    run = startStep(run, plan, 'deliver', last);
    if (status.arrived.length) {
      run = updateStep(run, 'deliver', {
        note: t('Arrived so far: {{coins}}.', { coins: status.arrived.map(assetName).join(', ') }),
        links,
      });
    }
    return { ...status, plan, run };
  }

  // Still going: the first step the row has not reached is where it is now.
  const next = stepsOf(plan).find((s) => statusOf(run, s.id) === 'upcoming');
  if (next) run = startStep(run, plan, next.id, last);
  return { ...status, plan, run };
}
