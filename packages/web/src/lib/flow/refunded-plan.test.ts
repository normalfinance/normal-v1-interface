import { it, expect, describe } from '@jest/globals';

import { REFUND_STEP, refundedPlan, cctpInboundPlan, crossChainSwapPlan } from './plans';
import {
  stopRun,
  stepsOf,
  placesOf,
  beginRun,
  startStep,
  completeStep,
  moneyPosition,
} from './run';

// The words go through the app's translator; here, a plain {{name}} filler.
const t = (key: string, opts?: Record<string, unknown>) =>
  key.replace(/{{(\w+)}}/g, (_, name) => String(opts?.[name] ?? ''));

const swap = crossChainSwapPlan({
  t,
  from: 'BTC',
  to: 'ETH',
  amountIn: '0.005 BTC',
  amountOut: '≈ 0.17 ETH',
  tool: 'Chainflip',
});
const ids = (p: typeof swap) => stepsOf(p).map((s) => s.id);

describe('refundedPlan: a swap the exchange sends back (Niko 2026-11-09)', () => {
  const back = refundedPlan(swap, { t, fromStepId: 'bridge-send', tool: 'Chainflip', coin: 'BTC' });

  it('keeps every step before the exchange delivery, with the same ids', () => {
    const before = ids(swap).slice(0, ids(swap).indexOf('bridge-send'));
    expect(ids(back).slice(0, before.length)).toEqual(before);
  });

  it('replaces the delivery and the rest with the way back', () => {
    expect(ids(back)).not.toContain('bridge-send');
    expect(ids(back)).not.toContain('arrived');
    expect(ids(back).slice(-2)).toEqual([REFUND_STEP.send, REFUND_STEP.arrived]);
    const send = stepsOf(back).find((s) => s.id === REFUND_STEP.send)!;
    expect(send.title).toBe('Chainflip sends it back');
    expect(send.detail).toContain('returns your Bitcoin to the wallet it came from');
  });

  it('ends in the wallet the money came from, marked as the way back', () => {
    const places = placesOf(back);
    const home = places[places.length - 1];
    expect(home.back).toBe(true);
    expect(home.label).toBe(places[0].label);
    expect(home.id).toBe(`${places[0].id}-back`);
    // The other wallet is gone from the story: nothing goes there now.
    expect(places.some((p) => p.asset === 'ETH')).toBe(false);
    // Named by the wallet's network from the registry, never by its label.
    expect(stepsOf(back).find((s) => s.id === REFUND_STEP.arrived)!.actor).toBe('Bitcoin network');
  });

  it('changes nothing when called again, or without the step it cuts at', () => {
    expect(refundedPlan(back, { t, fromStepId: 'bridge-send', tool: 'X', coin: 'BTC' })).toBe(back);
    expect(refundedPlan(swap, { t, fromStepId: 'nope', tool: 'X', coin: 'BTC' })).toBe(swap);
  });

  it('a calm ending shows the money back in that wallet, after the steps', () => {
    let run = beginRun(0);
    for (const id of ids(back)) run = completeStep(run, back, id, 1);
    run = stopRun(run, back, 'sent back', 2);
    const home = placesOf(back)[placesOf(back).length - 1];
    expect(moneyPosition(back, run)).toEqual({ placeId: home.id, moving: false, toPlaceId: null });
    // Every step settled: nothing is left looking like it might still happen.
    expect(Object.values(run.steps).every((s) => s.status === 'done')).toBe(true);
  });

  it('while it is on its way back the money is moving home', () => {
    let run = beginRun(0);
    run = startStep(run, back, REFUND_STEP.send, 1);
    const home = placesOf(back)[placesOf(back).length - 1];
    expect(moneyPosition(back, run)).toMatchObject({ moving: true, toPlaceId: home.id });
  });

  it('works on the Circle swap in, whose first leg is an exchange too', () => {
    const inbound = cctpInboundPlan({
      t,
      from: 'SOL',
      amountIn: '1 SOL',
      usdcOut: '≈ 97 USDC',
      tool: 'Mayan',
      autopilot: true,
    });
    const b = refundedPlan(inbound, { t, fromStepId: 'bridge-send', tool: 'Mayan', coin: 'SOL' });
    expect(ids(b).slice(-2)).toEqual([REFUND_STEP.send, REFUND_STEP.arrived]);
    expect(ids(b)).not.toContain('arrived-base');
    expect(placesOf(b)[placesOf(b).length - 1].back).toBe(true);
  });
});
