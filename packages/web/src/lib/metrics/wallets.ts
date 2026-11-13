// ---------------------------------------------------------------------------
// Every Stellar wallet Normal knows, counted once (2026-11-13).
//
// The dashboard used to count Stellar wallets from turnkey_wallets only: 53,
// while 822 distinct Stellar wallets exist. Most were created before passkey
// (Turnkey) wallets launched on 7 Jun 2026, or connected by users. They live
// in four tables:
//   passkey:  turnkey_wallets, turnkey_wallet_seeds
//   earlier:  linked_wallets (earlier Normal wallets and connected wallets;
//             the table cannot tell the two apart: walletName is a label
//             the user typed), users (the first, address-keyed user table)
// A wallet in both groups is a passkey wallet; its date is the first time
// any table saw it.
// ---------------------------------------------------------------------------

import type { WalletChainRow } from '@/lib/dune/activity-v2';

export type StellarWalletKind = 'passkey' | 'earlier';

export interface StellarWalletRecord {
  address: string;
  /** ISO time Normal first recorded the wallet. */
  firstSeen: string;
  kind: StellarWalletKind;
}

type Seen = { address: string | null | undefined; createdAt: Date | string };

const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/;

export function buildStellarWalletList(sources: {
  passkey: Seen[];
  earlier: Seen[];
}): StellarWalletRecord[] {
  const wallets = new Map<string, StellarWalletRecord>();
  const add = (row: Seen, kind: StellarWalletKind) => {
    const address = row.address?.trim();
    if (!address || !STELLAR_ADDRESS.test(address)) return;
    const time = new Date(row.createdAt);
    if (Number.isNaN(time.getTime())) return;
    const seen = time.toISOString();
    const known = wallets.get(address);
    if (!known) {
      wallets.set(address, { address, firstSeen: seen, kind });
      return;
    }
    if (seen < known.firstSeen) known.firstSeen = seen;
    if (kind === 'passkey') known.kind = 'passkey';
  };
  for (const row of sources.passkey) add(row, 'passkey');
  for (const row of sources.earlier) add(row, 'earlier');
  return Array.from(wallets.values());
}

/**
 * The wallet-chain rows with Stellar replaced by every Stellar wallet: one
 * row per wallet on the day it was first seen (the builder adds them up).
 * Bitcoin, Ethereum and Solana exist only as passkey wallets, so they stay.
 */
export function withAllStellarWallets(
  chains: WalletChainRow[],
  stellar: StellarWalletRecord[],
  network: string
): WalletChainRow[] {
  return [
    ...chains.filter((row) => row.chain !== 'stellar'),
    ...stellar.map((w) => ({
      date: `${w.firstSeen.slice(0, 10)}T00:00:00.000Z`,
      chain: 'stellar' as const,
      wallets_added: 1,
      network,
    })),
  ];
}

export function countKinds(stellar: StellarWalletRecord[]): Record<StellarWalletKind, number> {
  const counts: Record<StellarWalletKind, number> = { passkey: 0, earlier: 0 };
  for (const w of stellar) counts[w.kind] += 1;
  return counts;
}
