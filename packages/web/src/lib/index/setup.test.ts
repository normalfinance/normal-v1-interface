import type { ChainId } from '@/lib/chains/registry';

import { it, expect, describe } from '@jest/globals';

import { CRYPTO_INDEX } from './basket';
import { indexSetupNeeds } from './setup';

const holding =
  (...chains: ChainId[]) =>
  (chain: ChainId) =>
    chains.includes(chain);

describe('what a wallet needs before an Autoinvest purchase', () => {
  it('with no wallet at all: every network, Stellar first', () => {
    expect(indexSetupNeeds(CRYPTO_INDEX, holding())).toEqual([
      'stellar',
      'bitcoin',
      'ethereum',
      'solana',
    ]);
  });

  it('a wallet started on Bitcoin still gets Stellar offered', () => {
    expect(indexSetupNeeds(CRYPTO_INDEX, holding('bitcoin'))).toEqual([
      'stellar',
      'ethereum',
      'solana',
    ]);
  });

  it('a Stellar wallet needs only the coins', () => {
    expect(indexSetupNeeds(CRYPTO_INDEX, holding('stellar'))).toEqual([
      'bitcoin',
      'ethereum',
      'solana',
    ]);
  });

  it('nothing once every network is there', () => {
    expect(
      indexSetupNeeds(CRYPTO_INDEX, holding('stellar', 'bitcoin', 'ethereum', 'solana'))
    ).toEqual([]);
  });

  it('Ethereum even for a plan without Ether: the dollars pass through Base', () => {
    expect(
      indexSetupNeeds(
        { id: 'x', coins: ['BTC'], weighting: 'market-cap' },
        holding('stellar', 'bitcoin')
      )
    ).toEqual(['ethereum']);
  });
});
