import { openMoneyGram } from './flow'; // adjust if flow.ts lives elsewhere

// Pull your connector factories + store
import {
  freighter,
  xbull,
  lobstr,
  hana,
  WalletConnect as WalletConnectConnector,
  usePersistStore,
} from '@normalfinance/state';

// ---------- Resolve active connector from store ----------
function resolveActiveConnector() {
  // read store *outside* React via getState()
  const state = usePersistStore.getState();

  // Depending on your store shape, you might have e.g.:
  // state.wallet.walletType ('freighter' | 'xbull' | 'lobstr' | 'wallet-connect' | 'hana')
  // If your field name differs, adjust below.
  const type = state?.wallet?.walletType as
    | 'freighter'
    | 'xbull'
    | 'lobstr'
    | 'wallet-connect'
    | 'hana'
    | undefined;

  if (!type) return undefined;

  switch (type) {
    case 'freighter':
      return freighter();
    case 'xbull':
      return xbull();
    case 'lobstr':
      return lobstr();
    case 'hana':
      return hana();
    case 'wallet-connect':
      // IMPORTANT: your AccountDrawer creates `new WalletConnect(true)`,
      // which *skips* creating the client. For signing, we need the real client.
      // So instantiate WITHOUT the ignore flag here:
      return new WalletConnectConnector(false);
    default:
      return undefined;
  }
}

// ---------- CONNECTED WALLET SIGNER (via your Connector API) ----------
export async function signXDRWithConnectedWallet(
  challengeXdr: string,
  networkPassphrase: string,
  userPublicKey: string
): Promise<string> {
  // 1) Prefer your connector abstraction
  const connector = resolveActiveConnector();
  if (connector?.signTransaction) {
    try {
      const signed = await connector.signTransaction(challengeXdr, {
        networkPassphrase,
        accountToSign: userPublicKey,
        // Some wallets accept `network: "TESTNET"|"PUBLIC"` too; harmless to include both:
        network: /test/i.test(networkPassphrase) ? 'TESTNET' : 'PUBLIC',
      });
      if (typeof signed === 'string') return signed;
      // some connectors return { xdr: '...' }
      if (signed?.xdr) return signed.xdr;
    } catch (e: any) {
      // If WalletConnect client wasn’t initialized due to ignoreClient=true, give a better error:
      if ((connector as any)?.id === 'wallet-connect') {
        throw new Error(
          'WalletConnect signer not initialized. Instantiate WalletConnect without ignoreClient=true or use a browser wallet (Freighter/xBull/Lobstr/Hana).'
        );
      }
      throw e;
    }
  }

  // 2) Fallback: window detection (covers odd cases)
  const w = window as any;
  const isTestnet = /test/i.test(networkPassphrase);
  const network = isTestnet ? 'TESTNET' : 'PUBLIC';

  // Freighter
  if (w.freighterApi?.signTransaction) {
    return await w.freighterApi.signTransaction(challengeXdr, {
      networkPassphrase,
      accountToSign: userPublicKey,
    });
  }
  // xBull variants
  if (w.xbull?.signTransaction) return await w.xbull.signTransaction(challengeXdr, { network });
  if (w.xbull?.signXDR) return await w.xbull.signXDR(challengeXdr, { network });
  if (w.xBull?.signTransaction) return await w.xBull.signTransaction(challengeXdr, { network });
  if (w.xBull?.signXDR) return await w.xBull.signXDR(challengeXdr, { network });
  // Albedo
  if (w.albedo?.tx) {
    const resp = await w.albedo.tx({
      xdr: challengeXdr,
      network: isTestnet ? 'testnet' : 'public',
    });
    if (resp?.signed_envelope_xdr) return resp.signed_envelope_xdr;
    if (resp?.xdr) return resp.xdr;
  }
  // Lobstr
  if (w.lobstr?.signXDR) {
    const resp = await w.lobstr.signXDR(challengeXdr, { network });
    if (typeof resp === 'string') return resp;
    if (resp?.xdr) return resp.xdr;
  }
  // Hana or generic Wallet Standard
  if (w.hana?.stellar?.request) {
    const resp = await w.hana.stellar.request({
      method: 'signXDR',
      params: { xdr: challengeXdr, networkPassphrase, publicKey: userPublicKey },
    });
    if (resp?.signedXDR) return resp.signedXDR;
    if (resp?.xdr) return resp.xdr;
  }
  if (w.stellar?.request) {
    const resp = await w.stellar.request({
      method: 'stellar_signXDR',
      params: { xdr: challengeXdr, networkPassphrase, publicKey: userPublicKey },
    });
    if (resp?.signedXDR) return resp.signedXDR;
    if (resp?.xdr) return resp.xdr;
  }

  throw new Error(
    "No compatible wallet signer found for the active connector. If you're using WalletConnect, ensure the client is initialized (no ignoreClient=true)."
  );
}

// ---------- MGI API wrappers ----------
export async function fetchMgiChallenge(userAccount: string) {
  const r = await fetch(`/api/mgi/sep10/challenge?account=${encodeURIComponent(userAccount)}`);
  if (!r.ok) throw new Error(`challenge failed: ${r.statusText}`);
  return r.json(); // { transaction, network_passphrase, ... }
}

export async function completeMgiAuth(userSignedXDR: string): Promise<string> {
  const r = await fetch(`/api/mgi/sep10/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userSignedXDR }),
  });

  const text = await r.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!r.ok) {
    // surface the exact server/MGI error
    throw new Error(typeof data === 'string' ? data : JSON.stringify(data));
  }

  const token = (typeof data === 'string' ? undefined : data?.token) ?? data?.access_token ?? data;
  if (!token) throw new Error('MGI auth returned no token');
  return token as string;
}

export async function getMgiAuthToken(userAccount: string) {
  const ch = await fetchMgiChallenge(userAccount);
  const userSignedXDR = await signXDRWithConnectedWallet(
    ch.transaction,
    ch.network_passphrase || 'Test SDF Network ; September 2015',
    userAccount
  );
  return await completeMgiAuth(userSignedXDR);
}

export async function startMgiDeposit(token: string, userAccount: string, amount: number) {
  const r = await fetch(`/api/mgi/sep24/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, account: userAccount, amount }),
  });

  const raw = await r.text();
  let data: any = null;
  try {
    data = JSON.parse(raw);
  } catch {}

  if (!r.ok || !data?.url) {
    // nice surfaced error
    const pretty = JSON.stringify(data ?? { raw }, null, 2);
    throw new Error(`Deposit start failed (HTTP ${r.status}): ${pretty}`);
  }

  return data as { url: string; id: string | null };
}

// and use it in your flow:
export async function runDepositFlow(
  userAccount: string,
  amount: string | number,
  onReady?: (tx: any) => void
) {
  const token = await getMgiAuthToken(userAccount);
  const { url } = await startMgiDeposit(token, userAccount, Number(amount));
  openMoneyGram(url, (tx) => onReady?.(tx));
}
