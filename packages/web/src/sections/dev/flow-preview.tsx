'use client';

import type { RunState, FlowPlan, RunPhase, FlowSummary, FlowStepDef } from '@/lib/flow/types';

import { useTranslate } from '@/locales';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { DashboardContent } from '@/layouts/dashboard';
import { INK, MUTED, HAIRLINE_STRONG } from '@/theme/brand-colors';
import {
  stopRun,
  failRun,
  stepsOf,
  placesOf,
  beginRun,
  skipStep,
  finishRun,
  startStep,
  handOffRun,
  initialRun,
  completeStep,
} from '@/lib/flow/run';
import {
  REFUND_STEP,
  depositPlan,
  refundedPlan,
  withdrawPlan,
  cctpRefundPlan,
  stellarSwapPlan,
  cctpInboundPlan,
  cctpOutboundPlan,
  indexPurchasePlan,
  crossChainSwapPlan,
} from '@/lib/flow/plans';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';

import { FlowView, FlowNotice } from '@/components/_common/flow';

// ---------------------------------------------------------------------------
// Development only (the route 404s in production builds): the review page and
// its journey with sample data, at any step, so every state can be looked at
// without a wallet or a signature.
//
//   /app/dev/flow?s=usdc-btc&mode=running&at=attest
//   s     deposit | withdraw | xlm-usdc | btc-eth | usdc-btc | btc-usdc | refund
//   mode  review | running | done | failed | stopped | handed-off
//   at    a step id (running, failed, stopped)
//   wait  1: the step at `at` waits on a signature
//   play  1: walk through every step, one every 1.6 seconds
//   bar   0: hide this page's own scenario links (for screenshots)
// ---------------------------------------------------------------------------

const G = 'GB2YWVAJQ6IY3PSV6ZL44KZ2GVQDWYIPJVDP4MTFPB7FQWIE3WJ7CTJF';
const BTC = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
const ETH = '0x8ba1f109551bD432803012645Ac136ddd64DBA72';
const HASH = 'a3f1c9e07b5d2e8146f0c2a9d7e3b5f81c4a6e2d9b07f3c5e1a8d6b4f2c09e7d';

type Scenario =
  | 'deposit'
  | 'withdraw'
  | 'xlm-usdc'
  | 'btc-eth'
  | 'usdc-btc'
  | 'btc-usdc'
  | 'refund'
  | 'index';

interface Sample {
  plan: FlowPlan;
  summary: FlowSummary;
  lede: string;
  titles: Record<RunPhase, string>;
  doneNote: string;
}

const swapTitles = (t: (k: string) => string): Record<RunPhase, string> => ({
  review: t('Review your swap'),
  running: t('Swapping'),
  done: t('Swap complete'),
  failed: t('Swap stopped'),
  stopped: t('Swap ended'),
  'handed-off': t('On its way back'),
});

function sample(t: (k: string, o?: Record<string, unknown>) => string, s: Scenario): Sample {
  const rows = (pairs: [string, string, string?][]): FlowSummary => ({
    rows: pairs.map(([label, value, detail], i) => ({ key: String(i), label, value, detail })),
  });
  switch (s) {
    case 'deposit':
      return {
        plan: depositPlan({
          t,
          amount: '100 USDC',
          fee: '0.5 USDC',
          net: '99.5 USDC',
          wallet: { address: G },
          rate: '6.42% a year',
        }),
        summary: rows([
          ['You deposit', '100 USDC', '$100.00'],
          ['Normal fee (0.5%)', '0.5 USDC'],
          ['Goes into savings', '99.5 USDC'],
          ['Earns', '6.42% a year', 'About $6.39 a year at today’s rate'],
        ]),
        lede: '100 USDC into Normal Savings, earning 6.42% a year.',
        titles: {
          review: t('Review your deposit'),
          running: t('Depositing'),
          done: t('Deposit complete'),
          failed: t('Deposit stopped'),
          stopped: t('Deposit ended'),
          'handed-off': t('Deposit on its way'),
        },
        doneNote: t('Your digital dollars are in Normal Savings, earning from today.'),
      };
    case 'withdraw':
      return {
        plan: withdrawPlan({
          t,
          amount: '100 USDC',
          commission: '0.4144 USDC',
          net: '99.5856 USDC',
          wallet: { address: G },
        }),
        summary: rows([
          ['You withdraw', '100 USDC', '$100.00'],
          ['Commission on earnings', '0.4144 USDC', '20% of the earnings in this withdrawal'],
          ['You receive', '99.5856 USDC'],
        ]),
        lede: '100 USDC from Normal Savings to your wallet.',
        titles: {
          review: t('Review your withdrawal'),
          running: t('Withdrawing'),
          done: t('Withdrawal complete'),
          failed: t('Withdrawal stopped'),
          stopped: t('Withdrawal ended'),
          'handed-off': t('Withdrawal on its way'),
        },
        doneNote: t('Your digital dollars are in your wallet.'),
      };
    case 'xlm-usdc':
      return {
        plan: stellarSwapPlan({
          t,
          from: 'XLM',
          to: 'USDC',
          amountIn: '10 XLM',
          amountOut: '≈ 2.985 USDC',
          minOut: '2.9552 USDC',
          fee: '0.05 XLM',
          embedded: false,
          wallet: { address: G },
        }),
        summary: rows([
          ['You pay', '10 XLM', '$3.00'],
          ['You receive', '≈ 2.985 USDC'],
          ['At least', '2.9552 USDC', 'Or the swap does not happen'],
        ]),
        lede: '10 XLM for about 2.985 USDC, on Stellar.',
        titles: swapTitles(t),
        doneNote: 'Your USDC is in your wallet.',
      };
    case 'btc-eth':
      return {
        plan: crossChainSwapPlan({
          t,
          from: 'BTC',
          to: 'ETH',
          amountIn: '0.005 BTC',
          amountOut: '≈ 0.170571 ETH',
          tool: 'Chainflip',
          fromWallet: { address: BTC },
          toWallet: { address: ETH },
          etaMinutes: 25,
        }),
        summary: rows([
          ['You pay', '0.005 BTC', '$436.68'],
          ['You receive', '≈ 0.170571 ETH'],
          ['Exchange', 'Chainflip', 'Picked by LI.FI'],
        ]),
        lede: '0.005 BTC for about 0.170571 ETH, through Chainflip.',
        titles: swapTitles(t),
        doneNote: 'Your ETH is in your Ethereum wallet.',
      };
    case 'usdc-btc':
      return {
        plan: cctpOutboundPlan({
          t,
          to: 'BTC',
          amountUsdc: '25 USDC',
          amountOut: '≈ 0.000284 BTC',
          tool: 'Chainflip',
          stellarWallet: { address: G },
          baseWallet: { address: ETH },
          destWallet: { address: BTC },
          autopilot: false,
        }),
        summary: rows([
          ['You pay', '25 USDC', '$25.00'],
          ['You receive', '≈ 0.000284 BTC'],
          ['Circle bridge', 'Free', 'Normal pays its network fees'],
        ]),
        lede: '25 USDC for about 0.000284 BTC, over Circle and Chainflip.',
        titles: swapTitles(t),
        doneNote: 'Your BTC is in your Bitcoin wallet.',
      };
    case 'index':
      return {
        plan: indexPurchasePlan({
          t,
          amountUsdc: '100 USDC',
          legs: [
            { symbol: 'BTC', amountUsdc: '60 USDC', weight: '60%', amountOut: '≈ 0.000681 BTC' },
            { symbol: 'ETH', amountUsdc: '25 USDC', weight: '25%', amountOut: '≈ 0.00982 ETH' },
            { symbol: 'SOL', amountUsdc: '15 USDC', weight: '15%', amountOut: '≈ 0.1 SOL' },
          ],
          stellarWallet: { address: G },
          baseWallet: { address: ETH },
        }),
        summary: rows([
          ['You pay', '$100.00', 'Digital dollars from your Stellar wallet'],
          ['Bitcoin (60%)', '$60.00', '≈ 0.000681 BTC'],
          ['Ethereum (25%)', '$25.00', '≈ 0.00982 ETH'],
          ['Solana (15%)', '$15.00', '≈ 0.1 SOL'],
          [
            'Exchange fees',
            'About 0.75% of each coin',
            'Normal 0.5% and LI.FI 0.25%, taken in the exchange',
          ],
          ['Network fees', 'Paid by Normal', 'Except the Stellar fee, paid in XLM by your wallet'],
          ['Signatures', 'One'],
          ['Time', 'Usually 10 to 60 minutes', 'Bitcoin is the slowest to arrive'],
        ]),
        lede: '$100.00 split into Bitcoin, Ethereum and Solana.',
        titles: {
          review: t('Review your purchase'),
          running: t('Buying'),
          done: t('Purchase complete'),
          failed: t('Purchase stopped'),
          stopped: t('Purchase ended'),
          'handed-off': t('On its way'),
        },
        doneNote: 'Your Bitcoin, Ethereum and Solana are in your wallets.',
      };
    case 'btc-usdc':
      return {
        plan: cctpInboundPlan({
          t,
          from: 'BTC',
          amountIn: '0.002 BTC',
          usdcOut: '≈ 173.3632 USDC',
          tool: 'Chainflip',
          srcWallet: { address: BTC },
          baseWallet: { address: ETH },
          stellarWallet: { address: G },
          autopilot: true,
        }),
        summary: rows([
          ['You pay', '0.002 BTC', '$174.67'],
          ['You receive', '≈ 173.3632 USDC', 'In your Stellar wallet'],
          ['Signatures', 'One', 'On Bitcoin only. Auto-finish signs on Base.'],
        ]),
        lede: '0.002 BTC for about 173.3632 USDC in your Stellar wallet, over Chainflip and Circle.',
        titles: swapTitles(t),
        doneNote: t('Your digital dollars are in your Stellar wallet.'),
      };
    case 'refund':
    default:
      return {
        plan: cctpRefundPlan({
          t,
          amountUsdc: '25 USDC',
          baseWallet: { address: ETH },
          stellarWallet: { address: G },
        }),
        summary: rows([
          ['Coming back', '25 USDC'],
          ['To', 'Your Stellar wallet'],
        ]),
        lede: '25 USDC back to your Stellar wallet.',
        titles: swapTitles(t),
        doneNote: '',
      };
  }
}

// What a finished step shows: its record on the network.
function finishedPatch(step: FlowStepDef) {
  const stellar = {
    label: 'View on stellar.expert',
    href: `https://stellar.expert/explorer/public/tx/${HASH}`,
  };
  const base = { label: 'View on basescan.org', href: `https://basescan.org/tx/0x${HASH}` };
  switch (step.id) {
    case 'submit':
    case 'burn':
      return { links: [step.actor === 'Base network' ? base : stellar] };
    case 'confirmed':
      return { note: 'In ledger 51,234,567 at 14:32:05' };
    case 'send':
      return {
        links: [{ label: 'View on mempool.space', href: `https://mempool.space/tx/${HASH}` }],
      };
    case 'mint':
    case 'pivot-send':
    case 'refund-burn':
      return { links: [base] };
    case 'arrived-base':
      return { note: '173.3632 USDC at your Base address.' };
    case 'arrived':
      return { note: 'It arrived.' };
    default:
      return {};
  }
}

const STEP_SECONDS = [2, 3, 9, 6, 4, 38, 12, 7, 5, 21, 17, 3, 8, 11, 4];

function runAt(
  plan: FlowPlan,
  mode: RunPhase,
  at: string | null,
  wait: boolean,
  now: number
): RunState {
  if (mode === 'review') return initialRun();
  const steps = stepsOf(plan);
  const target =
    mode === 'done'
      ? steps.length
      : Math.max(
          0,
          steps.findIndex((s) => s.id === at)
        );
  // Lay the finished steps out in the past, so durations and the clock read true.
  const total = steps
    .slice(0, target)
    .reduce((sum, _s, i) => sum + STEP_SECONDS[i % STEP_SECONDS.length] * 1000, 0);
  let clock = now - total - 14_000;
  let run = beginRun(clock);
  steps.slice(0, target).forEach((step, i) => {
    if (step.optional && i % 2 === 0) {
      run = skipStep(run, step.id);
      return;
    }
    run = startStep(run, plan, step.id, clock);
    clock += STEP_SECONDS[i % STEP_SECONDS.length] * 1000;
    run = completeStep(run, plan, step.id, clock, finishedPatch(step));
  });
  if (mode === 'done') return finishRun(run, plan, clock);
  const current = steps[target];
  if (!current) return finishRun(run, plan, clock);
  run = startStep(run, plan, current.id, clock, {
    waiting: wait && !!current.signature,
    note: current.id === 'source-confirm' ? 'Waiting for 1 more Bitcoin confirmation.' : undefined,
  });
  if (mode === 'failed') {
    return failRun(
      run,
      plan,
      'The passkey prompt was dismissed or timed out. Try again and confirm with your fingerprint, face or PIN.',
      now
    );
  }
  if (mode === 'stopped') {
    // A journey rewritten for a refund ends with its last step settled too.
    if (current.id === REFUND_STEP.arrived) run = completeStep(run, plan, current.id, clock + 4000);
    return stopRun(
      run,
      plan,
      'Chainflip could not complete the swap and sent your Bitcoin back to your wallet. Nothing was lost.',
      now
    );
  }
  if (mode === 'handed-off') {
    return handOffRun(
      run,
      'Your USDC is on its way back to your Stellar wallet. It arrives in about 20 minutes, and Normal finishes it on its own.',
      now
    );
  }
  return run;
}

const SCENARIOS: Scenario[] = [
  'deposit',
  'withdraw',
  'xlm-usdc',
  'btc-eth',
  'usdc-btc',
  'btc-usdc',
  'refund',
  'index',
];
const MODES: RunPhase[] = ['review', 'running', 'done', 'failed', 'stopped', 'handed-off'];

export default function FlowPreview() {
  const { t } = useTranslate();
  const params = useSearchParams();
  const scenario = (
    SCENARIOS.includes(params.get('s') as Scenario) ? params.get('s') : 'usdc-btc'
  ) as Scenario;
  const mode = (
    MODES.includes(params.get('mode') as RunPhase) ? params.get('mode') : 'running'
  ) as RunPhase;
  const play = params.get('play') === '1';
  const showBar = params.get('bar') !== '0';
  const data = useMemo(() => sample(t, scenario), [t, scenario]);
  const ids = useMemo(() => stepsOf(data.plan).map((s) => s.id), [data.plan]);
  const [at, setAt] = useState<string | null>(params.get('at') ?? ids[Math.floor(ids.length / 2)]);
  const [now, setNow] = useState(() => Date.now());

  // Play: one step every 1.6 seconds, signatures waiting on the way.
  useEffect(() => {
    if (!play) return undefined;
    const id = setInterval(() => {
      setAt((current) => {
        const index = ids.indexOf(current ?? '');
        return ids[(index + 1) % ids.length];
      });
      setNow(Date.now());
    }, 1600);
    return () => clearInterval(id);
  }, [play, ids]);

  // Stopped, on a swap through an exchange: the exchange sent it back, so the
  // journey is rewritten the way the engines rewrite it (refundedPlan), both
  // new steps settled.
  const bridge = stepsOf(data.plan).find((s) => s.id === 'bridge-send');
  const sentBack = mode === 'stopped' && !!bridge;
  const shownPlan = useMemo(
    () =>
      sentBack && bridge
        ? refundedPlan(data.plan, {
            t,
            fromStepId: 'bridge-send',
            tool: bridge.actor,
            coin: placesOf(data.plan)[0]?.asset ?? '',
          })
        : data.plan,
    [sentBack, bridge, data.plan, t]
  );
  const run = useMemo(
    () =>
      runAt(
        shownPlan,
        mode,
        sentBack ? REFUND_STEP.arrived : at,
        params.get('wait') === '1' || play,
        now
      ),
    [shownPlan, mode, sentBack, at, params, play, now]
  );

  return (
    <DashboardContent>
      {showBar && (
        <Box sx={{ mb: 3, pb: 2, borderBottom: `1px solid ${HAIRLINE_STRONG}` }}>
          <Typography sx={{ fontSize: 13, color: MUTED, mb: 1 }}>
            Preview (development only). Journeys and states:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, fontSize: 13 }}>
            {SCENARIOS.map((s) => (
              <Link
                key={s}
                href={`?s=${s}&mode=${mode}`}
                sx={{ color: s === scenario ? INK : MUTED }}
              >
                {s}
              </Link>
            ))}
            <Box component="span" sx={{ color: MUTED }}>
              |
            </Box>
            {MODES.map((m) => (
              <Link
                key={m}
                href={`?s=${scenario}&mode=${m}`}
                sx={{ color: m === mode ? INK : MUTED }}
              >
                {m}
              </Link>
            ))}
            <Link href={`?s=${scenario}&mode=running&play=1`} sx={{ color: MUTED }}>
              play
            </Link>
          </Box>
        </Box>
      )}
      <FlowView
        plan={shownPlan}
        run={run}
        summary={data.summary}
        titles={data.titles}
        lede={data.lede}
        confirm={{ label: t('Confirm'), onClick: () => {} }}
        back={{ label: t('Back to swap'), onClick: () => {} }}
        doneActions={[
          { label: t('Make another swap'), primary: true, onClick: () => {} },
          { label: t('See it in Activity'), href: '/app/activity' },
        ]}
        doneNote={data.doneNote}
        failActions={[{ label: t('Try again'), primary: true, onClick: () => {} }]}
        notice={
          scenario === 'usdc-btc' && mode === 'running' ? (
            <FlowNotice action={{ label: t('Turn on auto-finish'), onClick: () => {} }}>
              {t(
                'The next signature comes when the money reaches Base, which can take a while. Turn on auto-finish and this swap completes by itself.'
              )}
            </FlowNotice>
          ) : undefined
        }
        leave={{
          safe: true,
          message: t(
            'This finishes on its own. You can close this page and follow it in Activity.'
          ),
        }}
      />
    </DashboardContent>
  );
}
