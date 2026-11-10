import { it, expect, describe } from '@jest/globals';

import { initialRun, moneyPosition } from './run';
import { indexBuyStepId, indexPurchasePlan } from './plans';

import type { FlowPlan } from './types';

// Built from its code point so no dash sits in the source.
const EM_DASH = new RegExp(String.fromCharCode(0x2014));

const t = (key: string, vars?: Record<string, unknown>) =>
  key.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars?.[k] ?? ''));

const plan = (): FlowPlan =>
  indexPurchasePlan({
    t,
    amountUsdc: '100.00 USDC',
    legs: [
      { symbol: 'BTC', amountUsdc: '60.00 USDC', weight: '60%' },
      { symbol: 'ETH', amountUsdc: '25.00 USDC', weight: '25%' },
      { symbol: 'SOL', amountUsdc: '15.00 USDC', weight: '15%' },
    ],
    stellarWallet: { address: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ' },
    baseWallet: { address: '0x1234567890abcdef1234567890abcdef12345678' },
  });

const stepIds = (p: FlowPlan) => p.items.flatMap((i) => (i.kind === 'step' ? [i.step.id] : []));
const placeIds = (p: FlowPlan) => p.items.flatMap((i) => (i.kind === 'place' ? [i.place.id] : []));

describe('indexPurchasePlan', () => {
  it('is one signature up to Base, then one buy step per coin', () => {
    expect(stepIds(plan())).toEqual([
      'record',
      'prepare',
      'approve',
      'burn-sign',
      'burn',
      'attest',
      'mint',
      'gas',
      'buy-btc',
      'buy-eth',
      'buy-sol',
      'deliver',
      'arrived',
      'balance',
    ]);
    expect(placeIds(plan())).toEqual(['stellar', 'circle', 'base', 'wallets']);
    expect(indexBuyStepId('BTC')).toBe('buy-btc');
  });

  it('asks the person to sign only on Stellar (the permission the first time, then once)', () => {
    const signed = plan().items.flatMap((i) =>
      i.kind === 'step' && i.step.signature ? [i.step.id] : []
    );
    expect(signed).toEqual(['approve', 'burn-sign']);
  });

  it('every step that moves money leads to a place', () => {
    const items = plan().items;
    items.forEach((item, index) => {
      if (item.kind === 'step' && item.step.money === 'moving') {
        expect(items.slice(index + 1).some((later) => later.kind === 'place')).toBe(true);
      }
    });
  });

  it('names every coin and network in plain words, with no em dash anywhere', () => {
    const text = JSON.stringify(plan());
    expect(text).not.toMatch(EM_DASH);
    expect(text).toContain('Your Bitcoin, Ethereum and Solana wallets');
    expect(text).toContain('60.00 USDC (60%)');
    expect(text).toContain('Usually');
  });

  it('starts with the money in the Stellar wallet', () => {
    const p = plan();
    expect(moneyPosition(p, initialRun())).toMatchObject({ placeId: 'stellar', moving: false });
  });
});
