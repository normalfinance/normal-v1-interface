'use client';

import type { IndexPlanLeg } from '@/lib/flow/plans';
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
//   once  1: with play, start at the first step (unless `at`), stop after
//         the last one and show the journey done
//   every ms between steps when playing (default 1600)
//   bar   0: hide this page's own scenario links (for screenshots)
//   usd   the amount in digital dollars (usdc-btc, index), e.g. 500
//   out   what the usdc-btc swap gives in BTC, e.g. 0.007886
//   legs  the index split, SYMBOL:usd:weight:amountOut joined by ';', e.g.
//         BTC:414.45:82.9:0.006658;ETH:71.30:14.3:0.040473;SOL:14.25:2.9:0.195366
//   autopilot 1: usdc-btc with auto-finish on (one signature, no Base prompt)
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

type LegCoin = IndexPlanLeg['symbol'];

/** Sample amounts from the address bar (usd, out, legs, autopilot), when given. */
interface Amounts {
  usd: number | null;
  out: string | null;
  legs: { symbol: LegCoin; usd: number; weight: string; amountOut: string }[] | null;
  autopilot: boolean;
}

const COIN_NAMES: Record<LegCoin, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  XLM: 'Stellar',
};

const isLegCoin = (s: string): s is LegCoin => s in COIN_NAMES;

const dollars = (n: number) => `$${n.toFixed(2)}`;

function amountsOf(params: { get: (name: string) => string | null }): Amounts {
  const usd = Number(params.get('usd'));
  const legs = (params.get('legs') ?? '')
    .split(';')
    .map((leg) => leg.split(':'))
    .filter((parts) => parts.length === 4 && isLegCoin(parts[0]) && Number(parts[1]) > 0)
    .map(([symbol, legUsd, weight, amountOut]) => ({
      symbol: symbol as LegCoin,
      usd: Number(legUsd),
      weight: `${weight}%`,
      amountOut,
    }));
  return {
    usd: usd > 0 ? usd : null,
    out: params.get('out'),
    legs: legs.length ? legs : null,
    autopilot: params.get('autopilot') === '1',
  };
}

function sample(
  t: (k: string, o?: Record<string, unknown>) => string,
  s: Scenario,
  amounts: Amounts
): Sample {
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
    case 'usdc-btc': {
      const usd = amounts.usd ?? 25;
      const out = amounts.out ?? '0.000284';
      return {
        plan: cctpOutboundPlan({
          t,
          to: 'BTC',
          amountUsdc: `${usd} USDC`,
          amountOut: `≈ ${out} BTC`,
          tool: 'Chainflip',
          stellarWallet: { address: G },
          baseWallet: { address: ETH },
          destWallet: { address: BTC },
          autopilot: amounts.autopilot,
        }),
        summary: rows([
          ['You pay', `${usd} USDC`, dollars(usd)],
          ['You receive', `≈ ${out} BTC`],
          ['Circle bridge', 'Free', 'Normal pays its network fees'],
        ]),
        lede: `${usd} USDC for about ${out} BTC, over Circle and Chainflip.`,
        titles: swapTitles(t),
        doneNote: 'Your BTC is in your Bitcoin wallet.',
      };
    }
    case 'index': {
      const usd = amounts.usd ?? 100;
      const legs: NonNullable<Amounts['legs']> = amounts.legs ?? [
        { symbol: 'BTC', usd: 60, weight: '60%', amountOut: '0.000681' },
        { symbol: 'ETH', usd: 25, weight: '25%', amountOut: '0.00982' },
        { symbol: 'SOL', usd: 15, weight: '15%', amountOut: '0.1' },
      ];
      return {
        plan: indexPurchasePlan({
          t,
          amountUsdc: `${usd} USDC`,
          legs: legs.map((leg) => ({
            symbol: leg.symbol,
            amountUsdc: `${leg.usd} USDC`,
            weight: leg.weight,
            amountOut: `≈ ${leg.amountOut} ${leg.symbol}`,
          })),
          stellarWallet: { address: G },
          baseWallet: { address: ETH },
        }),
        // As the real review lays it out (crypto-index/index.tsx): each coin
        // with its logo, "Bitcoin · 60%".
        summary: {
          rows: [
            {
              key: 'pay',
              label: 'You pay',
              value: dollars(usd),
              detail: 'Digital dollars from your Stellar wallet',
            },
            ...legs.map((leg) => ({
              key: leg.symbol,
              asset: leg.symbol,
              label: `${COIN_NAMES[leg.symbol]} · ${leg.weight}`,
              value: dollars(leg.usd),
              detail: `≈ ${leg.amountOut} ${leg.symbol}`,
            })),
            {
              key: 'fees',
              label: 'Exchange fees',
              value: 'About 0.75% of each coin',
              detail: 'Normal 0.5% and LI.FI 0.25%, taken in the exchange',
            },
            {
              key: 'network',
              label: 'Network fees',
              value: 'Paid by Normal',
              detail: 'Except the Stellar fee, paid in XLM by your wallet',
            },
            { key: 'signatures', label: 'Signatures', value: 'One' },
            {
              key: 'time',
              label: 'Time',
              value: 'Usually 10 to 60 minutes',
              detail: 'Bitcoin is the slowest to arrive',
            },
          ],
          note: 'Prices move while the coins are bought. Each exchange guarantees a minimum, or that coin’s share comes back to you as digital dollars.',
        },
        lede: `${dollars(usd)} split into Bitcoin, Ethereum and Solana.`,
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
    }
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
  const once = params.get('once') === '1';
  const every = Number(params.get('every')) || 1600;
  const showBar = params.get('bar') !== '0';
  const amounts = useMemo(() => amountsOf(params), [params]);
  const data = useMemo(() => sample(t, scenario, amounts), [t, scenario, amounts]);
  const ids = useMemo(() => stepsOf(data.plan).map((s) => s.id), [data.plan]);
  const [at, setAt] = useState<string | null>(
    params.get('at') ?? (once ? ids[0] : ids[Math.floor(ids.length / 2)])
  );
  const [finished, setFinished] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Play: one step every `every` ms (1.6 seconds), signatures waiting on the
  // way; with `once`, the journey ends done after its last step.
  useEffect(() => {
    if (!play || finished) return undefined;
    const id = setTimeout(() => {
      const index = ids.indexOf(at ?? '');
      if (once && index + 1 >= ids.length) setFinished(true);
      else setAt(ids[(index + 1) % ids.length]);
      setNow(Date.now());
    }, every);
    return () => clearTimeout(id);
  }, [play, once, every, finished, ids, at]);
  const shownMode: RunPhase = finished ? 'done' : mode;

  // Stopped, on a swap through an exchange: the exchange sent it back, so the
  // journey is rewritten the way the engines rewrite it (refundedPlan), both
  // new steps settled.
  const bridge = stepsOf(data.plan).find((s) => s.id === 'bridge-send');
  const sentBack = shownMode === 'stopped' && !!bridge;
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
        shownMode,
        sentBack ? REFUND_STEP.arrived : at,
        params.get('wait') === '1' || play,
        now
      ),
    [shownPlan, shownMode, sentBack, at, params, play, now]
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
        back={{
          label: scenario === 'index' ? t('Back to Top 3') : t('Back to swap'),
          onClick: () => {},
        }}
        doneActions={[
          {
            label: scenario === 'index' ? t('Make another purchase') : t('Make another swap'),
            primary: true,
            onClick: () => {},
          },
          { label: t('See it in Activity'), href: '/app/activity' },
        ]}
        doneNote={data.doneNote}
        failActions={[{ label: t('Try again'), primary: true, onClick: () => {} }]}
        notice={
          scenario === 'usdc-btc' && shownMode === 'running' && !amounts.autopilot ? (
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
