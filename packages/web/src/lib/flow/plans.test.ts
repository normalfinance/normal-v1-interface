import { it, expect, describe } from '@jest/globals';

import { stepsOf, placesOf } from './run';
import {
  depositPlan,
  withdrawPlan,
  shortAddress,
  cctpRefundPlan,
  cctpInboundPlan,
  stellarSwapPlan,
  cctpOutboundPlan,
  crossChainSwapPlan,
} from './plans';

import type { FlowPlan } from './types';

// The words go through the app's translator; here, a plain {{name}} filler.
const t = (key: string, opts?: Record<string, unknown>) =>
  key.replace(/{{(\w+)}}/g, (_, name) => String(opts?.[name] ?? ''));

const ids = (plan: FlowPlan) => stepsOf(plan).map((s) => s.id);
const placeIds = (plan: FlowPlan) => placesOf(plan).map((p) => p.id);

const ALL: [string, FlowPlan][] = [
  ['deposit', depositPlan({ t, amount: '100 USDC', fee: '0.5 USDC', net: '99.5 USDC' })],
  ['withdraw', withdrawPlan({ t, amount: '100 USDC', commission: '0.4 USDC', net: '99.6 USDC' })],
  [
    'withdraw, no commission',
    withdrawPlan({ t, amount: '10 USDC', commission: null, net: '10 USDC' }),
  ],
  [
    'stellar swap',
    stellarSwapPlan({
      t,
      from: 'XLM',
      to: 'USDC',
      amountIn: '10 XLM',
      amountOut: '≈ 3 USDC',
      minOut: '2.97 USDC',
      fee: '0.05 XLM',
      embedded: false,
    }),
  ],
  [
    'cross-chain swap',
    crossChainSwapPlan({
      t,
      from: 'BTC',
      to: 'ETH',
      amountIn: '0.005 BTC',
      amountOut: '≈ 0.17 ETH',
      tool: 'Chainflip',
    }),
  ],
  [
    'circle, out',
    cctpOutboundPlan({
      t,
      to: 'SOL',
      amountUsdc: '25 USDC',
      amountOut: '≈ 0.16 SOL',
      tool: 'Mayan',
      autopilot: false,
      funding: { walletName: 'Lobstr' },
    }),
  ],
  [
    'circle, in',
    cctpInboundPlan({
      t,
      from: 'ETH',
      amountIn: '0.01 ETH',
      usdcOut: '≈ 25 USDC',
      tool: 'Relay',
      autopilot: true,
    }),
  ],
  ['bring back', cctpRefundPlan({ t, amountUsdc: '25 USDC' })],
];

describe('every plan', () => {
  it.each(ALL)('%s: starts at a place, every step id is unique', (_name, plan) => {
    expect(plan.items[0].kind).toBe('place');
    expect(new Set(ids(plan)).size).toBe(ids(plan).length);
  });

  it.each(ALL)('%s: a step that moves the money always leads to a place', (_name, plan) => {
    plan.items.forEach((item, i) => {
      if (item.kind === 'step' && item.step.money === 'moving') {
        expect(plan.items[i + 1]?.kind).toBe('place');
      }
    });
  });

  it.each(ALL)('%s: no em dashes in anything the page shows', (_name, plan) => {
    const words = plan.items.flatMap((item) =>
      item.kind === 'place'
        ? [item.place.label, item.place.detail ?? '']
        : [item.step.title, item.step.detail, item.step.actor, item.step.eta ?? '']
    );
    words.forEach((w) => expect(w).not.toContain('—'));
  });
});

describe('the steps each engine reports against', () => {
  it('deposit: check, sign twice, send, then the vault has it', () => {
    const plan = ALL[0][1];
    expect(ids(plan)).toEqual([
      'check',
      'prepare',
      'sign-deposit',
      'sign-fee',
      'submit',
      'confirmed',
      'fee',
      'balance',
    ]);
    expect(placeIds(plan)).toEqual(['wallet', 'vault']);
  });

  it('withdraw: the commission steps come only with a commission', () => {
    expect(ids(ALL[1][1])).toContain('sign-fee');
    expect(ids(ALL[1][1])).toContain('fee');
    expect(ids(ALL[2][1])).not.toContain('sign-fee');
    expect(ids(ALL[2][1])).not.toContain('fee');
    expect(placeIds(ALL[1][1])).toEqual(['vault', 'wallet']);
  });

  it('stellar swap: one signature when the fee rides inside, two when it does not', () => {
    const base = {
      t,
      from: 'USDC',
      to: 'XLM',
      amountIn: '5 USDC',
      amountOut: '≈ 16 XLM',
      minOut: '15.8 XLM',
      fee: '0.025 USDC',
    };
    const one = stellarSwapPlan({ ...base, embedded: true });
    const two = stellarSwapPlan({ ...base, embedded: false });
    expect(ids(one)).toEqual(['prepare', 'sign-swap', 'submit', 'confirmed', 'balance']);
    expect(ids(two)).toEqual([
      'prepare',
      'sign-swap',
      'sign-fee',
      'submit',
      'confirmed',
      'fee',
      'balance',
    ]);
  });

  it('cross-chain swap: wallet, exchange, other wallet', () => {
    const plan = ALL[4][1];
    expect(ids(plan)).toEqual([
      'price',
      'sign',
      'send',
      'source-confirm',
      'bridge-send',
      'arrived',
      'balance',
    ]);
    expect(placeIds(plan)).toEqual(['from', 'exchange', 'to']);
  });

  it('circle, out: the funding move first, then Stellar, Circle, Base, the exchange, the coin', () => {
    const plan = ALL[5][1];
    expect(placeIds(plan)).toEqual(['external', 'stellar', 'circle', 'base', 'exchange', 'dest']);
    expect(ids(plan)).toEqual([
      'funding',
      'record',
      'prepare',
      'approve',
      'burn-sign',
      'burn',
      'attest',
      'mint',
      'gas',
      'pivot-approve',
      'pivot-sign',
      'pivot-send',
      'bridge-receive',
      'bridge-send',
      'arrived',
      'balance',
    ]);
  });

  it('circle, in: the coin, the exchange, Base, Circle, Stellar', () => {
    const plan = ALL[6][1];
    expect(placeIds(plan)).toEqual(['src', 'exchange', 'base', 'circle', 'stellar']);
    expect(ids(plan)).toEqual([
      'record',
      'sign',
      'send',
      'source-confirm',
      'bridge-send',
      'arrived-base',
      'gas',
      'burn-approve',
      'burn-sign',
      'burn',
      'attest',
      'mint',
      'arrived',
      'balance',
    ]);
  });

  it('auto-finish: the Base steps ask for no signature and say who signs', () => {
    const steps = stepsOf(ALL[6][1]);
    const burnSign = steps.find((s) => s.id === 'burn-sign')!;
    expect(burnSign.signature).toBe(false);
    expect(burnSign.actor).toBe('Auto-finish');
    const manual = stepsOf(ALL[5][1]).find((s) => s.id === 'pivot-sign')!;
    expect(manual.signature).toBe(true);
    expect(manual.actor).toBe('You');
  });

  it('first-time permissions are marked optional, so a skipped one reads "not needed"', () => {
    const optional = stepsOf(ALL[5][1]).filter((s) => s.optional);
    expect(optional.map((s) => s.id)).toEqual(['approve', 'pivot-approve']);
  });

  it('bring back: Base, Circle, Stellar', () => {
    const plan = ALL[7][1];
    expect(placeIds(plan)).toEqual(['base', 'circle', 'stellar']);
    expect(ids(plan)).toEqual([
      'refund-gas',
      'refund-sign',
      'refund-burn',
      'refund-attest',
      'refund-mint',
      'refund-arrived',
    ]);
  });
});

describe('places', () => {
  it('own wallets are marked yours, with a short address and their network', () => {
    const plan = cctpInboundPlan({
      t,
      from: 'BTC',
      amountIn: '0.002 BTC',
      usdcOut: '≈ 173 USDC',
      tool: 'Chainflip',
      srcWallet: { address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', href: 'https://x' },
      autopilot: false,
    });
    const [src] = placesOf(plan);
    expect(src).toMatchObject({
      own: true,
      address: 'bc1q…0wlh',
      href: 'https://x',
      network: 'bitcoin',
      asset: 'BTC',
    });
    const circle = placesOf(plan).find((p) => p.id === 'circle')!;
    expect(circle.own).toBeUndefined();
    expect(circle.glyph).toBe('bridge');
  });

  it('a short address keeps short ones whole', () => {
    expect(shortAddress('GB2YWVAJQ6IY3PSV6ZL44KZ2GVQDWYIPJVDP4MTFPB7FQWIE3WJ7CTJF')).toBe(
      'GB2Y…CTJF'
    );
    expect(shortAddress('abc')).toBe('abc');
    expect(shortAddress(null)).toBeUndefined();
  });
});
