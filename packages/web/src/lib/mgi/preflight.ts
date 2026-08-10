'use client';

import { useNetworkStore } from '@normalfinance/state';

export type WalletEnvInfo = {
  network?: 'PUBLIC' | 'TESTNET' | string;
  publicKey?: string;
};

export async function detectWalletEnv(): Promise<WalletEnvInfo> {
  const w = window as any;
  const info: WalletEnvInfo = {};

  try {
    // Freighter
    if (w.freighterApi?.getNetwork) {
      info.network = await w.freighterApi.getNetwork(); // 'PUBLIC' | 'TESTNET'
    }
    if (w.freighterApi?.getPublicKey) {
      info.publicKey = await w.freighterApi.getPublicKey();
    }

    // (xBull / Hana probes removed 2026-08-07 — finding #43: those wallets
    // are not connectable in this app, so their diagnostics were dead weight.)

    // Generic Wallet Standard (if present)
    if (w.stellar?.request) {
      if (!info.publicKey) {
        try {
          const r = await w.stellar.request({ method: 'stellar_getPublicKey' });
          if (r?.publicKey) info.publicKey = r.publicKey;
        } catch {
          // ignore
        }
      }
      if (!info.network) {
        try {
          const r = await w.stellar.request({ method: 'stellar_getNetwork' });
          if (r?.network) info.network = r.network;
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore outer failures
  }

  return info;
}

/**
 * Asserts the external wallet is on the SAME network as the app (mainnet→PUBLIC,
 * testnet→TESTNET) and the selected account matches. Normal (custodial) wallets
 * expose no injected provider, so `walletEnv.network` is empty and this is a
 * no-op for them — it only constrains external wallets (Freighter/Lobstr/…).
 */
export function assertTestnetAndAccountMatch(walletEnv: WalletEnvInfo, expectedPublicKey: string) {
  let activeNetwork = 'mainnet';
  try {
    activeNetwork = useNetworkStore.getState().network;
  } catch {
    /* default mainnet */
  }
  const expectedNet = activeNetwork === 'testnet' ? 'TESTNET' : 'PUBLIC';

  const net = (walletEnv.network || '').toUpperCase();
  if (net && net !== expectedNet) {
    throw new Error(
      `Your wallet is on ${walletEnv.network}. Please switch it to ${
        expectedNet === 'PUBLIC' ? 'MAINNET (PUBLIC)' : 'TESTNET'
      } in the wallet UI and try again.`
    );
  }
  if (walletEnv.publicKey && walletEnv.publicKey !== expectedPublicKey) {
    throw new Error(
      `Selected account in wallet (${walletEnv.publicKey}) does not match the connected address (${expectedPublicKey}). Switch accounts in the wallet and retry.`
    );
  }
}
