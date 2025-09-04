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

    // xBull (APIs vary by version; try a few)
    if (!info.network && w.xbull?.getNetwork) {
      try {
        info.network = await w.xbull.getNetwork();
      } catch {}
    }
    if (!info.publicKey && w.xbull?.getPublicKey) {
      try {
        info.publicKey = await w.xbull.getPublicKey();
      } catch {}
    }
    if (!info.network && w.xBull?.getNetwork) {
      try {
        info.network = await w.xBull.getNetwork();
      } catch {}
    }
    if (!info.publicKey && w.xBull?.getPublicKey) {
      try {
        info.publicKey = await w.xBull.getPublicKey();
      } catch {}
    }

    // Lobstr
    if (!info.publicKey && w.lobstr?.getPublicKey) {
      try {
        info.publicKey = await w.lobstr.getPublicKey();
      } catch {}
    }

    // Hana / Wallet Standard
    if (w.hana?.stellar?.request) {
      // Some wallets expose a generic request interface
      if (!info.publicKey) {
        try {
          const r = await w.hana.stellar.request({ method: 'getPublicKey' });
          if (r?.publicKey) info.publicKey = r.publicKey;
        } catch {}
      }
      if (!info.network) {
        try {
          const r = await w.hana.stellar.request({ method: 'getNetwork' });
          if (r?.network) info.network = r.network; // 'PUBLIC' | 'TESTNET'
        } catch {}
      }
    }

    // Generic Wallet Standard (if present)
    if (w.stellar?.request) {
      if (!info.publicKey) {
        try {
          const r = await w.stellar.request({ method: 'stellar_getPublicKey' });
          if (r?.publicKey) info.publicKey = r.publicKey;
        } catch {}
      }
      if (!info.network) {
        try {
          const r = await w.stellar.request({ method: 'stellar_getNetwork' });
          if (r?.network) info.network = r.network;
        } catch {}
      }
    }
  } catch {
    // ignore
  }

  return info;
}

export function assertTestnetAndAccountMatch(walletEnv: WalletEnvInfo, expectedPublicKey: string) {
  const net = (walletEnv.network || '').toUpperCase();
  if (net && net !== 'TESTNET') {
    throw new Error(
      `Your wallet is on ${walletEnv.network}. Please switch it to TESTNET in the wallet UI and try again.`
    );
  }
  if (walletEnv.publicKey && walletEnv.publicKey !== expectedPublicKey) {
    throw new Error(
      `Selected account in wallet (${walletEnv.publicKey}) does not match the connected address (${expectedPublicKey}). Switch accounts in the wallet and retry.`
    );
  }
}
