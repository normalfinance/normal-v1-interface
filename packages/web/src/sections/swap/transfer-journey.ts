import type { TransferEnding } from '@/lib/cctp/transfer-ending';
import type { RunState, FlowPlan, Translate } from '@/lib/flow/types';

import { transferEnding } from '@/lib/cctp/transfer-ending';
import {
  REFUND_STEP,
  refundedPlan,
  cctpRefundPlan,
  cctpInboundPlan,
  cctpOutboundPlan,
} from '@/lib/flow/plans';
import {
  stopRun,
  failRun,
  stepsOf,
  beginRun,
  statusOf,
  finishRun,
  startStep,
  completeStep,
} from '@/lib/flow/run';

import { baseTxLink, chainTxLink, lifiTrackLink, stellarTxLink } from '@/components/_common/flow/flow-links';

import { bannerPhase } from './cctp-phase';

// ---------------------------------------------------------------------------
// A Circle swap that is no longer on the page that started it, as the same
// journey that page showed (Niko 2026-11-09: a swap you closed out opens a
// page with all its steps). Built from the transfer's saved row: each hash the
// row holds is a step that happened, with its link; the first step it does not
// hold is where the money is now; and how it ended (transferEnding) decides
// the ending, a refund rewriting the rest of the journey as it does live.
// Pure, so it is tested.
// ---------------------------------------------------------------------------

export interface TransferRowForJourney {
  direction: string;
  status: string;
  srcAsset: string;
  dstAsset: string;
  srcSwapTxHash: string | null;
  burnTxHash: string | null;
  eventNonce: string | null;
  mintTxHash: string | null;
  dstSwapTxHash: string | null;
  errorDetail: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TransferKind = 'in' | 'out' | 'back';

/** In from a coin, out to a coin, or digital dollars brought back to Stellar. */
export const transferKind = (row: { direction: string; srcAsset: string; dstAsset: string }) =>
  row.direction === 'stellar_to_crosschain'
    ? 'out'
    : row.srcAsset === 'USDC' && row.dstAsset === 'USDC'
      ? 'back'
      : 'in';

/** Where it stands when the page is not following it live. */
export type JourneyStanding = 'done' | 'needs-you' | 'on-its-way' | 'ended' | 'failed';

export interface TransferJourney {
  kind: TransferKind;
  plan: FlowPlan;
  run: RunState;
  standing: JourneyStanding;
  ending: TransferEnding | null;
}

const CHAIN_OF: Record<string, 'bitcoin' | 'ethereum' | 'solana'> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
};

export function transferJourney(
  t: Translate,
  row: TransferRowForJourney,
  words: {
    /** "1.1292 SOL" */
    amountIn: string;
    /** "≈ 97.12 USDC" */
    usdcOut: string;
    /** "25 USDC" */
    amountUsdc: string;
    /** "≈ 0.00029 BTC", or the coin alone when unknown */
    amountOut: string;
    /** The exchange, by name: "Mayan" */
    tool: string;
    autopilot: boolean;
    /** The digital dollars were seen at the person's Base address (a halted swap in). */
    onBase?: boolean;
  }
): TransferJourney {
  const kind = transferKind(row);
  const ending = transferEnding(t, row);
  let plan =
    kind === 'out'
      ? cctpOutboundPlan({
          t,
          to: row.dstAsset,
          amountUsdc: words.amountUsdc,
          amountOut: words.amountOut,
          tool: words.tool,
          autopilot: words.autopilot,
        } as Parameters<typeof cctpOutboundPlan>[0])
      : kind === 'back'
        ? cctpRefundPlan({ t, amountUsdc: words.amountUsdc })
        : cctpInboundPlan({
            t,
            from: row.srcAsset,
            amountIn: words.amountIn,
            usdcOut: words.usdcOut,
            tool: words.tool,
            autopilot: words.autopilot,
          } as Parameters<typeof cctpInboundPlan>[0]);

  const start = Date.parse(row.createdAt) || 0;
  const last = Date.parse(row.updatedAt) || start;
  let run = beginRun(start);
  // Done straight from the row: no start time, so no made-up duration shows.
  const done = (id: string, links?: ReturnType<typeof lifiTrackLink>[]) => {
    run = completeStep(run, plan, id, last, links ? { links } : {});
  };
  const attested = !!row.eventNonce || !!row.mintTxHash || row.status === 'COMPLETED';
  const minted = !!row.mintTxHash || row.status === 'COMPLETED';

  if (kind === 'in') {
    const srcLinks = row.srcSwapTxHash
      ? [chainTxLink(t, CHAIN_OF[row.srcAsset] ?? 'ethereum', row.srcSwapTxHash), lifiTrackLink(t, row.srcSwapTxHash)]
      : undefined;
    if (ending?.kind === 'sent-back') {
      // The exchange returned the coin: the journey goes back where it came
      // from, as the live page rewrites it (refundedPlan).
      plan = refundedPlan(plan, { t, fromStepId: 'bridge-send', tool: words.tool, coin: row.srcAsset });
      done('send', srcLinks);
      done(REFUND_STEP.arrived);
      return { kind, plan, run: stopRun(run, plan, ending.text, last), standing: 'ended', ending };
    }
    if (ending?.kind === 'not-sent') {
      run = startStep(run, plan, 'send', last);
      return { kind, plan, run: stopRun(run, plan, ending.text, last), standing: 'ended', ending };
    }
    if (row.srcSwapTxHash) done('send', srcLinks);
    // Seen at the Base address: the exchange's part is over.
    if (row.srcSwapTxHash && words.onBase && !row.burnTxHash) done('arrived-base');
    if (row.burnTxHash) {
      done('arrived-base');
      done('burn', [baseTxLink(t, row.burnTxHash)]);
    }
  } else if (kind === 'out') {
    if (row.burnTxHash) done('burn', [stellarTxLink(t, row.burnTxHash)]);
  } else if (row.burnTxHash) {
    done('refund-burn', [baseTxLink(t, row.burnTxHash)]);
  }

  if (attested) done(kind === 'back' ? 'refund-attest' : 'attest');
  if (minted && row.mintTxHash) {
    done(
      kind === 'back' ? 'refund-mint' : 'mint',
      [kind === 'out' ? baseTxLink(t, row.mintTxHash) : stellarTxLink(t, row.mintTxHash)]
    );
  } else if (minted) {
    done(kind === 'back' ? 'refund-mint' : 'mint');
  }
  if (kind === 'out' && row.dstSwapTxHash) done('pivot-send', [lifiTrackLink(t, row.dstSwapTxHash)]);

  if (ending?.kind === 'failed') {
    return { kind, plan, run: failRun(run, plan, ending.text, last), standing: 'failed', ending };
  }
  if (ending) {
    // Brought back as digital dollars, or never sent: calm, nothing lost.
    const next = stepsOf(plan).find((s) => statusOf(run, s.id) === 'upcoming');
    if (next) run = startStep(run, plan, next.id, last);
    return { kind, plan, run: stopRun(run, plan, ending.text, last), standing: 'ended', ending };
  }

  const complete =
    row.status === 'COMPLETED' && (kind !== 'out' || !!row.dstSwapTxHash);
  if (complete) return { kind, plan, run: finishRun(run, plan, last), standing: 'done', ending };

  // Still going: the first step the row has not reached is where it is now.
  // The page hands it off with its own words (handOffRun), which depend on
  // what it has seen at the Base address.
  const phase = bannerPhase(row);
  const needsYou = phase === 'halt-receive' || phase === 'halt-finish';
  // Waiting on the person is not running: the step shows "Waiting for you"
  // in yellow, never a turning ring (DESIGN.md: only what is happening turns).
  const next = stepsOf(plan).find((s) => statusOf(run, s.id) === 'upcoming');
  if (next) run = startStep(run, plan, next.id, last, needsYou ? { waiting: true } : {});
  return { kind, plan, run, standing: needsYou ? 'needs-you' : 'on-its-way', ending };
}
