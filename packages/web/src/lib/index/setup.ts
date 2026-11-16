import type { ChainId } from '@/lib/chains/registry';

import type { IndexDef, IndexCoin } from './basket';

// ---------------------------------------------------------------------------
// What a person's wallet needs before they can buy an Autoinvest plan, and in
// what order to add it (the mobile app reached the same rules, 2026-11-16). A
// page that only offered the coins dead-ended two ways: with no wallet at all
// nothing was offered and Review never turned on; with a wallet started on
// Bitcoin, Stellar was never offered. So:
//   1. Stellar first: the digital dollars leave from the Stellar wallet.
//   2. Each coin's own network, where it is delivered.
//   3. Ethereum always: Circle releases the dollars at the person's own Base
//      address, and Base uses the Ethereum key (one EVM address).
// With no wallet, every network is needed; adding the first creates the wallet.
// ---------------------------------------------------------------------------

/** The network each coin is delivered on. */
export const CHAIN_OF_COIN: Record<IndexCoin, ChainId> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
};

/**
 * The networks still to add, in the order to add them. `has(chain)` says
 * whether the wallet already holds that network's address.
 */
export function indexSetupNeeds(def: IndexDef, has: (chain: ChainId) => boolean): ChainId[] {
  const wanted: ChainId[] = [
    'stellar',
    ...def.coins.map((coin) => CHAIN_OF_COIN[coin]),
    'ethereum',
  ];
  return [...new Set(wanted)].filter((chain) => !has(chain));
}
